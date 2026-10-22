import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import nodemailer from 'nodemailer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === 'production';
const secret = process.env.SESSION_SECRET || '';
const appBaseUrl = String(process.env.APP_BASE_URL || `http://localhost:${port}`).replace(/\/$/, '');
const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.EMAIL_FROM);
const mailer = smtpConfigured ? nodemailer.createTransport({
  host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT || 587) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  requireTLS: Number(process.env.SMTP_PORT || 587) !== 465,
  connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000
}) : null;
if (isProd && (!appBaseUrl.startsWith('https://') || !smtpConfigured)) {
  throw new Error('Production requires an HTTPS APP_BASE_URL and configured SMTP email delivery.');
}
if (isProd && secret.length < 32) {
  throw new Error('SESSION_SECRET must be at least 32 characters in production.');
}
if (!isProd && secret.length < 32) {
  console.warn('WARNING: Set a long random SESSION_SECRET in .env before deployment.');
}
const missingSmtpVars = ['SMTP_HOST','SMTP_USER','SMTP_PASSWORD','EMAIL_FROM'].filter((key) => !String(process.env[key] || '').trim());
if (!smtpConfigured) {
  console.warn(`Email delivery is NOT configured. Missing environment variables: ${missingSmtpVars.join(', ')}. Registration will not create accounts until SMTP is configured.`);
} else {
  console.log(`SMTP settings loaded for sender: ${process.env.EMAIL_FROM}. Credentials are not displayed.`);
  mailer.verify().then(() => console.log('SMTP connection verified.')).catch((err) => {
    console.error('SMTP connection check failed:', err?.code || err?.message || 'unknown SMTP error');
  });
}
const dataDir = path.resolve(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'smartscholar.sqlite');
fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  email_verified_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS saved_calculations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS email_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK(purpose IN ('verify','reset')),
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  sid_hash TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  csrf_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
`);
db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(Date.now());
db.prepare('DELETE FROM email_tokens WHERE expires_at<=?').run(Date.now());
const universities = [
  { id:'iaa', name:'Institute of Accountancy Arusha', short:'IAA', status:'Priority launch', links:[
    {label:'Official website',url:'https://www.iaa.ac.tz/'},
    {label:'Student resources',url:'https://www.iaa.ac.tz/student'}
  ]},
  { id:'udsm', name:'University of Dar es Salaam', short:'UDSM', status:'Data verification needed', links:[
    {label:'Official website',url:'https://www.udsm.ac.tz/'}
  ]},
  { id:'udom', name:'University of Dodoma', short:'UDOM', status:'Data verification needed', links:[
    {label:'Official website',url:'https://www.udom.ac.tz/'}
  ]},
  { id:'mzumbe', name:'Mzumbe University', short:'Mzumbe', status:'Data verification needed', links:[
    {label:'Official website',url:'https://www.mzumbe.ac.tz/'}
  ]},
  { id:'must', name:'Mbeya University of Science and Technology', short:'MUST', status:'Data verification needed', links:[
    {label:'Official website',url:'https://www.must.ac.tz/'}
  ]}
];
app.disable('x-powered-by');
app.set('trust proxy', isProd ? 1 : false);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: isProd ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(express.json({ limit:'30kb' }));
app.use(express.urlencoded({ extended:false, limit:'10kb' }));
app.use(cookieParser());
app.use('/api/', rateLimit({ windowMs: 15*60*1000, limit: 120, standardHeaders:'draft-8', legacyHeaders:false }));
const authLimiter = rateLimit({ windowMs: 15*60*1000, limit: 8, standardHeaders:'draft-8', legacyHeaders:false, message:{error:'Too many attempts. Please wait 15 minutes and try again.'} });
app.use(['/api/register','/api/login','/api/recovery/request','/api/recovery/reset'], authLimiter);
app.use(express.static(path.join(__dirname, 'public'), { etag:true, maxAge:isProd?'1h':0 }));

const nowIso = () => new Date().toISOString();
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
function newToken() { return crypto.randomBytes(32).toString('base64url'); }
function sessionFromReq(req) {
  const raw = req.cookies?.ss_session;
  if (!raw) return null;
  const row = db.prepare('SELECT s.*,u.email,u.email_verified_at FROM sessions s LEFT JOIN users u ON u.id=s.user_id WHERE s.sid_hash=? AND s.expires_at>?').get(sha(raw), Date.now());
  return row || null;
}
function setSession(res, userId=null) {
  const raw = newToken();
  const csrf = newToken();
  db.prepare('INSERT INTO sessions(sid_hash,user_id,csrf_token,expires_at) VALUES(?,?,?,?)')
    .run(sha(raw), userId, csrf, Date.now()+7*24*60*60*1000);
  res.cookie('ss_session', raw, { httpOnly:true, secure:isProd, sameSite:'strict', path:'/', maxAge:7*24*60*60*1000 });
  return csrf;
}
function clearSession(req,res) {
  const raw=req.cookies?.ss_session;
  if(raw) db.prepare('DELETE FROM sessions WHERE sid_hash=?').run(sha(raw));
  res.clearCookie('ss_session',{httpOnly:true,secure:isProd,sameSite:'strict',path:'/'});
}
function csrfGuard(req,res,next) {
  if (['GET','HEAD','OPTIONS'].includes(req.method)) return next();
  const s=sessionFromReq(req);
  const header=req.get('x-csrf-token');
  if (!s || !header || header !== s.csrf_token) return res.status(403).json({error:'Session or CSRF token invalid. Refresh and try again.'});
  next();
}
app.use('/api', csrfGuard);
function requireUser(req,res,next) {
  const s=sessionFromReq(req);
  if(!s?.user_id) return res.status(401).json({error:'Sign in required.'});
  req.auth=s; next();
}
const emailSchema=z.string().trim().email().max(254);
const passwordSchema=z.string().min(12).max(128);
app.get('/api/bootstrap',(req,res)=>{
  let s=sessionFromReq(req);
  let csrf;
  if(!s) {
    // Guest session is an ephemeral server session only; calculations remain in page memory.
    csrf=setSession(res,null); s=sessionFromReq({cookies:{ss_session:req.cookies?.ss_session}}); 
    // cookie is not visible in the incoming request until next request; read token from response cookie source below
    const cookieLine=res.getHeader('Set-Cookie');
    const raw=Array.isArray(cookieLine)?cookieLine[0]:cookieLine;
    const match=String(raw||'').match(/ss_session=([^;]+)/);
    const token=match?.[1];
    const row=token?db.prepare('SELECT csrf_token FROM sessions WHERE sid_hash=?').get(sha(decodeURIComponent(token))):null;
    csrf=row?.csrf_token || csrf;
  } else csrf=s.csrf_token;
  res.json({csrf, user:s?.user_id?{email:s.email,verified:!!s.email_verified_at}:null,universities});
});
app.post('/api/register', async (req,res)=>{
  const parsed=z.object({email:emailSchema,password:passwordSchema}).safeParse(req.body);
  if(!parsed.success) return res.status(400).json({error:'Enter a valid email and a password of at least 12 characters.'});
  const email=parsed.data.email.toLowerCase();
  if (!mailer) return res.status(503).json({error:'Email verification is not configured yet. Please try again later.'});
  if(db.prepare('SELECT id FROM users WHERE email=?').get(email)) return res.json({ok:true,message:'If the address can be registered, account instructions will be sent. Try signing in if you already have an account.'});
  const id=crypto.randomUUID();
  const hash=await bcrypt.hash(parsed.data.password,12);
  db.prepare('INSERT INTO users(id,email,password_hash,created_at) VALUES(?,?,?,?)').run(id,email,hash,nowIso());
  const rawToken=newToken();
  db.prepare('INSERT INTO email_tokens(token_hash,user_id,purpose,expires_at,created_at) VALUES(?,?,?,?,?)').run(sha(rawToken),id,'verify',Date.now()+30*60*1000,nowIso());
  const verifyUrl = `${appBaseUrl}/api/verify?token=${encodeURIComponent(rawToken)}`;
  if (mailer) {
    try { await mailer.sendMail({ from: process.env.EMAIL_FROM, to: email, subject: 'Verify your SmartScholar email', text: `Welcome to SmartScholar. Verify your email within 30 minutes: ${verifyUrl}`, html: `<p>Welcome to SmartScholar.</p><p><a href=\"${verifyUrl}\">Verify your email address</a>. This link expires in 30 minutes.</p>` }); }
    catch (err) { console.error('Verification email delivery failed:', err?.code || err?.message || 'unknown SMTP error'); db.prepare('DELETE FROM email_tokens WHERE user_id=? AND purpose=?').run(id,'verify'); db.prepare('DELETE FROM users WHERE id=?').run(id); clearSession(req,res); return res.status(503).json({error:'Email delivery is temporarily unavailable. Please try registering again later.'}); }
  }
  res.json({ok:true,message:'Account created. Check your email for the verification link, then sign in.'});
});
app.post('/api/login', async (req,res)=>{
  const parsed=z.object({email:emailSchema,password:z.string().min(1).max(128)}).safeParse(req.body);
  if(!parsed.success) return res.status(400).json({error:'Enter your email and password.'});
  const user=db.prepare('SELECT * FROM users WHERE email=?').get(parsed.data.email.toLowerCase());
  if(!user || !(await bcrypt.compare(parsed.data.password,user.password_hash))) return res.status(401).json({error:'Invalid email or password.'});
  if (!user.email_verified_at) return res.status(403).json({error:'Please verify your email using the link we sent before signing in.'});
  clearSession(req,res);
  const csrf=setSession(res,user.id);
  res.json({ok:true,csrf,user:{email:user.email,verified:!!user.email_verified_at}});
});
app.post('/api/logout',(req,res)=>{clearSession(req,res);res.json({ok:true});});
app.get('/api/me',(req,res)=>{const s=sessionFromReq(req);res.json({user:s?.user_id?{email:s.email,verified:!!s.email_verified_at}:null});});
app.get('/api/saved',requireUser,(req,res)=>{
  const rows=db.prepare('SELECT id,kind,title,payload_json,created_at FROM saved_calculations WHERE user_id=? ORDER BY created_at DESC LIMIT 100').all(req.auth.user_id);
  res.json(rows.map(r=>({...r,payload:JSON.parse(r.payload_json)})));
});
app.post('/api/saved',requireUser,(req,res)=>{
  const parsed=z.object({kind:z.enum(['gpa','fees','planner']),title:z.string().trim().min(1).max(100),payload:z.record(z.any())}).safeParse(req.body);
  if(!parsed.success) return res.status(400).json({error:'Invalid calculation.'});
  const payload=JSON.stringify(parsed.data.payload);
  if(payload.length>12000) return res.status(413).json({error:'Calculation is too large.'});
  const id=crypto.randomUUID();
  db.prepare('INSERT INTO saved_calculations(id,user_id,kind,title,payload_json,created_at) VALUES(?,?,?,?,?,?)').run(id,req.auth.user_id,parsed.data.kind,parsed.data.title,payload,nowIso());
  res.json({ok:true,id});
});
app.delete('/api/saved/:id',requireUser,(req,res)=>{
  const result=db.prepare('DELETE FROM saved_calculations WHERE id=? AND user_id=?').run(req.params.id,req.auth.user_id);
  res.json({ok:result.changes>0});
});
app.get('/api/verify',(req,res)=>{
  const token=String(req.query.token||'');
  const row=db.prepare("SELECT * FROM email_tokens WHERE token_hash=? AND purpose='verify' AND expires_at>?").get(sha(token),Date.now());
  if(!row) return res.status(400).send('Verification link is invalid or expired. Please register again or contact support.');
  db.prepare('UPDATE users SET email_verified_at=? WHERE id=?').run(nowIso(),row.user_id);
  db.prepare('DELETE FROM email_tokens WHERE user_id=? AND purpose=?').run(row.user_id,'verify');
  res.redirect('/?verified=1');
});
app.post('/api/recovery/request',async (req,res)=>{
  const parsed=z.object({email:emailSchema}).safeParse(req.body);
  if(!parsed.success) return res.status(400).json({error:'Enter a valid email.'});
  const user=db.prepare('SELECT id,email FROM users WHERE email=?').get(parsed.data.email.toLowerCase());
  if(user) {
    db.prepare("DELETE FROM email_tokens WHERE user_id=? AND purpose='reset'").run(user.id);
    const token=newToken();
    db.prepare('INSERT INTO email_tokens(token_hash,user_id,purpose,expires_at,created_at) VALUES(?,?,?,?,?)').run(sha(token),user.id,'reset',Date.now()+15*60*1000,nowIso());
    const resetUrl = `${appBaseUrl}/reset.html?token=${encodeURIComponent(token)}`;
    if (mailer) {
      try { await mailer.sendMail({ from: process.env.EMAIL_FROM, to: user.email, subject: 'Reset your SmartScholar password', text: `Use this one-time link to reset your SmartScholar password within 15 minutes: ${resetUrl}\nIf you did not request this, ignore this email.`, html: `<p>A password reset was requested for your SmartScholar account.</p><p><a href=\"${resetUrl}\">Reset your password</a>. This link expires in 15 minutes and can be used once.</p><p>If you did not request this, ignore this email.</p>` }); }
      catch (err) { console.error('Password-reset email delivery failed:', err?.code || err?.message || 'unknown SMTP error'); db.prepare("DELETE FROM email_tokens WHERE user_id=? AND purpose='reset'").run(user.id); return res.status(503).json({ok:true,message:'If the account exists, recovery instructions will be sent.'}); }
    } else { console.warn('Password-reset email requested, but SMTP is not configured. No reset link was logged or sent.'); }
  }
  res.json({ok:true,message:'If the account exists, recovery instructions will be sent.'});
});
app.post('/api/recovery/reset',async (req,res)=>{
  const parsed=z.object({token:z.string().min(20).max(200),password:passwordSchema}).safeParse(req.body);
  if(!parsed.success) return res.status(400).json({error:'Use a valid recovery token and a password of at least 12 characters.'});
  const row=db.prepare("SELECT * FROM email_tokens WHERE token_hash=? AND purpose='reset' AND expires_at>?").get(sha(parsed.data.token),Date.now());
  if(!row) return res.status(400).json({error:'Recovery link is invalid or expired.'});
  const hash=await bcrypt.hash(parsed.data.password,12);
  const tx=db.transaction(()=>{
    const consumed=db.prepare("DELETE FROM email_tokens WHERE token_hash=? AND purpose='reset' AND expires_at>?").run(sha(parsed.data.token),Date.now());
    if (!consumed.changes) return false;
    db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash,row.user_id);
    db.prepare('DELETE FROM email_tokens WHERE user_id=?').run(row.user_id);
    db.prepare('DELETE FROM sessions WHERE user_id=?').run(row.user_id);
    return true;
  });
  if(!tx()) return res.status(400).json({error:'Recovery link is invalid or expired.'});
  res.json({ok:true,message:'Password updated. Please sign in again.'});
});
app.get('/api/health',(req,res)=>res.json({ok:true}));
app.get('/reset', (req,res)=>res.redirect(`/reset.html${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`));
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(port,()=>console.log(`SmartScholar running at http://localhost:${port}`));

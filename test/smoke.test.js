import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('core project files exist',()=>{
  for (const file of ['server.js','public/index.html','public/app.js','public/styles.css','README.md']) assert.ok(fs.existsSync(new URL('../'+file,import.meta.url)),file);
});
test('guest calculations are not stored in browser persistence APIs',()=>{
  const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  assert.ok(!app.includes('localStorage'));
  assert.ok(!app.includes('indexedDB'));
});
test('IAA catalogue and static grading rules are bundled',()=>{
  const catalog=JSON.parse(fs.readFileSync(new URL('../public/data/iaa-modules.json',import.meta.url),'utf8'));
  const rules=JSON.parse(fs.readFileSync(new URL('../public/data/iaa-gpa-rules.json',import.meta.url),'utf8'));
  assert.equal(catalog.module_count,catalog.modules.length);
  assert.ok(catalog.modules.length>1000);
  assert.ok(new Set(catalog.modules.map(m=>m.programme)).size>=50);
  assert.deepEqual(rules.grade_scales['NTA Levels 4-5'],{A:4,B:3,C:2,D:1,F:0});
  assert.deepEqual(rules.grade_scales['NTA Levels 6-8'],{A:5,'B+':4,B:3,C:2,D:1,F:0});
  assert.match(rules.display_rule,/truncate/i);
});
test('IAA GPA calculator does not offer an editable grade scale',()=>{
  const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
  const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  assert.ok(!html.includes('id="gradeScale"'));
  assert.ok(app.includes('Math.floor((rawGpa+1e-9)*10)/10'));
  assert.ok(app.includes('NTA Level 9'));
});

test('password recovery and email verification are configured for secure token delivery',()=>{
  const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
  assert.ok(server.includes("import nodemailer from 'nodemailer'"));
  assert.ok(server.includes("purpose='reset' AND expires_at>?"));
  assert.ok(server.includes('smtpConfigured'));
  assert.ok(server.includes('Please verify your email'));
  assert.ok(!server.includes('DEV ONLY verification URL'));
  assert.ok(!server.includes('DEV ONLY password reset URL'));
  assert.ok(server.includes('Registration will not create accounts until SMTP is configured.'));
  assert.ok(server.includes('Verification email delivery failed:'));
  assert.ok(!server.includes('console.log(`DEV ONLY password reset token'));
});
test('IAA tuition calculator uses HESLB deduction and 40/20/40 instalments',()=>{
  const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
  const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  assert.ok(html.includes('id="courseTuition"'));
  assert.ok(html.includes('id="heslbTuition"'));
  assert.ok(app.includes('const afterLoan=tuition-loan'));
  assert.ok(app.includes('rate:0.40'));
  assert.ok(app.includes('rate:0.20'));
  assert.ok(app.includes("state.selected!=='iaa'"));
});

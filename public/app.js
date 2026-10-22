const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const state = { universities:[
  {id:'iaa',name:'Institute of Accountancy Arusha',short:'IAA',status:'Calculators available',links:[{label:'Official website',url:'https://www.iaa.ac.tz/'},{label:'Student resources',url:'https://www.iaa.ac.tz/student'}]},
  {id:'udsm',name:'University of Dar es Salaam',short:'UDSM',status:'Links only',links:[{label:'Official website',url:'https://www.udsm.ac.tz/'}]},
  {id:'udom',name:'University of Dodoma',short:'UDOM',status:'Links only',links:[{label:'Official website',url:'https://www.udom.ac.tz/'}]},
  {id:'mzumbe',name:'Mzumbe University',short:'Mzumbe',status:'Links only',links:[{label:'Official website',url:'https://www.mzumbe.ac.tz/'}]},
  {id:'must',name:'Mbeya University of Science and Technology',short:'MUST',status:'Links only',links:[{label:'Official website',url:'https://www.must.ac.tz/'}]}
], selected:'iaa', gpaRows:[], gpaResult:null, feeRows:[], feeResult:null, tasks:[], currentView:'dashboard', iaaCatalog:[], iaaSource:null, selectedIaaProgramme:'', selectedIaaSemester:'' };
const gradesNta45={A:4,B:3,C:2,D:1,F:0};
const gradesNta68={A:5,'B+':4,B:3,C:2,D:1,F:0};
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),3200)}
function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function setView(view){
  if(['gpa','fees'].includes(view) && state.selected!=='iaa'){toast('GPA and fee calculators are currently available for IAA only.');return}
  state.currentView=view;
  $$('.view').forEach(el=>el.classList.toggle('active',el.id===`view-${view}`));
  $$('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.view===view));
  const titles={dashboard:'Your dashboard',gpa:'GPA calculator',fees:'Fee planner',links:'University links',help:'Student help center',planner:'Study planner'};
  $('#pageTitle').textContent=titles[view]||'SmartScholar';
  $('#crumb').textContent=view==='dashboard'?'STUDENT WORKSPACE':view.toUpperCase().replace('-',' ')+' • SMARTSCHOLAR';
  $('.sidebar').classList.remove('open');
}
function renderUniversitySelect(){
  $('#university').innerHTML=state.universities.map(u=>`<option value="${u.id}">${escapeHtml(u.short)} — ${escapeHtml(u.name)}</option>`).join('');
  $('#university').value=state.selected;
  $('#universityCards').innerHTML=state.universities.map(u=>`<article class="university-card"><div class="uni-monogram">${escapeHtml(u.short.slice(0,4).toUpperCase())}</div><b>${escapeHtml(u.short)}</b><small>${escapeHtml(u.status)}</small></article>`).join('');
  renderLinks();
}
function currentUni(){return state.universities.find(u=>u.id===state.selected)||state.universities[0]}
function renderLinks(){
  const uni=currentUni();
  $('#linksGrid').innerHTML=state.universities.map(u=>`<article class="link-university"><h3>${escapeHtml(u.name)}</h3><div class="link-list">${u.links.map(l=>`<a href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer"><span>${escapeHtml(l.label)}</span><span>↗</span></a>`).join('')}<small>${escapeHtml(u.status)}</small></div></article>`).join('');
}
function addGpaRow(row={name:'',grade:'A',credits:3,ntaLevel:null,moduleCode:'',locked:false}){
  state.gpaRows.push({...row,credits:Number(row.credits)||3});
  renderGpaRows();
}
function rowLevel(row){
  if(row.ntaLevel) return Number(String(row.ntaLevel).match(/\d+/)?.[0]||0);
  const selected=state.iaaCatalog.find(m=>m.programme===state.selectedIaaProgramme&&m.semester===state.selectedIaaSemester);
  return Number(String(selected?.nta_level||'NTA Level 7').match(/\d+/)?.[0]||7);
}
function gradeMapForLevel(level){
  if(level>=4&&level<=5)return gradesNta45;
  if(level>=6&&level<=8)return gradesNta68;
  return null;
}
function gradeOptionsForRow(row){
  const map=gradeMapForLevel(rowLevel(row));
  return Object.keys(map||gradesNta68);
}
function renderGpaRows(){
  state.gpaRows.forEach(r=>{const opts=gradeOptionsForRow(r);if(!opts.includes(r.grade))r.grade=opts[0]||'A'});
  const body=$('#gpaTable tbody');
  body.innerHTML=state.gpaRows.map((r,i)=>`<tr data-index="${i}"><td><input class="module-name" maxlength="180" aria-label="Module name" placeholder="Module name" value="${escapeHtml(r.name)}" ${r.locked?'readonly title="Loaded from IAA prospectus"':''}><small class="muted module-code">${escapeHtml(r.moduleCode||'Custom module')}</small></td><td><select class="module-grade" aria-label="Grade" ${gradeMapForLevel(rowLevel(r))?'':'disabled'}>${gradeOptionsForRow(r).map(g=>`<option ${g===r.grade?'selected':''}>${g}</option>`).join('')}</select></td><td><input class="module-credits" type="number" min=".5" max="100" step=".5" aria-label="Credit hours" value="${Number(r.credits)||3}" ${r.locked?'readonly title="Credit hours fixed from IAA prospectus"':''}></td><td><button class="remove-row" aria-label="Remove module">×</button></td></tr>`).join('');
  $$('#gpaTable tbody tr').forEach(tr=>{
    const i=Number(tr.dataset.index);
    $('.module-name',tr).addEventListener('input',e=>state.gpaRows[i].name=e.target.value);
    $('.module-grade',tr).addEventListener('change',e=>state.gpaRows[i].grade=e.target.value);
    $('.module-credits',tr).addEventListener('input',e=>state.gpaRows[i].credits=Number(e.target.value));
    $('.remove-row',tr).addEventListener('click',()=>{state.gpaRows.splice(i,1);renderGpaRows()});
  });
  renderGradeRuleNotice();
}
function renderGradeRuleNotice(){
  const levels=[...new Set(state.gpaRows.map(rowLevel))];
  const unsupported=levels.some(n=>n<4||n>8);
  const low=levels.some(n=>n>=4&&n<=5), high=levels.some(n=>n>=6&&n<=8);
  let msg='IAA prospectus rules are fixed: NTA 4–5 uses A=4, B=3, C=2, D=1, F=0; NTA 6–8 uses A=5, B+=4, B=3, C=2, D=1, F=0.';
  if(unsupported) msg+=' The 2023/2024 prospectus does not specify a grade-point mapping for NTA Level 9, so GPA cannot be calculated for Level 9 modules until IAA confirms the applicable rule.';
  else if(low&&high) msg+=' Your rows span both grade scales; each module is weighted using its own NTA level.';
  $('#gradeScaleNotice').textContent=msg;
}
function loadIaaCatalog(){
  fetch('data/iaa-modules.json').then(r=>{if(!r.ok)throw new Error('catalog unavailable');return r.json()}).then(data=>{
    state.iaaCatalog=data.modules||[];state.iaaSource=data;
    const programmes=[...new Set(state.iaaCatalog.map(m=>m.programme))].sort((a,b)=>a.localeCompare(b));
    $('#iaaProgramme').innerHTML='<option value="">Choose a programme</option>'+programmes.map(p=>`<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
    $('#catalogStatus').textContent=`${data.module_count} module records across ${programmes.length} programme labels from ${data.source_title}. Credit hours are fixed when loaded. Please verify extracted records against the original prospectus before formal decisions.`;
    $('#iaaProgramme').addEventListener('change',()=>{
      state.selectedIaaProgramme=$('#iaaProgramme').value;
      const semesters=[...new Set(state.iaaCatalog.filter(m=>m.programme===state.selectedIaaProgramme).map(m=>m.semester))];
      $('#iaaSemester').innerHTML='<option value="">Choose semester</option>'+semesters.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
      state.selectedIaaSemester='';
    });
    $('#iaaSemester').addEventListener('change',()=>{state.selectedIaaSemester=$('#iaaSemester').value});
    $('#loadIaaModules').addEventListener('click',()=>{
      if(!state.selectedIaaProgramme||!state.selectedIaaSemester)return toast('Choose an IAA programme and semester first.');
      const modules=state.iaaCatalog.filter(m=>m.programme===state.selectedIaaProgramme&&m.semester===state.selectedIaaSemester);
      if(!modules.length)return toast('No module records were found for that selection.');
      const known=new Set(state.gpaRows.map(r=>r.moduleCode).filter(Boolean));
      modules.forEach(m=>{if(!known.has(m.module_code))state.gpaRows.push({name:m.module_title,grade:rowDefaultGrade(m),credits:m.credits,ntaLevel:m.nta_level,moduleCode:m.module_code,locked:true,source:m.source})});
      renderGpaRows();
      toast(`Loaded ${modules.length} IAA prospectus records with fixed credit hours.`);
    });
  }).catch(()=>{ $('#iaaProgramme').innerHTML='<option value="">IAA catalogue could not load</option>'; $('#catalogStatus').textContent='Could not load the IAA module catalogue. Restart the local app and try again.'; });
}
function rowDefaultGrade(module){const level=Number(String(module.nta_level).match(/\d+/)?.[0]||7);return level>=4&&level<=5?'A':'A'}
function calcGpa(){
  const rows=state.gpaRows.filter(r=>Number(r.credits)>0&&Number.isFinite(Number(r.credits)));
  if(!rows.length)throw new Error('Load IAA modules or add at least one module with positive credit hours.');
  const unsupported=rows.filter(r=>!gradeMapForLevel(rowLevel(r)));
  if(unsupported.length)throw new Error('IAA Prospectus 2023/2024 does not state the grade-point mapping for NTA Level 9. GPA calculation is paused for accuracy; confirm the official mapping with IAA.');
  const invalid=rows.filter(r=>!Object.hasOwn(gradeMapForLevel(rowLevel(r)),r.grade));
  if(invalid.length)throw new Error('One or more grades are not valid for the NTA level of the selected module. Check the grade dropdowns.');
  const totalCredits=rows.reduce((sum,r)=>sum+Number(r.credits),0);
  const points=rows.reduce((sum,r)=>sum+gradeMapForLevel(rowLevel(r))[r.grade]*Number(r.credits),0);
  const rawGpa=points/totalCredits;
  const gpa=Math.floor((rawGpa+1e-9)*10)/10; // IAA rules: truncate after first decimal place.
  const result={gpa,rawGpa,totalCredits,points,modules:rows.map(r=>({...r,credits:Number(r.credits),points:gradeMapForLevel(rowLevel(r))[r.grade]??0,ntaLevel:rowLevel(r)})),rounding:'truncated to one decimal place',source:'IAA Prospectus 2023/2024'};
  state.gpaResult=result;
  $('#gpaResult').classList.remove('hidden');
  $('#gpaResult').innerHTML=`<div class="eyebrow">IAA WEIGHTED GPA RESULT</div><div class="result-big">${result.gpa.toFixed(1)}<span style="font-size:15px;color:#6e8c7c"> / ${Math.max(...rows.map(r=>rowLevel(r)))<=5?'4.00':'5.00'}</span></div><p>IAA weighted formula: Σ(grade points × credit hours) ÷ Σ credit hours. The displayed GPA is truncated (not rounded) to one decimal place, as stated in the supplied 2023/2024 prospectus. Raw calculation: ${result.rawGpa.toFixed(4)}.</p><div class="result-metrics"><div><b>${totalCredits.toFixed(1)}</b><small>Total credit hours</small></div><div><b>${points.toFixed(2)}</b><small>Weighted points</small></div><div><b>${rows.filter(r=>r.grade==='F').length}</b><small>F grades</small></div></div>`;
  return result;
}
function csvEscape(v){return `"${String(v??'').replace(/"/g,'""')}"`}
function downloadCsv(name,rows){
  if(!rows.length)return toast('Nothing to export yet.');
  const csv=rows.map(row=>row.map(csvEscape).join(',')).join('\r\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);
}
function gpaCsv(){if(!state.gpaRows.length)return toast('Add modules first.');downloadCsv('smartscholar-gpa.csv',[['Module code','Module','Grade','Credit hours','NTA level','Grade points'],...state.gpaRows.map(r=>[r.moduleCode||'',r.name,r.grade,r.credits,rowLevel(r),gradeMapForLevel(rowLevel(r))?.[r.grade]??'Not specified']),['IAA GPA (truncated)',state.gpaResult?.gpa?.toFixed(1)||'Not calculated']])}
function calcFees(){
  if(state.selected!=='iaa') throw new Error('Fee calculations are currently available for IAA only.');
  const tuition=Number($('#courseTuition').value), loan=Number($('#heslbTuition').value), paid=Number($('#paidFees').value);
  if (![tuition,loan,paid].every(Number.isFinite) || tuition<0 || loan<0 || paid<0) throw new Error('Enter valid non-negative tuition, loan and paid amounts.');
  if (loan>tuition) throw new Error('HESLB tuition allocation cannot exceed the course tuition fee.');
  if (paid>tuition-loan) throw new Error('Tuition already paid cannot exceed tuition remaining after the HESLB deduction.');
  const afterLoan=tuition-loan, remaining=Math.max(0,afterLoan-paid);
  const installments=[{label:'Before registration / admission',rate:0.40,amount:Math.round(afterLoan*0.40)},{label:'Before Continuous Assessment Tests (CAT)',rate:0.20,amount:Math.round(afterLoan*0.20)},{label:'Before University Examinations (UE)',rate:0.40,amount:afterLoan-Math.round(afterLoan*0.40)-Math.round(afterLoan*0.20)}];
  const paidOffsets=[Math.min(paid,installments[0].amount)];
  let leftPaid=Math.max(0,paid-paidOffsets[0]);
  paidOffsets.push(Math.min(leftPaid,installments[1].amount)); leftPaid=Math.max(0,leftPaid-paidOffsets[1]);
  paidOffsets.push(Math.min(leftPaid,installments[2].amount));
  installments.forEach((x,i)=>x.due=Math.max(0,x.amount-paidOffsets[i]));
  state.feeRows=[{name:'Course tuition',amount:tuition},{name:'HESLB tuition loan',amount:-loan},{name:'Tuition already paid',amount:-paid}];
  state.feeResult={tuition,loan,paid,afterLoan,remaining,installments,currency:'TZS',total:tuition,balance:remaining,scholarship:loan};
  $('#feeResult').classList.remove('hidden');
  $('#feeResult').innerHTML=`<div class="eyebrow">IAA TUITION ESTIMATE</div><div class="result-big">${money(remaining,'TZS')}</div><p>Estimated tuition balance still payable by you after HESLB tuition support and tuition payments already made. This is an estimate, not an official statement.</p><div class="result-metrics"><div><b>${money(tuition,'TZS')}</b><small>Total course tuition</small></div><div><b>− ${money(loan,'TZS')}</b><small>HESLB tuition allocation</small></div><div><b>${money(afterLoan,'TZS')}</b><small>Student share before own payments</small></div></div><h3>Payment schedule</h3><div class="result-metrics">${installments.map(x=>`<div><b>${money(x.amount,'TZS')}</b><small>${Math.round(x.rate*100)}% · ${x.label}</small><p>Remaining due: <strong>${money(x.due,'TZS')}</strong></p></div>`).join('')}</div>`;
  return state.feeResult;
}
function money(v,currency='TZS'){try{return new Intl.NumberFormat('en-TZ',{style:'currency',currency,maximumFractionDigits:0}).format(v)}catch{return `${currency} ${v.toLocaleString()}`}}
function feeCsv(){const r=state.feeResult;if(!r)return toast('Calculate your IAA fee estimate first.');downloadCsv('smartscholar-iaa-fees.csv',[['Item','Amount (TZS)'],['Course tuition',r.tuition],['HESLB tuition loan',r.loan],['Tuition already paid',r.paid],['Student share after loan',r.afterLoan],['Remaining balance',r.remaining],[],['Instalment','Percent','Original amount (TZS)','Remaining due (TZS)'],...r.installments.map(x=>[x.label,Math.round(x.rate*100)+'%',x.amount,x.due])])}
function renderTasks(){
  $('#taskList').innerHTML=state.tasks.length?state.tasks.map((t,i)=>`<div class="task-item ${t.done?'done':''}"><input type="checkbox" aria-label="Mark task complete" data-task="${i}" ${t.done?'checked':''}><div class="task-copy"><b>${escapeHtml(t.name)}</b><small>${t.date?`Due ${escapeHtml(t.date)}`:'No due date'}</small></div><button class="remove-row" data-remove-task="${i}" aria-label="Delete task">×</button></div>`).join(''):'<p class="muted tiny">No tasks yet. Add your first study task above.</p>';
  $$('[data-task]').forEach(el=>el.addEventListener('change',()=>{state.tasks[Number(el.dataset.task)].done=el.checked;renderTasks()}));
  $$('[data-remove-task]').forEach(el=>el.addEventListener('click',()=>{state.tasks.splice(Number(el.dataset.removeTask),1);renderTasks()}));
}
function plannerCsv(){downloadCsv('smartscholar-study-plan.csv',[['Task','Due date','Complete'],...state.tasks.map(t=>[t.name,t.date,t.done?'Yes':'No'])])}
async function init(){
  $('#year').textContent=new Date().getFullYear();
  renderUniversitySelect();
  loadIaaCatalog();

  $$('.nav-item').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
  $$('[data-goto]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.goto)));
  $('#university').addEventListener('change',e=>{state.selected=e.target.value;renderLinks();if(state.selected!=='iaa'){if(['gpa','fees'].includes(state.currentView))setView('dashboard');toast('GPA and fee calculators are currently available for IAA only.')}else toast('IAA selected. GPA and fee calculators are available.');});
  $('#addModule').addEventListener('click',()=>addGpaRow());
  $('#clearModules').addEventListener('click',()=>{state.gpaRows=[];renderGpaRows();$('#gpaResult').classList.add('hidden')});
  $('#calculateGpa').addEventListener('click',()=>{try{calcGpa()}catch(e){toast(e.message)}});
  $('#gpaExport').addEventListener('click',gpaCsv);
  $('#simulateGpa').addEventListener('click',()=>{
    const current=Number($('#currentGpa').value),done=Number($('#completedCredits').value),target=Number($('#targetGpa').value),future=Number($('#futureCredits').value),max=(state.gpaRows.length&&state.gpaRows.every(r=>rowLevel(r)<=5))?4:5;
    const out=$('#simResult');
    if(state.gpaRows.some(r=>!gradeMapForLevel(rowLevel(r)))){out.textContent='The target simulator is unavailable for NTA Level 9 until IAA confirms the applicable grade-point mapping.';return}
    if([current,done,target,future].some(v=>!Number.isFinite(v))||current<0||current>max||target<0||target>max||done<0||future<=0){out.textContent='Enter valid GPA values and positive future credits.';return}
    const need=(target*(done+future)-current*done)/future;
    out.textContent=need<=0?`You have already met the target based on these inputs.`:need>max?`You would need ${need.toFixed(2)} points per future credit, above the maximum ${max}. The target is not reachable under these assumptions.`:`You need an average of ${need.toFixed(2)} grade points per future credit to reach ${target.toFixed(2)}.`;
  });
  $('#calculateFees').addEventListener('click',()=>{try{calcFees()}catch(e){toast(e.message)}});
  $('#feeExport').addEventListener('click',feeCsv);
  $('#addTask').addEventListener('click',()=>{const name=$('#taskName').value.trim();if(!name)return toast('Enter a task name.');state.tasks.push({name,date:$('#taskDate').value,done:false});$('#taskName').value='';renderTasks()});
  $('#plannerExport').addEventListener('click',plannerCsv);
  $('#menuToggle').addEventListener('click',()=>$('.sidebar').classList.toggle('open'));
  renderTasks();
}
init();

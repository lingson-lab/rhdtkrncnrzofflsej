(() => {
  'use strict';

  const CATEGORY = ['현장조사','도면확정','장비발주','장비 설치','테스트','인수인계'];
  const STAGE_ORDER = CATEGORY;
  const storageKey = 'lingson-construction-dashboard-v2';
  const deliveryKey = 'lingson-delivery-confirmations-v1';

  const sampleState = {
    projects: [
      {id:'p1', name:'검단금호어울림센트럴', manager:'김대희', stage:'장비 설치', start:'2026-09-04', due:'2026-09-22', progress:68, status:'진행중', contract:12800000, received:8000000, lastPayment:'2026-09-14', scheduled:2800000},
      {id:'p2', name:'반월 두산위브', manager:'김재경', stage:'테스트', start:'2026-08-25', due:'2026-09-18', progress:84, status:'진행중', contract:9600000, received:9600000, lastPayment:'2026-09-10', scheduled:0},
      {id:'p3', name:'부천 어반스퀘어', manager:'양회성', stage:'인수인계', start:'2026-07-16', due:'2026-09-05', progress:100, status:'완료', contract:15000000, received:15000000, lastPayment:'2026-09-03', scheduled:0},
      {id:'p4', name:'에코델타 12BL', manager:'김아름', stage:'도면확정', start:'2026-09-01', due:'2026-09-12', progress:28, status:'지연', contract:11800000, received:3000000, lastPayment:'2026-09-02', scheduled:3000000}
    ],
    schedules: [
      {id:'s1', complex:'검단금호어울림센트럴', category:'장비 설치', start:'2026-09-15', end:'2026-09-18', memo:'커뮤니티 출입 장비 설치'},
      {id:'s2', complex:'반월 두산위브', category:'테스트', start:'2026-09-16', end:'2026-09-17', memo:'관리자 기능 및 출입 테스트'},
      {id:'s3', complex:'부천 어반스퀘어', category:'인수인계', start:'2026-09-03', end:'2026-09-05', memo:'관리사무소 인수인계'},
      {id:'s4', complex:'에코델타 12BL', category:'도면확정', start:'2026-09-09', end:'2026-09-12', memo:'최종 도면 확인'}
    ]
  };

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
  const fmtWon = n => `${Math.max(0, Number(n)||0).toLocaleString('ko-KR')}원`;
  const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const parseDate = s => { const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); };
  const escapeHtml = s => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const uid = prefix => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2,7)}`;

  let state = loadState();
  let calendarDate = new Date(2026,8,16);
  let calendarMode = 'month';

  function loadState(){
    try { return JSON.parse(localStorage.getItem(storageKey)) || structuredClone(sampleState); }
    catch { return structuredClone(sampleState); }
  }
  function saveState(){ localStorage.setItem(storageKey, JSON.stringify(state)); }
  function showToast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>t.classList.remove('show'),1800); }

  const icons = {
    calendar:'<path d="M4 5h16v15H4z"/><path d="M8 3v4M16 3v4M4 9h16"/>',
    list:'<path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
    won:'<path d="M5 5l3 14 4-11 4 11 3-14M3 12h18"/>',
    document:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 12h6M9 16h6"/>',
    menu:'<path d="M4 7h16M4 12h16M4 17h16"/>', plus:'<path d="M12 5v14M5 12h14"/>',
    'chevron-left':'<path d="M15 18l-6-6 6-6"/>','chevron-right':'<path d="M9 18l6-6-6-6"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    close:'<path d="M6 6l12 12M18 6L6 18"/>', save:'<path d="M5 4h12l2 2v14H5z"/><path d="M8 4v6h8V4M8 16h8"/>',
    print:'<path d="M7 9V4h10v5M7 18H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M7 14h10v7H7z"/>'
  };
  $$('[data-icon]').forEach(el => { const name=el.dataset.icon; el.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]||''}</svg>`; });

  const pageMeta = {
    calendarView:['공사 일정','단지별 공정 일정을 한눈에 확인하고 관리합니다.'],
    detailView:['단지별 진행 현황','단지별 공정 진행 상태와 주요 일정을 관리합니다.'],
    paymentView:['입금 현황','단지별 계약금·중도금·잔금 입금 현황을 관리합니다.'],
    deliveryView:['납품확인서 관리','단지를 선택해 납품확인서를 작성하고 출력합니다.']
  };

  $$('.nav-item').forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));
  function switchView(viewId){
    $$('.nav-item').forEach(b=>b.classList.toggle('is-active', b.dataset.view===viewId));
    $$('.view').forEach(v=>v.classList.toggle('is-active', v.id===viewId));
    const [title,desc]=pageMeta[viewId]; $('#pageTitle').textContent=title; $('#pageDesc').textContent=desc;
    $('#openScheduleModal').style.display=viewId==='calendarView'?'inline-flex':'none';
    $('#sidebar').classList.remove('open');
    if(viewId==='detailView') renderProjects(); if(viewId==='paymentView') renderPayments(); if(viewId==='deliveryView') renderDeliveryPreview();
  }

  $('#mobileMenu').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
  document.addEventListener('click',e=>{ if(innerWidth<=780 && $('#sidebar').classList.contains('open') && !e.target.closest('#sidebar') && !e.target.closest('#mobileMenu')) $('#sidebar').classList.remove('open'); });

  function init(){
    const now=new Date(); $('#todayChip').textContent=new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long',day:'numeric',weekday:'short'}).format(now);
    CATEGORY.forEach(c=>{ $('#calendarCategory').insertAdjacentHTML('beforeend',`<option>${c}</option>`); $('#scheduleCategory').insertAdjacentHTML('beforeend',`<option>${c}</option>`); });
    $('#scheduleCategory').value=CATEGORY[0];
    setFormToday(); populateComplexes(); renderAll(); addDeliveryRow();
  }
  function setFormToday(){ const t=iso(new Date()); $('#scheduleStart').value=t; $('#scheduleEnd').value=t; $('#deliveryDate').value=t; $('#confirmDate').value=t; }
  function renderAll(){ renderKpis(); renderCalendar(); renderProjects(); renderPayments(); renderDeliveryPreview(); }

  function renderKpis(){
    const monthEvents=state.schedules.filter(s=>{const d=parseDate(s.start);return d.getFullYear()===calendarDate.getFullYear()&&d.getMonth()===calendarDate.getMonth()}).length;
    const doing=state.projects.filter(p=>p.status==='진행중').length, delayed=state.projects.filter(p=>p.status==='지연').length;
    $('#kpiComplexes').textContent=state.projects.length; $('#kpiInProgress').textContent=doing; $('#kpiMonthEvents').textContent=monthEvents; $('#kpiDelayed').textContent=delayed;
    $('#detailTotal').textContent=state.projects.length; $('#detailDoing').textContent=doing; $('#detailDone').textContent=state.projects.filter(p=>p.status==='완료').length; $('#detailDelayed').textContent=delayed;
    const total=state.projects.reduce((a,p)=>a+p.contract,0), received=state.projects.reduce((a,p)=>a+p.received,0), scheduled=state.projects.reduce((a,p)=>a+(p.scheduled||0),0);
    $('#payTotal').textContent=fmtWon(total); $('#payReceived').textContent=fmtWon(received); $('#payScheduled').textContent=fmtWon(scheduled); $('#payOutstanding').textContent=fmtWon(total-received);
  }

  $('#prevPeriod').addEventListener('click',()=>shiftPeriod(-1)); $('#nextPeriod').addEventListener('click',()=>shiftPeriod(1));
  $('#goToday').addEventListener('click',()=>{calendarDate=new Date();renderCalendar();renderKpis();});
  $$('.view-switch button').forEach(btn=>btn.addEventListener('click',()=>{calendarMode=btn.dataset.mode;$$('.view-switch button').forEach(b=>b.classList.toggle('is-active',b===btn));renderCalendar();}));
  $('#calendarSearch').addEventListener('input',renderCalendar); $('#calendarCategory').addEventListener('change',renderCalendar);
  $('#resetCalendarFilter').addEventListener('click',()=>{$('#calendarSearch').value='';$('#calendarCategory').value='';renderCalendar();});
  function shiftPeriod(n){ if(calendarMode==='month') calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()+n,1); else if(calendarMode==='week') calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth(),calendarDate.getDate()+7*n); else calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth(),calendarDate.getDate()+n); renderCalendar();renderKpis(); }
  function filteredSchedules(){ const q=$('#calendarSearch').value.trim().toLowerCase(), cat=$('#calendarCategory').value; return state.schedules.filter(s=>(!q||s.complex.toLowerCase().includes(q))&&(!cat||s.category===cat)); }
  function eventOnDate(s,date){const d=new Date(date.getFullYear(),date.getMonth(),date.getDate()), a=parseDate(s.start), b=parseDate(s.end);return d>=a&&d<=b;}
  function renderCalendar(){
    if(calendarMode==='month') renderMonth(); else renderAgenda(calendarMode);
    bindScheduleDelete();
  }

  function bindScheduleDelete(){
    $$('[data-schedule-id]').forEach(btn=>{
      btn.addEventListener('click', e=>{
        e.preventDefault();
        e.stopPropagation();
        deleteSchedule(btn.dataset.scheduleId);
      });
    });
  }

  function deleteSchedule(id){
    const s=state.schedules.find(x=>x.id===id);
    if(!s)return;
    const ok=confirm(`${s.complex}\n${s.category} (${s.start} ~ ${s.end})\n\n이 일정을 삭제할까요?`);
    if(!ok)return;
    state.schedules=state.schedules.filter(x=>x.id!==id);
    saveState();
    renderAll();
    populateComplexes();
    showToast('일정이 삭제되었습니다.');
  }
  function renderMonth(){
    const y=calendarDate.getFullYear(),m=calendarDate.getMonth(); $('#calendarLabel').textContent=`${y}년 ${m+1}월`;
    const first=new Date(y,m,1), start=new Date(y,m,1-first.getDay()); const weekdays=['일','월','화','수','목','금','토']; let html='<div class="month-grid">'+weekdays.map(w=>`<div class="weekday">${w}</div>`).join(''); const events=filteredSchedules();
    for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i);const outside=d.getMonth()!==m, today=iso(d)===iso(new Date()); const dayEvents=events.filter(s=>eventOnDate(s,d)); html+=`<div class="calendar-cell ${outside?'outside':''} ${today?'today':''}"><div class="day-number">${d.getDate()}</div>${dayEvents.slice(0,4).map(s=>`<button class="event-pill" data-schedule-id="${s.id}" data-category="${escapeHtml(s.category)}" title="클릭하여 일정 삭제 · ${escapeHtml(s.complex)} · ${escapeHtml(s.memo)}">${escapeHtml(s.complex)} · ${escapeHtml(s.category)}</button>`).join('')}${dayEvents.length>4?`<div class="event-more">+${dayEvents.length-4}</div>`:''}</div>`;}
    $('#calendarContainer').innerHTML=html+'</div>';
  }
  function renderAgenda(mode){
    const events=filteredSchedules(); const dates=[]; const count=mode==='week'?7:1; const base=new Date(calendarDate); if(mode==='week') base.setDate(base.getDate()-base.getDay());
    for(let i=0;i<count;i++){const d=new Date(base);d.setDate(base.getDate()+i);dates.push(d);} $('#calendarLabel').textContent=mode==='week'?`${dates[0].getMonth()+1}.${dates[0].getDate()} - ${dates.at(-1).getMonth()+1}.${dates.at(-1).getDate()}`:`${base.getFullYear()}년 ${base.getMonth()+1}월 ${base.getDate()}일`;
    const html=dates.map(d=>{const ev=events.filter(s=>eventOnDate(s,d));return `<div class="agenda-day"><div class="agenda-date">${new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'short'}).format(d)}</div>${ev.length?ev.map(s=>`<div class="agenda-item"><strong>${escapeHtml(s.complex)}</strong><span>${escapeHtml(s.category)}</span><span>${escapeHtml(s.memo||'-')}</span><button type="button" class="table-link" data-schedule-id="${s.id}">삭제</button></div>`).join(''):'<div class="agenda-empty">등록된 일정이 없습니다.</div>'}</div>`}).join(''); $('#calendarContainer').innerHTML=`<div class="agenda">${html}</div>`;
  }

  const scheduleModal=$('#scheduleModal'); $('#openScheduleModal').addEventListener('click',()=>scheduleModal.hidden=false); $('#closeScheduleModal').addEventListener('click',()=>scheduleModal.hidden=true); $('#cancelSchedule').addEventListener('click',()=>scheduleModal.hidden=true); scheduleModal.addEventListener('click',e=>{if(e.target===scheduleModal)scheduleModal.hidden=true;});
  $('#scheduleForm').addEventListener('submit',e=>{e.preventDefault(); const start=$('#scheduleStart').value,end=$('#scheduleEnd').value;if(parseDate(end)<parseDate(start)){showToast('종료일은 시작일 이후여야 합니다.');return;} state.schedules.push({id:uid('s'),complex:$('#scheduleComplex').value.trim(),category:$('#scheduleCategory').value,start,end,memo:$('#scheduleMemo').value.trim()}); saveState(); scheduleModal.hidden=true; e.target.reset(); setFormToday(); $('#scheduleCategory').value=CATEGORY[0]; renderAll(); populateComplexes(); showToast('일정이 등록되었습니다.');});

  $('#projectSearch').addEventListener('input',renderProjects);
  function renderProjects(){
    const q=$('#projectSearch').value.trim().toLowerCase(); const rows=state.projects.filter(p=>!q||`${p.name} ${p.manager}`.toLowerCase().includes(q)); $('#projectTableBody').innerHTML=rows.map(p=>`<tr><td><strong>${escapeHtml(p.name)}</strong></td><td>${escapeHtml(p.manager)}</td><td>${escapeHtml(p.stage)}</td><td>${p.start}</td><td>${p.due}</td><td><div class="progress-wrap"><div class="progress-bar"><i style="width:${Math.max(0,Math.min(100,p.progress))}%"></i></div><strong>${p.progress}%</strong></div></td><td>${statusBadge(p.status)}</td><td><div style="display:flex;gap:10px;align-items:center"><button class="table-link" data-project="${p.id}">상세보기</button><button class="table-link" data-delete-project="${p.id}" style="color:#D92D20">삭제</button></div></td></tr>`).join('')||emptyRow(8);
    $$('[data-project]').forEach(btn=>btn.addEventListener('click',()=>openProjectDetail(btn.dataset.project)));
    $$('[data-delete-project]').forEach(btn=>btn.addEventListener('click',()=>deleteProject(btn.dataset.deleteProject)));
  }

  function deleteProject(id){
    const p=state.projects.find(x=>x.id===id);
    if(!p)return;
    const ok=confirm(`${p.name}\n\n이 단지를 상세 관리와 입금 관리에서 삭제할까요?\n연결된 캘린더 일정은 별도로 유지됩니다.`);
    if(!ok)return;
    state.projects=state.projects.filter(x=>x.id!==id);
    saveState();
    renderAll();
    populateComplexes();
    showToast('단지 정보가 삭제되었습니다.');
  }
  function statusBadge(s){const cls=s==='완료'?'done':s==='지연'?'delayed':'doing';return `<span class="badge ${cls}">${s}</span>`;}
  function emptyRow(n){return `<tr><td colspan="${n}" style="text-align:center;color:#8A94A5;padding:32px">표시할 데이터가 없습니다.</td></tr>`;}
  function openProjectDetail(id){const p=state.projects.find(x=>x.id===id);if(!p)return;$('#detailModalTitle').textContent=p.name;const stageIdx=STAGE_ORDER.indexOf(p.stage);$('#detailModalContent').innerHTML=`<div class="project-summary"><div class="summary-box"><span>담당자</span><strong>${escapeHtml(p.manager)}</strong></div><div class="summary-box"><span>상태</span><strong>${p.status}</strong></div><div class="summary-box"><span>기간</span><strong>${p.start} ~ ${p.due}</strong></div><div class="summary-box"><span>진행률</span><strong>${p.progress}%</strong></div></div><div class="timeline"><h3>공정 타임라인</h3><div class="timeline-row">${STAGE_ORDER.map((s,i)=>`<div class="timeline-step ${i<=stageIdx?'done':''}">${s}</div>`).join('')}</div></div>`;$('#detailModal').hidden=false;}
  $('#closeDetailModal').addEventListener('click',()=>$('#detailModal').hidden=true); $('#detailModal').addEventListener('click',e=>{if(e.target===$('#detailModal'))e.currentTarget.hidden=true;});

  $('#paymentSearch').addEventListener('input',renderPayments);
  function renderPayments(){const q=$('#paymentSearch').value.trim().toLowerCase();const rows=state.projects.filter(p=>!q||p.name.toLowerCase().includes(q));$('#paymentTableBody').innerHTML=rows.map(p=>{const bal=p.contract-p.received;let status=bal<=0?['입금완료','done']:p.received>0?['일부입금','partial']:p.scheduled>0?['입금예정','scheduled']:['미입금','delayed'];return `<tr><td><strong>${escapeHtml(p.name)}</strong></td><td>${fmtWon(p.contract)}</td><td>${fmtWon(p.received)}</td><td><strong>${fmtWon(bal)}</strong></td><td>${p.lastPayment||'-'}</td><td><span class="badge ${status[1]}">${status[0]}</span></td><td><button class="table-link" data-pay="${p.id}">금액 수정</button></td></tr>`}).join('')||emptyRow(7);$$('[data-pay]').forEach(btn=>btn.addEventListener('click',()=>editPayment(btn.dataset.pay)));}
  function editPayment(id){const p=state.projects.find(x=>x.id===id);const val=prompt(`${p.name}\n현재 누적 입금액: ${p.received.toLocaleString()}원\n새 누적 입금액을 입력하세요.`,String(p.received));if(val===null)return;const n=Number(String(val).replace(/,/g,''));if(!Number.isFinite(n)||n<0){showToast('올바른 금액을 입력해 주세요.');return;}p.received=Math.min(n,p.contract);p.lastPayment=iso(new Date());saveState();renderPayments();renderKpis();showToast('입금 정보가 수정되었습니다.');}

  function populateComplexes(){const names=[...new Set([...state.projects.map(p=>p.name),...state.schedules.map(s=>s.complex)])]; const cur=$('#deliveryComplex').value; $('#deliveryComplex').innerHTML='<option value="">단지 선택</option>'+names.map(n=>`<option>${escapeHtml(n)}</option>`).join(''); if(names.includes(cur))$('#deliveryComplex').value=cur;}
  function addDeliveryRow(data={item:'',spec:'',unit:'EA',qty:1,ok:true,note:''}){const tr=document.createElement('tr');tr.innerHTML=`<td><input data-k="item" value="${escapeHtml(data.item)}" placeholder="품목"></td><td><input data-k="spec" value="${escapeHtml(data.spec)}" placeholder="규격"></td><td><input data-k="unit" value="${escapeHtml(data.unit)}"></td><td><input data-k="qty" type="number" min="0" value="${Number(data.qty)||0}"></td><td class="check-cell"><input data-k="ok" type="checkbox" ${data.ok?'checked':''}></td><td><input data-k="note" value="${escapeHtml(data.note)}" placeholder="비고"></td><td><button type="button" class="row-delete" aria-label="행 삭제">×</button></td>`;$('#deliveryItemsBody').append(tr); tr.querySelectorAll('input').forEach(i=>i.addEventListener('input',renderDeliveryPreview)); tr.querySelector('.row-delete').addEventListener('click',()=>{tr.remove();renderDeliveryPreview();});renderDeliveryPreview();}
  $('#addDeliveryRow').addEventListener('click',()=>addDeliveryRow());
  ['deliveryComplex','deliveryDate','supplierName','supplierCeo','supplierAddress','confirmDept','confirmName','confirmDate'].forEach(id=>$('#'+id).addEventListener('input',renderDeliveryPreview));
  function getDeliveryItems(){return $$('#deliveryItemsBody tr').map(tr=>{const o={}; $$('input',tr).forEach(i=>o[i.dataset.k]=i.type==='checkbox'?i.checked:i.value);return o;});}
  function renderDeliveryPreview(){const complex=$('#deliveryComplex')?.value||'';const items=getDeliveryItems();$('#deliveryPreview').innerHTML=`<h2>납 품 확 인 서</h2><div class="doc-meta"><strong>단지명</strong>　${escapeHtml(complex||'-')}<br><strong>납품일자</strong>　${escapeHtml($('#deliveryDate')?.value||'-')}</div><div class="doc-section"><h3>납 품 내 역</h3><table><thead><tr><th>품목</th><th>규격</th><th>단위</th><th>수량</th><th>납품확인</th><th>비고</th></tr></thead><tbody>${items.length?items.map(i=>`<tr><td>${escapeHtml(i.item||'-')}</td><td>${escapeHtml(i.spec||'-')}</td><td>${escapeHtml(i.unit||'-')}</td><td>${escapeHtml(i.qty||'0')}</td><td>${i.ok?'확인':'-'}</td><td>${escapeHtml(i.note||'')}</td></tr>`).join(''):'<tr><td colspan="6">납품 내역 없음</td></tr>'}</tbody></table></div><div class="sign-row">확인자　${escapeHtml($('#confirmDept')?.value||'')}　${escapeHtml($('#confirmName')?.value||'')}　 /　 ${escapeHtml($('#confirmDate')?.value||'')}</div><div class="supplier"><strong>공 급 자</strong><br>상호　${escapeHtml($('#supplierName')?.value||'')}<br>대표이사　${escapeHtml($('#supplierCeo')?.value||'')}<br>주소　${escapeHtml($('#supplierAddress')?.value||'')}</div>`;}
  $('#saveDelivery').addEventListener('click',()=>{const payload={id:uid('d'),complex:$('#deliveryComplex').value,date:$('#deliveryDate').value,supplierName:$('#supplierName').value,supplierCeo:$('#supplierCeo').value,supplierAddress:$('#supplierAddress').value,confirmDept:$('#confirmDept').value,confirmName:$('#confirmName').value,confirmDate:$('#confirmDate').value,items:getDeliveryItems(),savedAt:new Date().toISOString()};let list=[];try{list=JSON.parse(localStorage.getItem(deliveryKey))||[]}catch{} list.unshift(payload);localStorage.setItem(deliveryKey,JSON.stringify(list.slice(0,50)));showToast('납품확인서를 저장했습니다.');});
  $('#resetDelivery').addEventListener('click',()=>{$('#deliveryForm').reset();$('#supplierName').value='㈜링스온';$('#supplierCeo').value='나이준 (직인생략)';$('#supplierAddress').value='경기도 안양시 동안구 시민대로 181, 2층';$('#deliveryItemsBody').innerHTML='';setFormToday();addDeliveryRow();showToast('입력값을 초기화했습니다.');});
  $('#printDelivery').addEventListener('click',()=>{const preview=$('#deliveryPreview').cloneNode(true);const printWin=window.open('','_blank','width=900,height=1000');printWin.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>납품확인서</title><style>body{margin:0;font-family:Arial,'Noto Sans KR',sans-serif}.paper{width:210mm;min-height:297mm;padding:18mm 16mm;box-sizing:border-box;color:#111}.paper h2{text-align:center;font-size:25px;letter-spacing:.35em;margin:0 0 22mm}.doc-meta{font-size:12px;margin-bottom:12mm}.doc-section{margin-top:10mm}.doc-section h3{font-size:13px;border-bottom:2px solid #111;padding-bottom:4px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #aaa;padding:7px;font-size:11px;text-align:left}th{background:#f7f7f7}.sign-row{text-align:right;margin-top:16mm;font-size:12px}.supplier{margin-top:20mm;font-size:12px;line-height:1.9}@page{size:A4;margin:0}</style></head><body><div class="paper">${preview.innerHTML}</div><script>window.onload=()=>{window.print();}</script></body></html>`);printWin.document.close();});

  document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('#scheduleModal').hidden=true;$('#detailModal').hidden=true;}});
  init();
})();

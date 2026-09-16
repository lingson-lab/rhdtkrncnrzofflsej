(() => {
  "use strict";

  const STAGES = ["현장조사","도면확정","장비발주","장비 설치","테스트","인수인계"];
  const STORAGE_KEY = "lingson-construction-dashboard-v2";
  const DELIVERY_KEY = "lingson-delivery-confirmations-v2";

  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"
  }[c]));
  const uid = prefix => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
  const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const parseDate = s => {
    if (!s) return new Date(0);
    const [y,m,d] = s.split("-").map(Number);
    return new Date(y,m-1,d);
  };
  const fmtWon = n => `${Math.max(0, Number(n) || 0).toLocaleString("ko-KR")}원`;

  let state = loadState();
  let calendarDate = new Date();
  let calendarMode = "month";

  function blankState(){
    return { schedules: [], projects: [] };
  }

  function normalizeProject(raw){
    const completed = Array.isArray(raw.completedStages)
      ? STAGES.map((_, i) => Boolean(raw.completedStages[i]))
      : STAGES.map((_, i) => {
          if (Number(raw.progress) >= 100) return true;
          const stageIndex = STAGES.indexOf(raw.stage);
          return stageIndex >= 0 && i < stageIndex;
        });

    return {
      id: raw.id || uid("p"),
      name: String(raw.name || "").trim(),
      completedStages: completed,
      finance: {
        constructionPayment: Number(raw.finance?.constructionPayment ?? raw.received ?? 0) || 0,
        programPayment: Number(raw.finance?.programPayment ?? 0) || 0,
        taxInvoice: Boolean(raw.finance?.taxInvoice ?? false)
      },
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || new Date().toISOString()
    };
  }

  function loadState(){
    try{
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved) return blankState();
      return {
        schedules: Array.isArray(saved.schedules) ? saved.schedules.map(s => ({
          id: s.id || uid("s"),
          complex: String(s.complex || "").trim(),
          category: STAGES.includes(s.category) ? s.category : STAGES[0],
          start: s.start || iso(new Date()),
          end: s.end || s.start || iso(new Date()),
          memo: String(s.memo || "")
        })).filter(s => s.complex) : [],
        projects: Array.isArray(saved.projects) ? saved.projects.map(normalizeProject).filter(p => p.name) : []
      };
    }catch{
      return blankState();
    }
  }

  function saveState(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getDeliveryList(){
    try{
      const list = JSON.parse(localStorage.getItem(DELIVERY_KEY));
      return Array.isArray(list) ? list : [];
    }catch{
      return [];
    }
  }

  function saveDeliveryList(list){
    localStorage.setItem(DELIVERY_KEY, JSON.stringify(list.slice(0, 100)));
  }

  function showToast(message){
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  const icons = {
    calendar:'<path d="M4 5h16v15H4z"/><path d="M8 3v4M16 3v4M4 9h16"/>',
    list:'<path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
    document:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 12h6M9 16h6"/>',
    menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    "chevron-left":'<path d="M15 18l-6-6 6-6"/>',
    "chevron-right":'<path d="M9 18l6-6-6-6"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    close:'<path d="M6 6l12 12M18 6L6 18"/>',
    save:'<path d="M5 4h12l2 2v14H5z"/><path d="M8 4v6h8V4M8 16h8"/>',
    print:'<path d="M7 9V4h10v5M7 18H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M7 14h10v7H7z"/>'
  };

  function renderIcons(){
    $$("[data-icon]").forEach(el => {
      el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[el.dataset.icon] || ""}</svg>`;
    });
  }

  function ensureProject(complex){
    const name = complex.trim();
    let project = state.projects.find(p => p.name === name);
    if (!project){
      project = normalizeProject({ name, completedStages:[false,false,false,false,false,false] });
      state.projects.push(project);
    }
    return project;
  }

  function ensureProjectsFromSchedules(){
    let changed = false;
    state.schedules.forEach(s => {
      if (!state.projects.some(p => p.name === s.complex)){
        state.projects.push(normalizeProject({ name:s.complex }));
        changed = true;
      }
    });
    if (changed) saveState();
  }

  function progressOf(project){
    const done = project.completedStages.filter(Boolean).length;
    return Math.round(done / STAGES.length * 100);
  }

  function currentStageOf(project){
    const firstIncomplete = project.completedStages.findIndex(v => !v);
    return firstIncomplete === -1 ? "완료" : STAGES[firstIncomplete];
  }

  function switchView(viewId){
    $$(".nav-item").forEach(b => b.classList.toggle("is-active", b.dataset.view === viewId));
    $$(".view").forEach(v => v.classList.toggle("is-active", v.id === viewId));
    const meta = {
      calendarView:["공사 일정","단지명과 공정 일정을 한눈에 확인하고 관리합니다."],
      detailView:["단지별 진행현황","1~6단계 진행률과 재정 정보를 단지별로 관리합니다."],
      deliveryView:["납품확인서","단지별 납품확인서를 작성·저장·출력합니다."]
    }[viewId];
    $("#pageTitle").textContent = meta[0];
    $("#pageDesc").textContent = meta[1];
    $("#openScheduleModal").style.display = viewId === "calendarView" ? "inline-flex" : "none";
    $("#sidebar").classList.remove("open");
    if (viewId === "detailView") renderProjects();
    if (viewId === "deliveryView") {
      populateComplexes();
      renderDeliveryPreview();
    }
  }

  function renderKpis(){
    ensureProjectsFromSchedules();

    const monthCount = state.schedules.filter(s => {
      const start = parseDate(s.start);
      return start.getFullYear() === calendarDate.getFullYear() &&
             start.getMonth() === calendarDate.getMonth();
    }).length;

    const done = state.projects.filter(p => progressOf(p) === 100).length;
    const doing = state.projects.length - done;
    const taxDone = state.projects.filter(p => p.finance.taxInvoice).length;

    $("#kpiComplexes").textContent = state.projects.length;
    $("#kpiMonthEvents").textContent = monthCount;
    $("#kpiDoing").textContent = doing;
    $("#kpiDone").textContent = done;

    $("#detailTotal").textContent = state.projects.length;
    $("#detailDoing").textContent = doing;
    $("#detailDone").textContent = done;
    $("#detailTaxDone").textContent = taxDone;
  }

  function filteredSchedules(){
    const q = $("#calendarSearch").value.trim().toLowerCase();
    const cat = $("#calendarCategory").value;
    return state.schedules.filter(s =>
      (!q || s.complex.toLowerCase().includes(q)) &&
      (!cat || s.category === cat)
    );
  }

  function eventOnDate(schedule, date){
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return d >= parseDate(schedule.start) && d <= parseDate(schedule.end);
  }

  function renderCalendar(){
    if (calendarMode === "month") renderMonth();
    else renderAgenda(calendarMode);
  }

  function renderMonth(){
    const y = calendarDate.getFullYear();
    const m = calendarDate.getMonth();
    $("#calendarLabel").textContent = `${y}년 ${m + 1}월`;

    const first = new Date(y, m, 1);
    const start = new Date(y, m, 1 - first.getDay());
    const weekdays = ["일","월","화","수","목","금","토"];
    const events = filteredSchedules();

    let html = `<div class="month-grid">${weekdays.map(w => `<div class="weekday">${w}</div>`).join("")}`;

    for (let i = 0; i < 42; i++){
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const outside = d.getMonth() !== m;
      const today = iso(d) === iso(new Date());
      const dayEvents = events.filter(s => eventOnDate(s, d));

      html += `<div class="calendar-cell ${outside ? "outside" : ""} ${today ? "today" : ""}">
        <div class="day-number">${d.getDate()}</div>
        ${dayEvents.slice(0,4).map(s => `
          <div class="event-pill" title="${escapeHtml(s.complex)} · ${escapeHtml(s.category)} · ${escapeHtml(s.memo)}">
            ${escapeHtml(s.complex)} · ${escapeHtml(s.category)}
            <button class="event-delete" data-delete-schedule="${s.id}" aria-label="일정 삭제">×</button>
          </div>
        `).join("")}
        ${dayEvents.length > 4 ? `<div class="more-events">+${dayEvents.length - 4}개 더보기</div>` : ""}
      </div>`;
    }

    html += "</div>";
    $("#calendarContainer").innerHTML = html;
    bindScheduleDelete();
  }

  function startOfWeek(date){
    const d = new Date(date);
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }

  function renderAgenda(mode){
    const events = filteredSchedules();
    const dates = [];

    if (mode === "week"){
      const start = startOfWeek(calendarDate);
      for (let i = 0; i < 7; i++){
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        dates.push(d);
      }
      $("#calendarLabel").textContent =
        `${dates[0].getMonth()+1}.${dates[0].getDate()} ~ ${dates[6].getMonth()+1}.${dates[6].getDate()}`;
    }else{
      dates.push(new Date(calendarDate));
      $("#calendarLabel").textContent =
        new Intl.DateTimeFormat("ko-KR",{year:"numeric",month:"long",day:"numeric",weekday:"short"}).format(calendarDate);
    }

    $("#calendarContainer").innerHTML = `<div class="agenda">${
      dates.map(d => {
        const list = events.filter(s => eventOnDate(s, d));
        return `<div class="agenda-day">
          <div class="agenda-date">${new Intl.DateTimeFormat("ko-KR",{month:"long",day:"numeric",weekday:"short"}).format(d)}</div>
          ${list.length ? list.map(s => `
            <div class="agenda-item">
              <strong>${escapeHtml(s.complex)}</strong>
              <span>${escapeHtml(s.category)}</span>
              <span>${escapeHtml(s.memo || "일정 내용 없음")}</span>
              <button class="delete-link" data-delete-schedule="${s.id}">삭제</button>
            </div>
          `).join("") : `<div class="agenda-empty">등록된 일정이 없습니다.</div>`}
        </div>`;
      }).join("")
    }</div>`;

    bindScheduleDelete();
  }

  function bindScheduleDelete(){
    $$("[data-delete-schedule]").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const id = btn.dataset.deleteSchedule;
        const schedule = state.schedules.find(s => s.id === id);
        if (!schedule) return;
        if (!confirm(`${schedule.complex}\n${schedule.category} (${schedule.start} ~ ${schedule.end})\n\n이 일정을 삭제할까요?`)) return;
        state.schedules = state.schedules.filter(s => s.id !== id);
        saveState();
        renderAll();
        showToast("일정이 삭제되었습니다.");
      });
    });
  }

  function shiftPeriod(delta){
    if (calendarMode === "month"){
      calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + delta, 1);
    }else if (calendarMode === "week"){
      calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), calendarDate.getDate() + delta * 7);
    }else{
      calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), calendarDate.getDate() + delta);
    }
    renderCalendar();
    renderKpis();
  }

  function filteredProjects(){
    const q = $("#projectSearch").value.trim().toLowerCase();
    const cat = $("#projectCategory").value;
    return state.projects.filter(p => {
      const current = currentStageOf(p);
      return (!q || p.name.toLowerCase().includes(q)) &&
             (!cat || current === cat);
    });
  }

  function renderProjects(){
    ensureProjectsFromSchedules();
    const projects = filteredProjects();
    $("#projectEmpty").hidden = projects.length !== 0;

    $("#projectCards").innerHTML = projects.map(project => {
      const progress = progressOf(project);
      const currentStage = currentStageOf(project);
      const schedules = state.schedules.filter(s => s.complex === project.name);
      const range = schedules.length
        ? `${schedules.map(s=>s.start).sort()[0]} ~ ${schedules.map(s=>s.end).sort().slice(-1)[0]}`
        : "등록 일정 없음";

      return `<article class="project-card" data-project-card="${project.id}">
        <div class="project-card-head">
          <div>
            <h3>${escapeHtml(project.name)}</h3>
            <p>${range} · 일정 ${schedules.length}건</p>
          </div>
          <button class="delete-link" data-delete-project="${project.id}">단지 삭제</button>
        </div>

        <div class="progress-section">
          <div class="progress-title">
            <span>${currentStage === "완료" ? '<span class="badge done">구축 완료</span>' : `<span class="badge doing">${escapeHtml(currentStage)}</span>`}</span>
            <strong>${progress}%</strong>
          </div>
          <div class="progress-bar"><i style="width:${progress}%"></i></div>
        </div>

        <div class="stage-list">
          ${STAGES.map((stage, index) => `
            <label class="stage-check">
              <input type="checkbox" data-stage-project="${project.id}" data-stage-index="${index}" ${project.completedStages[index] ? "checked" : ""}>
              <span>${index+1}. ${escapeHtml(stage)}</span>
            </label>
          `).join("")}
        </div>

        <div class="finance-box">
          <h4>재정 정보</h4>
          <div class="finance-grid">
            <label>
              공사비 입금
              <div class="money-input">
                <input type="number" min="0" step="1000" inputmode="numeric"
                       data-finance-project="${project.id}" data-finance-key="constructionPayment"
                       value="${project.finance.constructionPayment || 0}">
                <span>원</span>
              </div>
            </label>

            <label>
              프로그램 사용료 입금
              <div class="money-input">
                <input type="number" min="0" step="1000" inputmode="numeric"
                       data-finance-project="${project.id}" data-finance-key="programPayment"
                       value="${project.finance.programPayment || 0}">
                <span>원</span>
              </div>
            </label>

            <div class="tax-row">
              <span>세금계산서 발행완료</span>
              <label class="switch" aria-label="세금계산서 발행 여부">
                <input type="checkbox" data-tax-project="${project.id}" ${project.finance.taxInvoice ? "checked" : ""}>
                <i></i>
              </label>
            </div>
          </div>
          <div class="auto-save-note">
            합계 ${fmtWon(project.finance.constructionPayment + project.finance.programPayment)} · 자동 저장
          </div>
        </div>
      </article>`;
    }).join("");

    bindProjectInputs();
    renderKpis();
  }

  function bindProjectInputs(){
    $$("[data-stage-project]").forEach(input => {
      input.addEventListener("change", () => {
        const project = state.projects.find(p => p.id === input.dataset.stageProject);
        if (!project) return;
        project.completedStages[Number(input.dataset.stageIndex)] = input.checked;
        project.updatedAt = new Date().toISOString();
        saveState();
        renderProjects();
        showToast("진행상태가 저장되었습니다.");
      });
    });

    $$("[data-finance-project]").forEach(input => {
      const save = () => {
        const project = state.projects.find(p => p.id === input.dataset.financeProject);
        if (!project) return;
        project.finance[input.dataset.financeKey] = Math.max(0, Number(input.value) || 0);
        project.updatedAt = new Date().toISOString();
        saveState();
        const note = input.closest(".finance-box").querySelector(".auto-save-note");
        note.textContent = `합계 ${fmtWon(project.finance.constructionPayment + project.finance.programPayment)} · 자동 저장`;
      };
      input.addEventListener("input", save);
      input.addEventListener("change", () => {
        save();
        renderKpis();
        showToast("재정 정보가 저장되었습니다.");
      });
    });

    $$("[data-tax-project]").forEach(input => {
      input.addEventListener("change", () => {
        const project = state.projects.find(p => p.id === input.dataset.taxProject);
        if (!project) return;
        project.finance.taxInvoice = input.checked;
        project.updatedAt = new Date().toISOString();
        saveState();
        renderKpis();
        showToast("세금계산서 상태가 저장되었습니다.");
      });
    });

    $$("[data-delete-project]").forEach(btn => {
      btn.addEventListener("click", () => {
        const project = state.projects.find(p => p.id === btn.dataset.deleteProject);
        if (!project) return;
        const message = `${project.name}\n\n단지를 삭제하면 연결된 캘린더 일정과 해당 단지의 저장된 납품확인서도 함께 삭제됩니다.\n계속할까요?`;
        if (!confirm(message)) return;

        state.projects = state.projects.filter(p => p.id !== project.id);
        state.schedules = state.schedules.filter(s => s.complex !== project.name);
        saveState();

        const deliveries = getDeliveryList().filter(d => d.complex !== project.name);
        saveDeliveryList(deliveries);

        renderAll();
        populateComplexes();
        showToast("단지가 삭제되었습니다.");
      });
    });
  }

  function populateComplexes(){
    ensureProjectsFromSchedules();
    const select = $("#deliveryComplex");
    const current = select.value;
    const names = state.projects.map(p => p.name).sort((a,b) => a.localeCompare(b, "ko"));
    select.innerHTML = `<option value="">단지 선택</option>${names.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join("")}`;
    if (names.includes(current)) select.value = current;
  }

  function addDeliveryRow(data={}){
    const row = {
      item:data.item || "",
      spec:data.spec || "",
      unit:data.unit || "식",
      qty:Number(data.qty ?? 1),
      ok:data.ok !== false,
      note:data.note || ""
    };

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input data-k="item" value="${escapeHtml(row.item)}" placeholder="품목"></td>
      <td><input data-k="spec" value="${escapeHtml(row.spec)}" placeholder="규격"></td>
      <td><input data-k="unit" value="${escapeHtml(row.unit)}" placeholder="단위"></td>
      <td><input data-k="qty" type="number" min="0" value="${row.qty}"></td>
      <td class="check-cell"><input data-k="ok" type="checkbox" ${row.ok ? "checked" : ""}></td>
      <td><input data-k="note" value="${escapeHtml(row.note)}" placeholder="비고"></td>
      <td><button type="button" class="row-delete" aria-label="행 삭제">×</button></td>
    `;

    $("#deliveryItemsBody").appendChild(tr);
    $$("input", tr).forEach(input => input.addEventListener("input", renderDeliveryPreview));
    $("input[type='checkbox']", tr)?.addEventListener("change", renderDeliveryPreview);
    $(".row-delete", tr).addEventListener("click", () => {
      tr.remove();
      renderDeliveryPreview();
    });
    renderDeliveryPreview();
  }

  function getDeliveryItems(){
    return $$("#deliveryItemsBody tr").map(tr => {
      const obj = {};
      $$("input", tr).forEach(input => {
        obj[input.dataset.k] = input.type === "checkbox" ? input.checked : input.value;
      });
      return obj;
    });
  }

  function generateDeliveryRowsFromSchedules(){
    const complex = $("#deliveryComplex").value;
    if (!complex){
      showToast("먼저 단지를 선택해 주세요.");
      return;
    }

    const related = state.schedules
      .filter(s => s.complex === complex)
      .sort((a,b) => STAGES.indexOf(a.category) - STAGES.indexOf(b.category));

    const grouped = new Map();
    related.forEach(s => {
      if (!grouped.has(s.category)) grouped.set(s.category, []);
      grouped.get(s.category).push(s);
    });

    $("#deliveryItemsBody").innerHTML = "";

    if (!grouped.size){
      addDeliveryRow();
      showToast("등록된 일정이 없어 빈 품목을 생성했습니다.");
      return;
    }

    grouped.forEach((list, category) => {
      const starts = list.map(x => x.start).sort();
      const ends = list.map(x => x.end).sort();
      addDeliveryRow({
        item:category,
        spec:`${starts[0]} ~ ${ends[ends.length-1]}`,
        unit:"식",
        qty:1,
        ok:true,
        note:list.map(x => x.memo).filter(Boolean).join(" / ")
      });
    });

    showToast("일정 기준으로 납품 항목을 생성했습니다.");
  }

  function loadLatestDeliveryForComplex(complex){
    if (!complex) return false;
    const latest = getDeliveryList().find(d => d.complex === complex);
    if (!latest) return false;

    $("#deliveryDate").value = latest.date || iso(new Date());
    $("#confirmDept").value = latest.confirmDept || "";
    $("#confirmName").value = latest.confirmName || "";
    $("#confirmDate").value = latest.confirmDate || iso(new Date());

    $("#deliveryItemsBody").innerHTML = "";
    (latest.items || []).forEach(addDeliveryRow);
    if (!(latest.items || []).length) addDeliveryRow();

    $("#deliverySaveStatus").textContent = `최근 저장본 불러옴 · ${new Date(latest.savedAt).toLocaleString("ko-KR")}`;
    renderDeliveryPreview();
    return true;
  }

  function resetDeliveryForm(keepComplex=false){
    const complex = keepComplex ? $("#deliveryComplex").value : "";
    $("#deliveryForm").reset();
    $("#supplierName").value = "㈜링스온";
    $("#supplierCeo").value = "나이준 (직인생략)";
    $("#supplierAddress").value = "경기도 안양시 동안구 시민대로 181, 2층";
    $("#deliveryDate").value = iso(new Date());
    $("#confirmDate").value = iso(new Date());
    $("#deliveryItemsBody").innerHTML = "";
    if (keepComplex) $("#deliveryComplex").value = complex;
    addDeliveryRow();
    $("#deliverySaveStatus").textContent = "저장 전";
    renderDeliveryPreview();
  }

  function renderDeliveryPreview(){
    const complex = $("#deliveryComplex")?.value || "";
    const date = $("#deliveryDate")?.value || "";
    const items = getDeliveryItems();

    $("#deliveryPreview").innerHTML = `
      <h2 class="paper-title">납 품 확 인 서</h2>

      <table class="doc-info">
        <tr>
          <th>단 지 명</th>
          <td>${escapeHtml(complex || "-")}</td>
          <th>납품일자</th>
          <td>${escapeHtml(date || "-")}</td>
        </tr>
      </table>

      <h3 class="doc-section-title">납 품 내 역</h3>
      <table class="doc-table">
        <thead>
          <tr>
            <th>품목</th>
            <th>규격</th>
            <th>단위</th>
            <th>수량</th>
            <th>확인</th>
            <th>비고</th>
          </tr>
        </thead>
        <tbody>
          ${items.length ? items.map(item => `
            <tr>
              <td>${escapeHtml(item.item || "-")}</td>
              <td>${escapeHtml(item.spec || "-")}</td>
              <td>${escapeHtml(item.unit || "-")}</td>
              <td>${escapeHtml(item.qty || "0")}</td>
              <td>${item.ok ? "확인" : "-"}</td>
              <td>${escapeHtml(item.note || "")}</td>
            </tr>
          `).join("") : `<tr><td colspan="6">납품 항목 없음</td></tr>`}
        </tbody>
      </table>

      <div class="doc-confirm">
        상기와 같이 납품되었음을 확인합니다.
      </div>

      <div class="doc-sign">
        확인자 : ${escapeHtml($("#confirmDept")?.value || "")}
        &nbsp;&nbsp; ${escapeHtml($("#confirmName")?.value || "")}
        &nbsp;&nbsp; (서명)<br>
        확인일 : ${escapeHtml($("#confirmDate")?.value || "")}
      </div>

      <div class="doc-supplier">
        <strong>공 급 자</strong><br>
        상호 : ${escapeHtml($("#supplierName")?.value || "㈜링스온")}<br>
        대표이사 : ${escapeHtml($("#supplierCeo")?.value || "나이준 (직인생략)")}<br>
        주소 : ${escapeHtml($("#supplierAddress")?.value || "경기도 안양시 동안구 시민대로 181, 2층")}
      </div>
    `;
  }

  function saveDelivery(){
    const complex = $("#deliveryComplex").value;
    if (!complex){
      showToast("단지를 선택해 주세요.");
      return;
    }

    const payload = {
      id:uid("delivery"),
      complex,
      date:$("#deliveryDate").value,
      supplierName:$("#supplierName").value,
      supplierCeo:$("#supplierCeo").value,
      supplierAddress:$("#supplierAddress").value,
      confirmDept:$("#confirmDept").value,
      confirmName:$("#confirmName").value,
      confirmDate:$("#confirmDate").value,
      items:getDeliveryItems(),
      savedAt:new Date().toISOString()
    };

    const list = getDeliveryList();
    list.unshift(payload);
    saveDeliveryList(list);

    $("#deliverySaveStatus").textContent = `저장 완료 · ${new Date(payload.savedAt).toLocaleString("ko-KR")}`;
    showToast("납품확인서를 저장했습니다.");
  }

  function printDelivery(){
    renderDeliveryPreview();
    const html = $("#deliveryPreview").innerHTML;
    const win = window.open("", "_blank", "width=950,height=1100");
    if (!win){
      showToast("팝업 차단을 해제해 주세요.");
      return;
    }

    win.document.write(`<!doctype html>
    <html lang="ko">
    <head>
      <meta charset="utf-8">
      <title>납품확인서</title>
      <style>
        *{box-sizing:border-box}
        body{margin:0;color:#111;font-family:"Noto Sans KR",Arial,sans-serif}
        .paper{width:210mm;min-height:297mm;padding:20mm 17mm;margin:0 auto}
        .paper-title{text-align:center;font-size:26px;letter-spacing:.36em;margin:0 0 22mm;font-weight:800}
        .doc-info{width:100%;border-collapse:collapse;margin-bottom:16mm}
        .doc-info th,.doc-info td{border:1px solid #555;padding:8px;font-size:11px}
        .doc-info th{width:18%;background:#f3f3f3;text-align:center}
        .doc-section-title{font-size:13px;font-weight:800;border-bottom:2px solid #111;padding-bottom:5px;margin:0 0 7px}
        .doc-table{width:100%;border-collapse:collapse}
        .doc-table th,.doc-table td{border:1px solid #666;padding:7px;font-size:10px;text-align:center}
        .doc-table th{background:#f4f4f4}
        .doc-confirm{margin-top:20mm;font-size:11px;line-height:2}
        .doc-sign{text-align:right;margin-top:16mm;font-size:11px;line-height:2}
        .doc-supplier{margin-top:20mm;padding-top:8px;border-top:1px solid #aaa;font-size:11px;line-height:1.9}
        @page{size:A4;margin:0}
      </style>
    </head>
    <body><div class="paper">${html}</div>
    <script>window.onload=()=>window.print();<\/script>
    </body></html>`);
    win.document.close();
  }

  function renderAll(){
    renderKpis();
    renderCalendar();
    renderProjects();
    populateComplexes();
    renderDeliveryPreview();
  }

  function init(){
    ensureProjectsFromSchedules();
    renderIcons();

    $("#todayChip").textContent =
      new Intl.DateTimeFormat("ko-KR",{year:"numeric",month:"long",day:"numeric",weekday:"short"}).format(new Date());

    STAGES.forEach(stage => {
      $("#calendarCategory").insertAdjacentHTML("beforeend", `<option value="${escapeHtml(stage)}">${escapeHtml(stage)}</option>`);
      $("#scheduleCategory").insertAdjacentHTML("beforeend", `<option value="${escapeHtml(stage)}">${escapeHtml(stage)}</option>`);
      $("#projectCategory").insertAdjacentHTML("beforeend", `<option value="${escapeHtml(stage)}">${escapeHtml(stage)}</option>`);
    });
    $("#projectCategory").insertAdjacentHTML("beforeend", `<option value="완료">완료</option>`);

    $("#scheduleStart").value = iso(new Date());
    $("#scheduleEnd").value = iso(new Date());
    $("#deliveryDate").value = iso(new Date());
    $("#confirmDate").value = iso(new Date());

    $$(".nav-item").forEach(btn => btn.addEventListener("click", () => switchView(btn.dataset.view)));

    $("#mobileMenu").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
    document.addEventListener("click", e => {
      if (innerWidth <= 780 &&
          $("#sidebar").classList.contains("open") &&
          !e.target.closest("#sidebar") &&
          !e.target.closest("#mobileMenu")){
        $("#sidebar").classList.remove("open");
      }
    });

    $("#prevPeriod").addEventListener("click", () => shiftPeriod(-1));
    $("#nextPeriod").addEventListener("click", () => shiftPeriod(1));
    $("#goToday").addEventListener("click", () => {
      calendarDate = new Date();
      renderCalendar();
      renderKpis();
    });

    $$(".view-switch button").forEach(btn => {
      btn.addEventListener("click", () => {
        calendarMode = btn.dataset.mode;
        $$(".view-switch button").forEach(b => b.classList.toggle("is-active", b === btn));
        renderCalendar();
      });
    });

    $("#calendarSearch").addEventListener("input", renderCalendar);
    $("#calendarCategory").addEventListener("change", renderCalendar);
    $("#resetCalendarFilter").addEventListener("click", () => {
      $("#calendarSearch").value = "";
      $("#calendarCategory").value = "";
      renderCalendar();
    });

    const scheduleModal = $("#scheduleModal");
    $("#openScheduleModal").addEventListener("click", () => {
      $("#scheduleStart").value = iso(new Date());
      $("#scheduleEnd").value = iso(new Date());
      scheduleModal.hidden = false;
      setTimeout(() => $("#scheduleComplex").focus(), 0);
    });
    $("#closeScheduleModal").addEventListener("click", () => scheduleModal.hidden = true);
    $("#cancelSchedule").addEventListener("click", () => scheduleModal.hidden = true);
    scheduleModal.addEventListener("click", e => {
      if (e.target === scheduleModal) scheduleModal.hidden = true;
    });

    $("#scheduleForm").addEventListener("submit", e => {
      e.preventDefault();
      const complex = $("#scheduleComplex").value.trim();
      const category = $("#scheduleCategory").value;
      const start = $("#scheduleStart").value;
      const end = $("#scheduleEnd").value;
      const memo = $("#scheduleMemo").value.trim();

      if (!complex){
        showToast("단지명을 입력해 주세요.");
        return;
      }
      if (parseDate(end) < parseDate(start)){
        showToast("종료일은 시작일 이후여야 합니다.");
        return;
      }

      state.schedules.push({ id:uid("s"), complex, category, start, end, memo });
      ensureProject(complex);
      saveState();

      e.target.reset();
      $("#scheduleStart").value = iso(new Date());
      $("#scheduleEnd").value = iso(new Date());
      $("#scheduleCategory").value = STAGES[0];
      scheduleModal.hidden = true;

      renderAll();
      showToast("일정과 단지 정보가 등록되었습니다.");
    });

    $("#projectSearch").addEventListener("input", renderProjects);
    $("#projectCategory").addEventListener("change", renderProjects);

    $("#deliveryComplex").addEventListener("change", () => {
      const complex = $("#deliveryComplex").value;
      $("#deliveryItemsBody").innerHTML = "";
      $("#deliverySaveStatus").textContent = "저장 전";

      if (!complex){
        addDeliveryRow();
        renderDeliveryPreview();
        return;
      }

      if (!loadLatestDeliveryForComplex(complex)){
        generateDeliveryRowsFromSchedules();
      }
    });

    $("#addDeliveryRow").addEventListener("click", () => addDeliveryRow());
    $("#generateDeliveryRows").addEventListener("click", generateDeliveryRowsFromSchedules);
    $("#saveDelivery").addEventListener("click", saveDelivery);
    $("#resetDelivery").addEventListener("click", () => {
      resetDeliveryForm(false);
      showToast("납품확인서를 초기화했습니다.");
    });
    $("#printDelivery").addEventListener("click", printDelivery);

    ["deliveryDate","confirmDept","confirmName","confirmDate"].forEach(id => {
      $("#" + id).addEventListener("input", renderDeliveryPreview);
      $("#" + id).addEventListener("change", renderDeliveryPreview);
    });

    document.addEventListener("keydown", e => {
      if (e.key === "Escape") scheduleModal.hidden = true;
    });

    addDeliveryRow();
    renderAll();
  }

  init();
})();

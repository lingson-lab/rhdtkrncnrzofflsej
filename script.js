// ===== 데이터 =====
const categories = {
  inbound: { name: '인바운드 인입', color: '#0300ce', textColor: '#fff' },
  intro: { name: '소개서 전달', color: '#2563eb', textColor: '#fff' },
  contract_delivery: { name: '계약서 전달', color: '#06b6d4', textColor: '#fff' },
  contract_send: { name: '계약서 송부', color: '#8b5cf6', textColor: '#fff' },
  terminal_work: { name: '단말기 공사', color: '#dc2626', textColor: '#fff' },
  linkage: { name: '연동 진행', color: '#16a34a', textColor: '#fff' }
};

let currentDate = new Date(2026, 8, 1);
let events = [];
let complexes = {};
let currentView = 'month';

// 초기화
function init() {
  loadData();
  renderCategoryList();
  renderCalendar();
  updateComplexList();
  updateFinancialList();
  updateDeliveryComplexList();
}

// ===== 데이터 저장/로드 =====
function saveData() {
  localStorage.setItem('events', JSON.stringify(events));
  localStorage.setItem('complexes', JSON.stringify(complexes));
}

function loadData() {
  const savedEvents = localStorage.getItem('events');
  const savedComplexes = localStorage.getItem('complexes');
  
  if (savedEvents) events = JSON.parse(savedEvents);
  if (savedComplexes) complexes = JSON.parse(savedComplexes);
}

// ===== 메인 탭 전환 =====
function switchMainTab(tab) {
  document.querySelectorAll('.main-tab-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  
  const tabMap = {
    'calendar': 'calendarTab',
    'detail': 'detailTab',
    'financial': 'financialTab',
    'delivery': 'deliveryTab'
  };
  
  const tabId = tabMap[tab];
  if (tabId) {
    document.getElementById(tabId).classList.add('active');
    if (tab === 'detail') updateComplexList();
    if (tab === 'financial') updateFinancialList();
    if (tab === 'delivery') updateDeliveryComplexList();
  }
}

// ===== 카테고리 =====
function renderCategoryList() {
  const list = document.getElementById('categoryList');
  list.innerHTML = Object.entries(categories).map(([key, cat]) => `
    <div class="category-item">
      <div class="category-dot" style="background-color: ${cat.color}"></div>
      <span>${cat.name}</span>
    </div>
  `).join('');
}

// ===== 캘린더 =====
function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let html = '';
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  dayNames.forEach(day => html += `<div class="day-header">${day}</div>`);

  for (let i = 0; i < firstDay; i++) {
    html += `<div class="day-cell empty"></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayEvents = getEventsForDay(day);
    let eventHtml = '';
    dayEvents.forEach(event => {
      const cat = categories[event.category];
      eventHtml += `
        <div class="event-badge" style="background-color: ${cat.color}; color: ${cat.textColor}" title="${event.complexName}">
          ${cat.name}
        </div>
      `;
    });

    html += `
      <div class="day-cell">
        <div class="day-number">${day}</div>
        <div class="events-list">${eventHtml}</div>
      </div>
    `;
  }

  document.getElementById('monthView').innerHTML = html;
  updateTitle();
}

function renderWeekView() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const dayOfWeek = new Date(year, month, 1).getDay();
  const firstDate = new Date(year, month, 1);
  const weekStart = new Date(firstDate);
  weekStart.setDate(firstDate.getDate() - dayOfWeek);

  let html = '';
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const day = date.getDate();
    const dayEvents = getEventsForDay(day);

    let eventHtml = '';
    dayEvents.forEach(event => {
      const cat = categories[event.category];
      eventHtml += `
        <div class="event-badge" style="background-color: ${cat.color}; color: ${cat.textColor}; margin-bottom: 0.3rem">
          ${cat.name}
        </div>
      `;
    });

    html += `
      <div class="week-cell">
        <div class="day-number">${dayNames[date.getDay()]} ${day}</div>
        <div class="events-list" style="margin-top: 0.3rem">${eventHtml}</div>
      </div>
    `;
  }

  document.getElementById('weekView').innerHTML = html;
}

function renderDayView() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const day = currentDate.getDate();
  const dayEvents = getEventsForDay(day);

  const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const dayName = dayNames[currentDate.getDay()];

  let eventHtml = '';
  if (dayEvents.length === 0) {
    eventHtml = `<div style="text-align: center; color: #9ca3af; padding: 2rem;">예정된 일정이 없습니다.</div>`;
  } else {
    dayEvents.forEach(event => {
      const cat = categories[event.category];
      eventHtml += `
        <div class="day-event-box" style="background-color: ${cat.color}; color: ${cat.textColor}">
          ${event.complexName} - ${cat.name} (${event.duration}일간)
        </div>
      `;
    });
  }

  document.getElementById('dayView').innerHTML = `
    <h2>${year}년 ${month + 1}월 ${day}일</h2>
    <div class="day-info">${dayName}</div>
    <div class="day-events">${eventHtml}</div>
  `;
}

function switchView(view) {
  currentView = view;
  
  document.querySelectorAll('.view-tab-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');

  document.getElementById('monthView').classList.add('hidden');
  document.getElementById('weekView').classList.add('hidden');
  document.getElementById('dayView').classList.add('hidden');

  if (view === 'month') {
    renderCalendar();
    document.getElementById('monthView').classList.remove('hidden');
  } else if (view === 'week') {
    renderWeekView();
    document.getElementById('weekView').classList.remove('hidden');
  } else if (view === 'day') {
    renderDayView();
    document.getElementById('dayView').classList.remove('hidden');
  }
}

function getEventsForDay(day) {
  return events.filter(event => {
    if (event.month !== currentDate.getMonth() || event.year !== currentDate.getFullYear()) {
      return false;
    }
    return day >= event.startDay && day < event.startDay + event.duration;
  });
}

function prevMonth() {
  currentDate.setMonth(currentDate.getMonth() - 1);
  if (currentView === 'month') renderCalendar();
  else if (currentView === 'week') renderWeekView();
  else renderDayView();
}

function nextMonth() {
  currentDate.setMonth(currentDate.getMonth() + 1);
  if (currentView === 'month') renderCalendar();
  else if (currentView === 'week') renderWeekView();
  else renderDayView();
}

function updateTitle() {
  document.getElementById('monthTitle').textContent = 
    `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`;
}

// ===== 이벤트 추가 =====
function addEvent(e) {
  e.preventDefault();
  
  const complexName = document.getElementById('complexName').value;
  const category = document.getElementById('categorySelect').value;
  const startDay = parseInt(document.getElementById('startDay').value);
  const duration = parseInt(document.getElementById('duration').value);

  const newEvent = {
    id: Date.now(),
    complexName,
    category,
    startDay,
    duration,
    month: currentDate.getMonth(),
    year: currentDate.getFullYear()
  };

  events.push(newEvent);
  
  if (!complexes[complexName]) {
    complexes[complexName] = {
      name: complexName,
      events: [],
      finances: {
        constructionCost: 0,
        programUsage: 0,
        taxInvoice: false
      },
      delivery: {}
    };
  }
  
  if (!complexes[complexName].events.includes(category)) {
    complexes[complexName].events.push(category);
  }

  saveData();
  renderEventList();
  if (currentView === 'month') renderCalendar();
  else if (currentView === 'week') renderWeekView();
  else renderDayView();

  document.getElementById('complexName').value = '';
  document.getElementById('categorySelect').value = 'inbound';
  document.getElementById('startDay').value = 1;
  document.getElementById('duration').value = 3;
}

function renderEventList() {
  const section = document.getElementById('eventListSection');
  const list = document.getElementById('eventList');

  if (events.length === 0) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');

  let html = '';
  events.forEach(event => {
    const cat = categories[event.category];
    html += `
      <div class="event-item" style="border-left-color: ${cat.color}; background-color: ${cat.color}22">
        <div class="event-item-text">
          <strong>${event.complexName}</strong><br>
          <span>${cat.name} (${event.startDay}일, ${event.duration}일)</span>
        </div>
        <button class="delete-btn" onclick="deleteEvent(${event.id})">✕</button>
      </div>
    `;
  });

  list.innerHTML = html;
}

function deleteEvent(id) {
  events = events.filter(e => e.id !== id);
  saveData();
  renderEventList();
  if (currentView === 'month') renderCalendar();
  else if (currentView === 'week') renderWeekView();
  else renderDayView();
}

// ===== 상세 관리 =====
function updateComplexList() {
  const list = document.getElementById('complexList');
  
  if (Object.keys(complexes).length === 0) {
    list.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 2rem;">등록된 단지가 없습니다.</p>';
    return;
  }

  renderComplexCards(Object.values(complexes), list);
}

function filterComplexes() {
  const searchName = document.getElementById('filterComplex').value.toLowerCase();
  const searchCategory = document.getElementById('filterCategory').value;
  
  const filtered = Object.entries(complexes).filter(([name, data]) => {
    const nameMatch = name.toLowerCase().includes(searchName);
    const categoryMatch = !searchCategory || data.events.includes(searchCategory);
    return nameMatch && categoryMatch;
  });

  const list = document.getElementById('complexList');
  
  if (filtered.length === 0) {
    list.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 2rem;">검색 결과가 없습니다.</p>';
    return;
  }

  renderComplexCards(filtered.map(([_, data]) => data), list);
}

function renderComplexCards(complexList, container) {
  let html = '';
  
  complexList.forEach(data => {
    const progressPercent = (data.events.length / 6) * 100;
    
    html += `
      <div class="complex-card">
        <h4>${data.name}</h4>
        
        <div class="info-item">
          <div class="info-label">진행 단계</div>
          <div class="info-value">${data.events.length} / 6</div>
        </div>

        <div class="progress-item">
          <div class="progress-label">진행률</div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progressPercent}%"></div>
          </div>
        </div>

        <div class="info-item">
          <div class="info-label">완료 단계</div>
          <div class="info-value" style="display: flex; flex-wrap: wrap; gap: 0.25rem; grid-column: 1 / -1;">
            ${data.events.map(e => `
              <span style="display: inline-block; padding: 0.2rem 0.5rem; background: ${categories[e].color}; color: ${categories[e].textColor}; border-radius: 3px; font-size: 0.7rem; font-weight: 600;">
                ${categories[e].name}
              </span>
            `).join('')}
          </div>
        </div>

        <div class="financial-section">
          <h5>💰 재정 정보</h5>
          <div class="financial-fields">
            <div class="financial-field">
              <label>공사비 입금</label>
              <input type="number" placeholder="금액" value="${data.finances.constructionCost || 0}" 
                onchange="updateFinance('${data.name}', 'constructionCost', this.value)">
            </div>
            <div class="financial-field">
              <label>프로그램 사용료</label>
              <input type="number" placeholder="금액" value="${data.finances.programUsage || 0}" 
                onchange="updateFinance('${data.name}', 'programUsage', this.value)">
            </div>
            <div class="financial-field">
              <label style="flex: 1;">세금계산서 발행</label>
              <div class="checkbox-group">
                <input type="checkbox" id="tax_${data.name}" ${data.finances.taxInvoice ? 'checked' : ''} 
                  onchange="updateFinance('${data.name}', 'taxInvoice', this.checked)">
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function updateFinance(complexName, field, value) {
  if (!complexes[complexName]) return;
  
  if (field === 'taxInvoice') {
    complexes[complexName].finances[field] = value;
  } else {
    complexes[complexName].finances[field] = parseInt(value) || 0;
  }
  
  saveData();
}

// ===== 입금 탭 =====
function updateFinancialList() {
  const list = document.getElementById('financialList');
  
  if (Object.keys(complexes).length === 0) {
    list.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 2rem;">등록된 단지가 없습니다.</p>';
    return;
  }

  let html = '';
  Object.entries(complexes).forEach(([name, data]) => {
    const totalIncome = (data.finances.constructionCost || 0) + (data.finances.programUsage || 0);
    
    html += `
      <div class="financial-card">
        <h4>${name}</h4>
        <div class="financial-info">
          <div class="fin-item">
            <div class="fin-label">공사비 입금</div>
            <div class="fin-value">₩ ${(data.finances.constructionCost || 0).toLocaleString()}</div>
          </div>
          <div class="fin-item">
            <div class="fin-label">프로그램 사용료</div>
            <div class="fin-value">₩ ${(data.finances.programUsage || 0).toLocaleString()}</div>
          </div>
          <div class="fin-item">
            <div class="fin-label">총 입금액</div>
            <div class="fin-value" style="color: #0300ce;">₩ ${totalIncome.toLocaleString()}</div>
          </div>
          <div class="fin-item">
            <div class="fin-label">세금계산서</div>
            <div class="fin-value">${data.finances.taxInvoice ? '✅ 발행완료' : '❌ 미발행'}</div>
          </div>
        </div>
      </div>
    `;
  });

  list.innerHTML = html;
}

// ===== 납품확인서 =====
function updateDeliveryComplexList() {
  const select = document.getElementById('deliveryComplexSelect');
  select.innerHTML = '<option value="">납품확인서를 작성할 단지를 선택하세요</option>';
  
  Object.keys(complexes).forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });
}

function loadDeliveryForm() {
  const complexName = document.getElementById('deliveryComplexSelect').value;
  
  if (!complexName) {
    document.getElementById('deliveryForm').classList.add('hidden');
    return;
  }

  document.getElementById('deliveryForm').classList.remove('hidden');
  document.getElementById('delComplexName').value = complexName;

  document.getElementById('delCompanyName').value = '㈜링스온';
  document.getElementById('delCEO').value = '나이준 (직인생략)';
  document.getElementById('delAddress').value = '경기도 안양시 동안구 시민대로 181, 2층';

  renderDeliveryItems(complexName);

  if (complexes[complexName].delivery) {
    document.getElementById('delDeliveryDate').value = complexes[complexName].delivery.date || '';
    document.getElementById('delAgreedName').value = complexes[complexName].delivery.agreedName || '';
    document.getElementById('delAgreedTitle').value = complexes[complexName].delivery.agreedTitle || '';
    document.getElementById('delAgreedDate').value = complexes[complexName].delivery.agreedDate || '';
  }
}

function renderDeliveryItems(complexName) {
  const tbody = document.getElementById('deliveryItems');
  tbody.innerHTML = '';

  const items = [
    { name: '웹캠', spec: '', unit: 'EA', quantity: 1 },
    { name: '타겟체어전문', spec: '', unit: 'EA', quantity: 1 },
    { name: '타겟체어통장', spec: 'iot제어', unit: 'EA', quantity: 4 },
    { name: '타겟체어프로그램', spec: '', unit: 'EA', quantity: 1 },
    { name: '설치 및 교육', spec: '장자재 포함', unit: '식', quantity: 1 }
  ];

  items.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><input type="text" value="${item.name}" style="border: none; width: 100%;"></td>
      <td><input type="text" value="${item.spec}" style="border: none; width: 100%;"></td>
      <td><input type="text" value="${item.unit}" style="border: none; width: 100%;"></td>
      <td><input type="number" value="${item.quantity}" style="border: none; width: 100%;"></td>
      <td><input type="checkbox" style="width: auto;"></td>
      <td><input type="text" placeholder="비고" style="border: none; width: 100%;"></td>
    `;
    tbody.appendChild(row);
  });
}

function saveDeliveryForm(e) {
  e.preventDefault();

  const complexName = document.getElementById('deliveryComplexSelect').value;
  
  if (!complexName) {
    alert('단지를 선택해주세요');
    return;
  }

  complexes[complexName].delivery = {
    date: document.getElementById('delDeliveryDate').value,
    agreedName: document.getElementById('delAgreedName').value,
    agreedTitle: document.getElementById('delAgreedTitle').value,
    agreedDate: document.getElementById('delAgreedDate').value
  };

  saveData();
  alert('납품확인서가 저장되었습니다!');
}

// 시작
window.onload = init;

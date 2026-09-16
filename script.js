// 데이터
const categories = {
  inbound: { name: '인바운드 인입', color: '#0300ce', textColor: '#fff' },
  intro: { name: '소개서 전달', color: '#2563eb', textColor: '#fff' },
  contract_delivery: { name: '계약서 전달', color: '#ff9500', textColor: '#fff' },
  contract_send: { name: '계약서 송부', color: '#fbbf24', textColor: '#000' },
  terminal_work: { name: '단말기 공사', color: '#dc2626', textColor: '#fff' },
  linkage: { name: '연동 진행', color: '#16a34a', textColor: '#fff' }
};

let currentDate = new Date(2026, 8, 1);
let events = [];
let currentView = 'month';

// 초기화
function init() {
  renderCategoryList();
  renderCalendar();
}

// 카테고리 목록 렌더링
function renderCategoryList() {
  const list = document.getElementById('categoryList');
  list.innerHTML = Object.entries(categories).map(([key, cat]) => `
    <div class="category-item">
      <div class="category-dot" style="background-color: ${cat.color}"></div>
      <span>${cat.name}</span>
    </div>
  `).join('');
}

// 월간 뷰 렌더링
function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let html = '';
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  // 요일 헤더
  dayNames.forEach(day => {
    html += `<div class="day-header">${day}</div>`;
  });

  // 빈 칸
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="day-cell empty"></div>`;
  }

  // 날짜
  for (let day = 1; day <= daysInMonth; day++) {
    const dayEvents = getEventsForDay(day);
    let eventHtml = '';
    dayEvents.forEach(event => {
      const cat = categories[event.category];
      eventHtml += `
        <div class="event-badge" style="background-color: ${cat.color}; color: ${cat.textColor}">
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

// 주간 뷰 렌더링
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
    const isCurrentMonth = date.getMonth() === month;
    const dayEvents = getEventsForDay(day);

    let eventHtml = '';
    dayEvents.forEach(event => {
      const cat = categories[event.category];
      eventHtml += `
        <div class="event-badge" style="background-color: ${cat.color}; color: ${cat.textColor}; margin-bottom: 0.5rem">
          ${cat.name}
        </div>
      `;
    });

    html += `
      <div class="week-cell ${!isCurrentMonth ? 'other-month' : ''}">
        <div class="day-number">${dayNames[date.getDay()]} ${day}</div>
        <div class="events-list" style="margin-top: 0.5rem">${eventHtml}</div>
      </div>
    `;
  }

  document.getElementById('weekView').innerHTML = html;
}

// 일일 뷰 렌더링
function renderDayView() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const day = currentDate.getDate();
  const dayEvents = getEventsForDay(day);

  const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const dayName = dayNames[currentDate.getDay()];

  let eventHtml = '';
  if (dayEvents.length === 0) {
    eventHtml = `<div class="no-events">예정된 일정이 없습니다.</div>`;
  } else {
    dayEvents.forEach(event => {
      const cat = categories[event.category];
      eventHtml += `
        <div class="day-event-box" style="background-color: ${cat.color}; color: ${cat.textColor}">
          ${cat.name} <span style="font-size: 0.9rem; opacity: 0.9;">(${event.duration}일간)</span>
        </div>
      `;
    });
  }

  const html = `
    <h2>${year}년 ${month + 1}월 ${day}일</h2>
    <div class="day-info">${dayName}</div>
    <div class="day-events">${eventHtml}</div>
  `;

  document.getElementById('dayView').innerHTML = html;
}

// 뷰 전환
function switchView(view) {
  currentView = view;
  
  // 탭 활성화
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');

  // 뷰 표시
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

// 해당 날에 해당하는 이벤트 가져오기
function getEventsForDay(day) {
  return events.filter(event => {
    if (event.month !== currentDate.getMonth() || event.year !== currentDate.getFullYear()) {
      return false;
    }
    return day >= event.startDay && day < event.startDay + event.duration;
  });
}

// 이전 달
function prevMonth() {
  currentDate.setMonth(currentDate.getMonth() - 1);
  if (currentView === 'month') renderCalendar();
  else if (currentView === 'week') renderWeekView();
  else renderDayView();
}

// 다음 달
function nextMonth() {
  currentDate.setMonth(currentDate.getMonth() + 1);
  if (currentView === 'month') renderCalendar();
  else if (currentView === 'week') renderWeekView();
  else renderDayView();
}

// 제목 업데이트
function updateTitle() {
  document.getElementById('monthTitle').textContent = 
    `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`;
}

// 이벤트 추가
function addEvent(e) {
  e.preventDefault();
  
  const category = document.getElementById('categorySelect').value;
  const startDay = parseInt(document.getElementById('startDay').value);
  const duration = parseInt(document.getElementById('duration').value);

  const newEvent = {
    id: Date.now(),
    category,
    startDay,
    duration,
    month: currentDate.getMonth(),
    year: currentDate.getFullYear()
  };

  events.push(newEvent);
  renderEventList();
  if (currentView === 'month') renderCalendar();
  else if (currentView === 'week') renderWeekView();
  else renderDayView();

  // 폼 초기화
  document.getElementById('categorySelect').value = 'inbound';
  document.getElementById('startDay').value = 1;
  document.getElementById('duration').value = 3;
}

// 이벤트 목록 렌더링
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
          <span>${cat.name}</span>
          <span style="font-size: 0.75rem; opacity: 0.7;">(${event.startDay}일, ${event.duration}일)</span>
        </div>
        <button class="delete-btn" onclick="deleteEvent(${event.id})">✕</button>
      </div>
    `;
  });

  list.innerHTML = html;
}

// 이벤트 삭제
function deleteEvent(id) {
  events = events.filter(e => e.id !== id);
  renderEventList();
  if (currentView === 'month') renderCalendar();
  else if (currentView === 'week') renderWeekView();
  else renderDayView();
}

// 시작
window.onload = init;

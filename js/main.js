// ─── 데이터 저장소 (localStorage) ───
const DB = {
  get(key) { return JSON.parse(localStorage.getItem(`mm_${key}`)) || null; },
  set(key, val) { localStorage.setItem(`mm_${key}`, JSON.stringify(val)); },
};

function initData() {
  if (!DB.get('mentors')) {
    DB.set('mentors', [
      { id: 'm001', name: '마법의눈사람', company: '사람인', major: 'HRM HRD', career: '15년차', fields: ['멘토링/코칭', '이직준비', '취업준비'], availableTimes: ['월 19:00', '수 19:00', '금 19:00'], bio: '인사/HRD 분야 15년 경력. 커리어 상담과 코칭을 전문으로 합니다.', topic: '멘토링/코칭', status: 'active', counselCount: 418, portfolioCount: 273, rating: 4.9 },
      { id: 'm002', name: '잠만보', company: '중앙일보 주식회사', major: 'PM, 서비스기획', career: '10년차', fields: ['서비스기획', 'PM', '포폴작성'], availableTimes: ['화 14:00', '목 14:00', '토 10:00'], bio: 'PM/서비스기획자로 일하는 방법과 포트폴리오 작성 팁을 공유합니다.', topic: '서비스기획', status: 'active', counselCount: 131, portfolioCount: 126, rating: 4.7 },
      { id: 'm003', name: '코드마스터', company: '네이버', major: '프론트엔드 개발', career: '8년차', fields: ['웹개발', '프론트엔드', 'React'], availableTimes: ['월 19:00', '목 18:00', '금 15:00'], bio: '프론트엔드 개발 8년차. React, TypeScript 전문입니다.', topic: '웹개발', status: 'active', counselCount: 256, portfolioCount: 89, rating: 4.8 },
      { id: 'm004', name: '데이터독', company: '카카오', major: '데이터분석', career: '6년차', fields: ['데이터분석', '머신러닝', 'Python'], availableTimes: ['화 14:00', '목 18:00', '금 19:00'], bio: '데이터 분석과 ML 파이프라인 구축 경험을 나눕니다.', topic: '데이터분석', status: 'active', counselCount: 178, portfolioCount: 45, rating: 4.6 },
      { id: 'm005', name: '클라우드킹', company: 'AWS', major: '클라우드 아키텍트', career: '12년차', fields: ['클라우드', '백엔드', 'DevOps'], availableTimes: ['수 19:00', '금 15:00', '토 10:00'], bio: 'AWS 기반 클라우드 아키텍처 설계 전문가입니다.', topic: '클라우드', status: 'active', counselCount: 312, portfolioCount: 67, rating: 4.9 },
    ]);
  }
  if (!DB.get('applications')) DB.set('applications', []);
  if (!DB.get('records')) DB.set('records', []);
}

// ─── 초기화 ───
document.addEventListener('DOMContentLoaded', () => {
  initData();
  loadPopularMentors();
  loadMentorList();
  loadChatContent('received');
});

// ─── 페이지 전환 ───
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const navMap = { home: 0, search: 1, register: 2, chat: 3 };
  document.querySelectorAll('.nav-link')[navMap[page]]?.classList.add('active');
  if (page === 'search') loadMentorList();
  if (page === 'chat') loadChatContent('received');
  window.scrollTo(0, 0);
}
window.showPage = showPage;

function toggleMenu() {
  const nav = document.querySelector('.nav-menu');
  nav.style.display = nav.style.display === 'flex' ? 'none' : 'flex';
}
window.toggleMenu = toggleMenu;

// ─── 홈: 인기 멘토 ───
function loadPopularMentors() {
  const mentors = DB.get('mentors').sort((a, b) => b.counselCount - a.counselCount).slice(0, 4);
  const container = document.getElementById('popular-mentors');
  container.innerHTML = mentors.map(m => `
    <div class="mentor-card" onclick="showPage('search')">
      <div class="mentor-card-header">
        <div class="mentor-avatar">👤</div>
        <div class="mentor-info">
          <h3>${m.name}</h3>
          <p>${m.company} · ${m.major} ${m.career}</p>
        </div>
      </div>
      <div class="mentor-card-topic">${m.topic}</div>
      <div class="mentor-card-stats">
        <span class="stat-link">커리어상담 ${m.counselCount}건</span>
        <span class="stat-link">자소서·포폴 ${m.portfolioCount}건</span>
      </div>
    </div>
  `).join('');
}

// ─── 멘토 찾기 ───
function loadMentorList(filterField) {
  let mentors = DB.get('mentors');
  const query = document.getElementById('search-input')?.value?.toLowerCase() || '';

  if (query) {
    mentors = mentors.filter(m =>
      m.name.toLowerCase().includes(query) ||
      m.fields.some(f => f.toLowerCase().includes(query)) ||
      m.major.toLowerCase().includes(query)
    );
  }

  if (filterField) {
    mentors = mentors.filter(m => m.fields.some(f => f.includes(filterField)));
  }

  const sort = document.getElementById('sort-select')?.value || 'popular';
  if (sort === 'popular') mentors.sort((a, b) => b.counselCount - a.counselCount);
  else if (sort === 'rating') mentors.sort((a, b) => b.rating - a.rating);
  else mentors.sort((a, b) => b.counselCount - a.counselCount);

  document.getElementById('search-count').textContent = `총 ${mentors.length}건`;

  const container = document.getElementById('mentor-list');
  if (!mentors.length) {
    container.innerHTML = '<div class="empty">검색 결과가 없습니다.</div>';
    return;
  }

  container.innerHTML = mentors.map(m => `
    <div class="mentor-list-item">
      <div class="response-badge">💬 응답률이 높아요</div>
      <div class="mentor-list-tags">
        ${m.fields.map(f => `<span class="tag">#${f}</span>`).join('')}
      </div>
      <div class="mentor-list-header">
        <div class="mentor-list-avatar">👤</div>
        <div class="mentor-list-info">
          <h3>${m.name}</h3>
          <p class="company">${m.company}</p>
          <p class="career">${m.major} ${m.career}</p>
        </div>
      </div>
      <div class="mentor-list-meta">대화 주제: ${m.topic}</div>
      <div class="mentor-list-stats">
        <span class="stat">커리어상담 ${m.counselCount}건</span>
        <span class="stat">자소서·포폴 ${m.portfolioCount}건</span>
        <span class="rating">평점 ${m.rating}점</span>
      </div>
      <button class="apply-btn" onclick="applyMentor('${m.id}')">상담 신청하기</button>
    </div>
  `).join('');
}

function searchMentors() { loadMentorList(); }
window.searchMentors = searchMentors;

function filterByField(field) {
  showPage('search');
  document.getElementById('search-input').value = field;
  loadMentorList(field);
}
window.filterByField = filterByField;

function toggleFilter(el) {
  el.classList.toggle('active');
}
window.toggleFilter = toggleFilter;

// ─── 상담 신청 ───
function applyMentor(mentorId) {
  const mentor = DB.get('mentors').find(m => m.id === mentorId);
  const time = prompt(`희망 시간을 선택하세요:\n${mentor.availableTimes.join(', ')}`);
  if (!time) return;

  const topic = prompt('상담 주제를 입력하세요:');
  if (!topic) return;

  const apps = DB.get('applications');
  apps.push({
    id: 'app' + Date.now(),
    menteeId: 'me',
    mentorId: mentorId,
    mentorName: mentor.name,
    field: mentor.fields[0],
    topic: topic,
    hopedTime: time,
    status: '신청접수',
    createdAt: new Date().toISOString(),
  });
  DB.set('applications', apps);
  showToast('상담 신청이 완료되었습니다!', 'success');
}
window.applyMentor = applyMentor;

// ─── 멘토 등록 ───
function registerMentor(e) {
  e.preventDefault();
  const mentors = DB.get('mentors');
  mentors.push({
    id: 'm' + Date.now(),
    name: document.getElementById('reg-name').value,
    company: document.getElementById('reg-company').value,
    major: document.getElementById('reg-major').value,
    career: document.getElementById('reg-career').value,
    fields: document.getElementById('reg-fields').value.split(',').map(s => s.trim()),
    availableTimes: document.getElementById('reg-times').value.split(',').map(s => s.trim()),
    topic: document.getElementById('reg-topic').value,
    bio: document.getElementById('reg-bio').value,
    status: 'active',
    counselCount: 0,
    portfolioCount: 0,
    rating: 0,
  });
  DB.set('mentors', mentors);
  e.target.reset();
  showToast('멘토 등록이 완료되었습니다!', 'success');
  loadPopularMentors();
}
window.registerMentor = registerMentor;

// ─── 대화 관리 ───
function switchChatTab(tab) {
  document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  loadChatContent(tab);
}
window.switchChatTab = switchChatTab;

function loadChatContent(tab) {
  const container = document.getElementById('chat-content');
  const apps = DB.get('applications');
  const records = DB.get('records');

  if (tab === 'sent') {
    const myApps = apps.filter(a => a.menteeId === 'me');
    if (!myApps.length) { container.innerHTML = '<div class="empty">보낸 요청이 없습니다.</div>'; return; }
    container.innerHTML = myApps.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(a => `
      <div class="chat-item">
        <div class="chat-item-header">
          <h4>${a.mentorName} · ${a.field}</h4>
          <span class="chat-status ${statusClass(a.status)}">${a.status}</span>
        </div>
        <div class="chat-item-body">주제: ${a.topic}<br>희망시간: ${a.hopedTime}</div>
        <div class="chat-item-date">${new Date(a.createdAt).toLocaleDateString('ko-KR')}</div>
        ${a.status === '신청접수' ? `<div class="chat-item-actions"><button class="btn-sm cancel" onclick="cancelApp('${a.id}')">취소</button></div>` : ''}
      </div>
    `).join('');
  } else if (tab === 'received') {
    const received = apps.filter(a => a.status === '멘토검토중');
    if (!received.length) { container.innerHTML = '<div class="empty">받은 요청이 없습니다.<br><small style="color:#bbb">멘토로 배정되면 여기에 표시됩니다.</small></div>'; return; }
    container.innerHTML = received.map(a => `
      <div class="chat-item">
        <div class="chat-item-header">
          <h4>${a.field} · ${a.topic}</h4>
          <span class="chat-status review">멘토검토중</span>
        </div>
        <div class="chat-item-body">희망시간: ${a.hopedTime}</div>
        <div class="chat-item-actions">
          <button class="btn-sm approve" onclick="approveApp('${a.id}')">승인</button>
          <button class="btn-sm reject" onclick="rejectApp('${a.id}')">반려</button>
        </div>
      </div>
    `).join('');
  } else {
    if (!records.length) { container.innerHTML = '<div class="empty">상담 기록이 없습니다.</div>'; return; }
    container.innerHTML = records.map(r => `
      <div class="record-item">
        <h4>${r.field} — ${r.topic}</h4>
        <div class="record-meta">${r.mentorName} · ${new Date(r.createdAt).toLocaleDateString('ko-KR')}</div>
        <div class="stars">${'★'.repeat(Math.round(r.rating || 5))}</div>
        <div class="record-summary">${r.summary}</div>
      </div>
    `).join('');
  }
}

function cancelApp(appId) {
  if (!confirm('신청을 취소하시겠습니까?')) return;
  const apps = DB.get('applications');
  const app = apps.find(a => a.id === appId);
  if (app) { app.status = '취소'; DB.set('applications', apps); }
  showToast('신청이 취소되었습니다.', 'info');
  loadChatContent('sent');
}
window.cancelApp = cancelApp;

function approveApp(appId) {
  const apps = DB.get('applications');
  const app = apps.find(a => a.id === appId);
  if (app) { app.status = '일정확정'; DB.set('applications', apps); }
  showToast('상담이 확정되었습니다!', 'success');
  loadChatContent('received');
}
window.approveApp = approveApp;

function rejectApp(appId) {
  if (!confirm('반려하시겠습니까?')) return;
  const apps = DB.get('applications');
  const app = apps.find(a => a.id === appId);
  if (app) { app.status = '반려'; DB.set('applications', apps); }
  showToast('반려되었습니다.', 'info');
  loadChatContent('received');
}
window.rejectApp = rejectApp;

function statusClass(status) {
  const map = { '신청접수': 'pending', '멘토검토중': 'review', '일정확정': 'confirmed', '상담완료': 'completed', '반려': 'rejected', '취소': 'cancelled' };
  return map[status] || '';
}

// ─── 유틸 ───
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

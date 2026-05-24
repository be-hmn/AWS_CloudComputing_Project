// ═══════════════════════════════════════════════
//  Config & State
// ═══════════════════════════════════════════════
const API_BASE = import.meta.env.VITE_API_BASE ?? '';

let currentUser = null; // { id, role, name }
let _allMentors = [];   // 공개 멘토 목록 캐시

// 모달 상태
let _pendingApplyField = '';
let _pendingApproveId = null;
let _pendingRejectId = null;
let _pendingRecordAppId = null;
let _pendingAssignAppId = null;

// ═══════════════════════════════════════════════
//  JWT / Token
// ═══════════════════════════════════════════════
function decodeJwtPayload(token) {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
}
function getToken() { return localStorage.getItem('token'); }
function setToken(t) { localStorage.setItem('token', t); }
function clearToken() { localStorage.removeItem('token'); }

// ═══════════════════════════════════════════════
//  API Helper
// ═══════════════════════════════════════════════
async function api(method, path, body) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  let data;
  try { data = await res.json(); } catch { data = {}; }

  if (!res.ok) {
    const msg = data?.message || `HTTP ${res.status}`;
    throw Object.assign(new Error(msg), { status: res.status, code: data?.code });
  }
  return data;
}

// ═══════════════════════════════════════════════
//  Auth Initialization
// ═══════════════════════════════════════════════
async function initAuth() {
  const token = getToken();
  if (!token) return;
  const payload = decodeJwtPayload(token);
  if (!payload || (payload.exp && payload.exp * 1000 < Date.now())) {
    clearToken();
    return;
  }
  try {
    const user = await api('GET', '/api/auth/me');
    currentUser = user;
  } catch {
    clearToken();
  }
}

// ═══════════════════════════════════════════════
//  Auth Modal
// ═══════════════════════════════════════════════
let _authMode = 'login';

window.openAuthModal = function (mode = 'login') {
  _authMode = mode;
  document.getElementById('auth-login-form').style.display = mode === 'login' ? 'block' : 'none';
  document.getElementById('auth-register-form').style.display = mode === 'register' ? 'block' : 'none';
  document.getElementById('auth-modal-title').textContent = mode === 'login' ? '로그인' : '회원가입';
  document.getElementById('modal-auth').style.display = 'flex';
};

window.closeAuthModal = function () {
  document.getElementById('modal-auth').style.display = 'none';
};

window.switchAuthMode = function (mode) {
  openAuthModal(mode);
};

window.submitAuth = async function () {
  try {
    if (_authMode === 'login') {
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      if (!email || !password) { showToast('이메일과 비밀번호를 입력하세요.', 'error'); return; }
      const result = await api('POST', '/api/auth/login', { email, password });
      setToken(result.token);
      currentUser = result.user;
      closeAuthModal();
      renderNav();
      showToast(`${currentUser.name}님, 환영합니다!`, 'success');
      showPage('chat');
    } else {
      const name = document.getElementById('register-name').value.trim();
      const email = document.getElementById('register-email').value.trim();
      const password = document.getElementById('register-password').value;
      const role = document.getElementById('register-role').value;
      if (!name || !email || !password) { showToast('모든 필드를 입력하세요.', 'error'); return; }
      await api('POST', '/api/auth/register', { name, email, password, role });

      if (role === 'MENTOR') {
        const loginResult = await api('POST', '/api/auth/login', { email, password });
        setToken(loginResult.token);
        currentUser = loginResult.user;

        const major = document.getElementById('register-major')?.value.trim();
        const fields = document.getElementById('register-fields')?.value.split(',').map(s => s.trim()).filter(Boolean);
        const intro = document.getElementById('register-intro')?.value.trim();
        const s0 = document.getElementById('register-avail-start-0')?.value;
        const e0 = document.getElementById('register-avail-end-0')?.value;
        const availabilities = (s0 && e0) ? [{ start_at: new Date(s0).toISOString(), end_at: new Date(e0).toISOString() }] : [];

        if (major && fields?.length && availabilities.length) {
          try {
            await api('POST', '/api/mentors/me', { major, intro: intro || undefined, fields, availabilities });
          } catch { /* 나중에 프로필 페이지에서 수정 가능 */ }
        }

        closeAuthModal();
        renderNav();
        showToast(`${currentUser.name}님, 멘토로 가입되었습니다!`, 'success');
        showPage('register');
      } else {
        showToast('회원가입 완료! 로그인해주세요.', 'success');
        switchAuthMode('login');
      }
    }
  } catch (e) {
    showToast(e.message, 'error');
  }
};

window.logout = function () {
  clearToken();
  currentUser = null;
  renderNav();
  showPage('home');
  showToast('로그아웃되었습니다.', 'info');
};

// ═══════════════════════════════════════════════
//  Navigation
// ═══════════════════════════════════════════════
function renderNav() {
  const nav = document.getElementById('nav-menu');
  const authDiv = document.getElementById('auth-status');
  const links = [{ label: '홈', page: 'home' }, { label: '멘토 찾기', page: 'search' }];

  if (currentUser) {
    if (currentUser.role === 'MENTEE') {
      links.push({ label: '내 신청', page: 'chat' });
    } else if (currentUser.role === 'MENTOR') {
      links.push({ label: '내 프로필', page: 'register' });
      links.push({ label: '배정 관리', page: 'chat' });
    } else if (currentUser.role === 'ADMIN') {
      links.push({ label: '관리 대시보드', page: 'chat' });
    }
    authDiv.innerHTML = `
      <span class="user-badge">${roleEmoji(currentUser.role)} ${currentUser.name}</span>
      <button class="btn-auth-ghost" onclick="logout()">로그아웃</button>
    `;
  } else {
    authDiv.innerHTML = `<button class="btn-auth-outline" onclick="openAuthModal('login')">로그인</button>`;
  }

  nav.innerHTML = links.map(l =>
    `<a href="#" class="nav-link" onclick="showPage('${l.page}');return false">${l.label}</a>`
  ).join('');
}

function roleEmoji(role) {
  return role === 'MENTEE' ? '🎓' : role === 'MENTOR' ? '👨‍🏫' : '⚙️';
}

// ═══════════════════════════════════════════════
//  Page Management
// ═══════════════════════════════════════════════
window.showPage = function (page) {
  const protectedPages = ['chat', 'register'];
  if (protectedPages.includes(page) && !currentUser) {
    showToast('로그인이 필요합니다.', 'error');
    openAuthModal('login');
    return;
  }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(`page-${page}`);
  if (el) el.classList.add('active');
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => {
    if (l.getAttribute('onclick')?.includes(`'${page}'`)) l.classList.add('active');
  });
  window.scrollTo(0, 0);

  if (page === 'search') loadMentorList();
  if (page === 'chat') loadDashboard();
  if (page === 'register') loadMentorProfilePage();
};

window.toggleMenu = function () {
  const nav = document.getElementById('nav-menu');
  nav.style.display = nav.style.display === 'flex' ? 'none' : 'flex';
};

window.handleOverlayClick = function (e, modalId) {
  if (e.target.id === modalId) {
    document.getElementById(modalId).style.display = 'none';
  }
};

// ═══════════════════════════════════════════════
//  Home Page
// ═══════════════════════════════════════════════
async function loadPopularMentors() {
  const container = document.getElementById('popular-mentors');
  try {
    const mentors = await api('GET', '/api/mentors');
    _allMentors = mentors;
    const top4 = mentors.slice(0, 4);
    if (!top4.length) {
      container.innerHTML = '<div class="empty">등록된 멘토가 없습니다.</div>';
      return;
    }
    container.innerHTML = top4.map(m => `
      <div class="mentor-card" onclick="showPage('search')">
        <div class="mentor-card-header">
          <div class="mentor-avatar">👤</div>
          <div class="mentor-info">
            <h3>${esc(m.name)}</h3>
            <p>${esc(m.major)}</p>
          </div>
        </div>
        <div class="mentor-card-topic">${(m.fields || []).map(f => `#${esc(f)}`).join(' ')}</div>
        <div class="mentor-card-stats">
          <span class="stat-link">${esc(m.intro || '멘토링 상담 가능')}</span>
        </div>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = '<div class="empty">멘토 정보를 불러오지 못했습니다.</div>';
  }
}

// ═══════════════════════════════════════════════
//  Search Page
// ═══════════════════════════════════════════════
window.loadMentorList = async function (filterField) {
  const container = document.getElementById('mentor-list');
  container.innerHTML = '<div class="empty">불러오는 중...</div>';
  try {
    const params = filterField ? `?field=${encodeURIComponent(filterField)}` : '';
    const mentors = await api('GET', `/api/mentors${params}`);
    _allMentors = filterField ? _allMentors : mentors;

    const query = document.getElementById('search-input')?.value?.toLowerCase() || '';
    let filtered = mentors;
    if (query) {
      filtered = mentors.filter(m =>
        (m.name || '').toLowerCase().includes(query) ||
        (m.fields || []).some(f => f.toLowerCase().includes(query)) ||
        (m.major || '').toLowerCase().includes(query)
      );
    }

    document.getElementById('search-count').textContent = `총 ${filtered.length}건`;
    if (!filtered.length) {
      container.innerHTML = '<div class="empty">검색 결과가 없습니다.</div>';
      return;
    }

    container.innerHTML = filtered.map(m => `
      <div class="mentor-list-item">
        <div class="response-badge">💬 응답률이 높아요</div>
        <div class="mentor-list-tags">
          ${(m.fields || []).map(f => `<span class="tag">#${esc(f)}</span>`).join('')}
        </div>
        <div class="mentor-list-header">
          <div class="mentor-list-avatar">👤</div>
          <div class="mentor-list-info">
            <h3>${esc(m.name)}</h3>
            <p class="career">${esc(m.major)}</p>
          </div>
        </div>
        <div class="mentor-list-meta">${esc(m.intro || '')}</div>
        <button class="apply-btn" onclick="applyMentor(${m.id},'${esc(m.fields?.[0] || '')}')">상담 신청하기</button>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = '<div class="empty">멘토 목록을 불러오지 못했습니다.</div>';
  }
};

window.searchMentors = function () { loadMentorList(); };

window.filterByField = function (field) {
  showPage('search');
  document.getElementById('search-input').value = field;
  loadMentorList(field);
};

window.toggleFilter = function (el) { el.classList.toggle('active'); };

// ═══════════════════════════════════════════════
//  Apply Modal
// ═══════════════════════════════════════════════
window.applyMentor = function (mentorId, defaultField) {
  if (!currentUser) {
    showToast('로그인이 필요합니다.', 'error');
    openAuthModal('login');
    return;
  }
  if (currentUser.role !== 'MENTEE') {
    showToast('멘티 계정으로만 신청할 수 있습니다.', 'error');
    return;
  }
  _pendingApplyField = defaultField || '';
  document.getElementById('apply-field').value = _pendingApplyField;
  document.getElementById('apply-topic').value = '';
  document.getElementById('apply-desired-at').value = '';
  document.getElementById('apply-message').value = '';
  document.getElementById('modal-apply').style.display = 'flex';
};

window.closeApplyModal = function () {
  document.getElementById('modal-apply').style.display = 'none';
};

window.submitApply = async function () {
  const interest_field = document.getElementById('apply-field').value.trim();
  const topic = document.getElementById('apply-topic').value.trim();
  const desired_at_raw = document.getElementById('apply-desired-at').value;
  const message = document.getElementById('apply-message').value.trim();

  if (!interest_field || !topic || !desired_at_raw) {
    showToast('분야, 주제, 희망 일시는 필수입니다.', 'error');
    return;
  }
  const desired_at = new Date(desired_at_raw).toISOString();
  const btn = document.querySelector('#modal-apply .btn-submit');
  try {
    if (btn) { btn.disabled = true; btn.textContent = '처리 중...'; }
    await api('POST', '/api/applications', { interest_field, topic, desired_at, message: message || undefined });
    closeApplyModal();
    showToast('상담 신청이 완료되었습니다!', 'success');
  } catch (e) {
    showToast(e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '신청하기'; }
  }
};

// ═══════════════════════════════════════════════
//  Mentor Profile Page (page-register)
// ═══════════════════════════════════════════════
async function loadMentorProfilePage() {
  const container = document.getElementById('mentor-profile-content');
  if (!currentUser) {
    container.innerHTML = '<div class="empty">로그인이 필요합니다.<br><button class="btn-submit" style="margin-top:1rem;width:auto;padding:0.5rem 1.5rem" onclick="openAuthModal(\'login\')">로그인</button></div>';
    return;
  }
  if (currentUser.role !== 'MENTOR') {
    container.innerHTML = '<div class="empty">멘토 계정만 이용할 수 있는 페이지입니다.</div>';
    return;
  }

  container.innerHTML = '<div class="empty">불러오는 중...</div>';
  let existing = null;
  try { existing = await api('GET', '/api/mentors/me'); } catch { existing = null; }

  const avail = existing?.availabilities ?? [];
  const availRows = [0, 1, 2].map(i => `
    <div class="avail-row" style="display:flex;gap:0.5rem;margin-bottom:0.5rem">
      <input type="datetime-local" class="avail-start" style="flex:1" value="${avail[i]?.start_at ? avail[i].start_at.slice(0,16) : ''}">
      <span style="align-self:center">~</span>
      <input type="datetime-local" class="avail-end" style="flex:1" value="${avail[i]?.end_at ? avail[i].end_at.slice(0,16) : ''}">
    </div>
  `).join('');

  container.innerHTML = `
    <form class="register-form" onsubmit="submitMentorProfile(event)">
      <div class="form-group">
        <label>직무/전공 <small>(필수)</small></label>
        <input type="text" id="mp-major" placeholder="예: 프론트엔드 개발" required value="${esc(existing?.major || '')}">
      </div>
      <div class="form-group">
        <label>소개글</label>
        <textarea id="mp-intro" rows="3" placeholder="멘티에게 보여줄 소개를 작성하세요">${esc(existing?.intro || '')}</textarea>
      </div>
      <div class="form-group">
        <label>상담 가능 분야 <small>(쉼표 구분, 필수)</small></label>
        <input type="text" id="mp-fields" placeholder="예: 웹개발, 백엔드, AWS" required value="${esc((existing?.fields || []).join(', '))}">
      </div>
      <div class="form-group">
        <label>상담 가능 시간대 <small>(최대 3개)</small></label>
        <div id="avail-container">${availRows}</div>
      </div>
      <button type="submit" class="btn-submit">${existing ? '프로필 수정' : '프로필 등록'}</button>
    </form>
  `;
}

window.submitMentorProfile = async function (e) {
  e.preventDefault();
  const major = document.getElementById('mp-major').value.trim();
  const intro = document.getElementById('mp-intro').value.trim();
  const fields = document.getElementById('mp-fields').value.split(',').map(s => s.trim()).filter(Boolean);

  const starts = document.querySelectorAll('.avail-start');
  const ends = document.querySelectorAll('.avail-end');
  const availabilities = [];
  for (let i = 0; i < starts.length; i++) {
    const s = starts[i].value, en = ends[i].value;
    if (s && en) availabilities.push({ start_at: new Date(s).toISOString(), end_at: new Date(en).toISOString() });
  }

  if (!major || !fields.length) { showToast('직무와 분야는 필수입니다.', 'error'); return; }
  if (!availabilities.length) { showToast('가능 시간을 최소 1개 입력하세요.', 'error'); return; }

  try {
    let existing = null;
    try { existing = await api('GET', '/api/mentors/me'); } catch { existing = null; }
    const body = { major, intro: intro || undefined, fields, availabilities };
    if (existing) {
      await api('PATCH', '/api/mentors/me', body);
    } else {
      await api('POST', '/api/mentors/me', body);
    }
    showToast('프로필이 저장되었습니다!', 'success');
    loadMentorProfilePage();
  } catch (e) {
    showToast(e.message, 'error');
  }
};

// ═══════════════════════════════════════════════
//  Dashboard / Chat Page
// ═══════════════════════════════════════════════
function loadDashboard() {
  if (!currentUser) {
    document.getElementById('chat-tabs').innerHTML = '';
    document.getElementById('chat-content').innerHTML = '<div class="empty">로그인이 필요합니다.</div>';
    return;
  }

  const role = currentUser.role;
  let tabs = [];
  let defaultTab = '';

  if (role === 'MENTEE') {
    document.getElementById('chat-title').textContent = '내 신청 관리';
    tabs = [
      { id: 'sent', label: '보낸 신청' },
      { id: 'myrecords', label: '상담 기록' },
    ];
    defaultTab = 'sent';
  } else if (role === 'MENTOR') {
    document.getElementById('chat-title').textContent = '배정 관리';
    tabs = [
      { id: 'pending-assign', label: '대기 중 배정' },
      { id: 'all-assign', label: '전체 배정' },
    ];
    defaultTab = 'pending-assign';
  } else if (role === 'ADMIN') {
    document.getElementById('chat-title').textContent = '관리 대시보드';
    tabs = [
      { id: 'admin-apps', label: '신청 관리' },
      { id: 'admin-mentors', label: '멘토 관리' },
      { id: 'admin-stats', label: '통계' },
      { id: 'admin-records', label: '기록 전체' },
      { id: 'admin-mentee-history', label: '멘티 이력' },
    ];
    defaultTab = 'admin-apps';
  }

  document.getElementById('chat-tabs').innerHTML = tabs.map((t, i) =>
    `<button class="chat-tab${i === 0 ? ' active' : ''}" onclick="switchChatTab('${t.id}',this)">${t.label}</button>`
  ).join('');

  switchChatTab(defaultTab, document.querySelector('.chat-tab'));
}

window.switchChatTab = function (tab, el) {
  document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');

  const role = currentUser?.role;
  if (role === 'MENTEE') {
    if (tab === 'sent') loadSentApplications();
    else if (tab === 'myrecords') loadMyRecords();
  } else if (role === 'MENTOR') {
    if (tab === 'pending-assign') loadMyAssignments('PENDING');
    else if (tab === 'all-assign') loadMyAssignments();
  } else if (role === 'ADMIN') {
    if (tab === 'admin-apps') loadAdminApplications();
    else if (tab === 'admin-mentors') loadAdminMentors();
    else if (tab === 'admin-stats') loadAdminStats();
    else if (tab === 'admin-records') loadAdminRecords();
    else if (tab === 'admin-mentee-history') loadAdminMenteeHistory();
  }
};

// ─── MENTEE: 보낸 신청 ───
async function loadSentApplications() {
  const c = document.getElementById('chat-content');
  c.innerHTML = '<div class="empty">불러오는 중...</div>';
  try {
    const apps = await api('GET', '/api/applications');
    if (!apps.length) { c.innerHTML = '<div class="empty">아직 신청한 멘토링이 없습니다.<br><button class="btn-submit" style="margin-top:1rem;width:auto;padding:0.5rem 1.5rem" onclick="showPage(\'search\')">멘토 찾으러 가기</button></div>'; return; }
    c.innerHTML = apps.map(a => `
      <div class="chat-item">
        <div class="chat-item-header">
          <h4>${esc(a.interest_field)} · ${esc(a.topic)}</h4>
          <span class="chat-status ${statusClass(a.status)}">${statusLabel(a.status)}</span>
        </div>
        <div class="chat-item-body">희망 일시: ${formatDate(a.desired_at)}${a.message ? `<br>메시지: ${esc(a.message)}` : ''}</div>
        <div class="chat-item-date">${formatDate(a.created_at)}</div>
        ${a.status === 'SUBMITTED' ? `<div class="chat-item-actions"><button class="btn-sm cancel" onclick="cancelApp(${a.id})">신청 취소</button></div>` : ''}
      </div>
    `).join('');
  } catch (e) { c.innerHTML = `<div class="empty">${e.message}</div>`; }
}

window.cancelApp = async function (appId) {
  if (!confirm('신청을 취소하시겠습니까?')) return;
  try {
    await api('DELETE', `/api/applications/${appId}`);
    showToast('신청이 취소되었습니다.', 'info');
    loadSentApplications();
  } catch (e) { showToast(e.message, 'error'); }
};

// ─── MENTEE: 상담 기록 ───
async function loadMyRecords() {
  const c = document.getElementById('chat-content');
  c.innerHTML = '<div class="empty">불러오는 중...</div>';
  try {
    const records = await api('GET', '/api/me/records');
    if (!records.length) { c.innerHTML = '<div class="empty">상담 기록이 없습니다.</div>'; return; }
    c.innerHTML = records.map(r => `
      <div class="record-item">
        <div class="record-meta">신청 #${r.application_id} · ${formatDate(r.created_at)}</div>
        <div class="record-summary">${esc(r.summary)}</div>
        ${r.follow_up_task ? `<div class="record-followup"><strong>후속 과제:</strong> ${esc(r.follow_up_task)}</div>` : ''}
        ${r.needs_next_consultation ? '<div class="record-next">🔄 다음 상담 필요</div>' : ''}
      </div>
    `).join('');
  } catch (e) { c.innerHTML = `<div class="empty">${e.message}</div>`; }
}

// ─── MENTOR: 내 배정 ───
async function loadMyAssignments(statusFilter) {
  const c = document.getElementById('chat-content');
  c.innerHTML = '<div class="empty">불러오는 중...</div>';
  try {
    const params = statusFilter ? `?status=${statusFilter}` : '';
    const items = await api('GET', `/api/mentors/me/assignments${params}`);
    if (!items.length) { c.innerHTML = '<div class="empty">배정 요청이 없습니다.</div>'; return; }
    c.innerHTML = items.map(item => {
      const app = item.application;
      return `
        <div class="chat-item">
          <div class="chat-item-header">
            <h4>${app ? `${esc(app.interest_field)} · ${esc(app.topic)}` : '신청 정보 없음'}</h4>
            <span class="chat-status ${assignStatusClass(item.assignment_status)}">${assignStatusLabel(item.assignment_status)}</span>
          </div>
          ${app ? `<div class="chat-item-body">신청 #${app.id} · 희망 일시: ${formatDate(app.desired_at)}<br>신청 상태: ${statusLabel(app.status)}</div>` : ''}
          <div class="chat-item-actions">
            ${item.assignment_status === 'PENDING' ? `
              <button class="btn-sm approve" onclick="openApproveModal(${item.assignment_id})">승인</button>
              <button class="btn-sm reject" onclick="openRejectModal(${item.assignment_id})">반려</button>
            ` : ''}
            ${app?.status === 'SCHEDULED' ? `
              <button class="btn-sm record" onclick="openRecordModal(${app.id})">상담 완료 & 기록 작성</button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  } catch (e) { c.innerHTML = `<div class="empty">${e.message}</div>`; }
}

// ─── MENTOR: 승인 모달 ───
window.openApproveModal = function (assignmentId) {
  _pendingApproveId = assignmentId;
  document.getElementById('approve-scheduled-at').value = '';
  document.getElementById('modal-approve').style.display = 'flex';
};
window.closeApproveModal = function () {
  document.getElementById('modal-approve').style.display = 'none';
};
window.submitApprove = async function () {
  const raw = document.getElementById('approve-scheduled-at').value;
  if (!raw) { showToast('상담 일시를 입력하세요.', 'error'); return; }
  const scheduled_at = new Date(raw).toISOString();
  const btn = document.querySelector('#modal-approve .btn-submit');
  try {
    if (btn) { btn.disabled = true; btn.textContent = '처리 중...'; }
    await api('POST', `/api/assignments/${_pendingApproveId}/approve`, { scheduled_at });
    closeApproveModal();
    showToast('상담 일정이 확정되었습니다!', 'success');
    loadMyAssignments('PENDING');
  } catch (e) { showToast(e.message, 'error'); }
  finally { if (btn) { btn.disabled = false; btn.textContent = '일정 확정하기'; } }
};

// ─── MENTOR: 반려 모달 ───
window.openRejectModal = function (assignmentId) {
  _pendingRejectId = assignmentId;
  document.getElementById('reject-reason').value = '';
  document.getElementById('modal-reject').style.display = 'flex';
};
window.closeRejectModal = function () {
  document.getElementById('modal-reject').style.display = 'none';
};
window.submitReject = async function () {
  const reject_reason = document.getElementById('reject-reason').value.trim();
  if (!reject_reason) { showToast('반려 사유를 입력하세요.', 'error'); return; }
  const btn = document.querySelector('#modal-reject .btn-submit');
  try {
    if (btn) { btn.disabled = true; btn.textContent = '처리 중...'; }
    await api('POST', `/api/assignments/${_pendingRejectId}/reject`, { reject_reason });
    closeRejectModal();
    showToast('반려 처리되었습니다.', 'info');
    loadMyAssignments('PENDING');
  } catch (e) { showToast(e.message, 'error'); }
  finally { if (btn) { btn.disabled = false; btn.textContent = '반려하기'; } }
};

// ─── MENTOR: 기록 모달 ───
window.openRecordModal = function (applicationId) {
  _pendingRecordAppId = applicationId;
  document.getElementById('record-summary').value = '';
  document.getElementById('record-followup').value = '';
  document.getElementById('record-next-consult').checked = false;
  document.getElementById('modal-record').style.display = 'flex';
};
window.closeRecordModal = function () {
  document.getElementById('modal-record').style.display = 'none';
};
window.submitRecord = async function () {
  const summary = document.getElementById('record-summary').value.trim();
  const follow_up_task = document.getElementById('record-followup').value.trim();
  const needs_next_consultation = document.getElementById('record-next-consult').checked;
  if (!summary) { showToast('상담 요약은 필수입니다.', 'error'); return; }
  const btn = document.querySelector('#modal-record .btn-submit');
  try {
    if (btn) { btn.disabled = true; btn.textContent = '처리 중...'; }
    await api('POST', `/api/applications/${_pendingRecordAppId}/record`, {
      summary,
      follow_up_task: follow_up_task || undefined,
      needs_next_consultation,
    });
    closeRecordModal();
    showToast('기록이 저장되었습니다!', 'success');
    loadMyAssignments();
  } catch (e) { showToast(e.message, 'error'); }
  finally { if (btn) { btn.disabled = false; btn.textContent = '기록 저장'; } }
};

// ─── ADMIN: 신청 관리 ───
async function loadAdminApplications(statusFilter) {
  const c = document.getElementById('chat-content');
  c.innerHTML = `
    <div style="margin-bottom:1rem;display:flex;gap:0.5rem;flex-wrap:wrap">
      <button class="chip ${!statusFilter ? 'active' : ''}" onclick="loadAdminApplications()">전체</button>
      ${['SUBMITTED','UNDER_REVIEW','SCHEDULED','COMPLETED','CANCELLED'].map(s =>
        `<button class="chip ${statusFilter===s?'active':''}" onclick="loadAdminApplications('${s}')">${statusLabel(s)}</button>`
      ).join('')}
    </div>
    <div id="admin-apps-list"><div class="empty">불러오는 중...</div></div>
  `;
  try {
    const params = statusFilter ? `?status=${statusFilter}` : '';
    const apps = await api('GET', `/api/admin/applications${params}`);
    const listEl = document.getElementById('admin-apps-list');
    if (!apps.length) { listEl.innerHTML = '<div class="empty">신청이 없습니다.</div>'; return; }
    listEl.innerHTML = apps.map(a => `
      <div class="chat-item">
        <div class="chat-item-header">
          <h4>#${a.id} · ${esc(a.interest_field)} — ${esc(a.topic)}</h4>
          <span class="chat-status ${statusClass(a.status)}">${statusLabel(a.status)}</span>
        </div>
        <div class="chat-item-body">희망: ${formatDate(a.desired_at)} · 멘티 ID: ${a.mentee_id}</div>
        <div class="chat-item-actions">
          ${(a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW') ? `
            <button class="btn-sm approve" onclick="openCandidatesModal(${a.id})">멘토 배정</button>
          ` : ''}
        </div>
      </div>
    `).join('');
  } catch (e) {
    const listEl = document.getElementById('admin-apps-list');
    if (listEl) listEl.innerHTML = `<div class="empty">${e.message}</div>`;
  }
}

// ─── ADMIN: 후보 모달 ───
window.openCandidatesModal = async function (applicationId) {
  _pendingAssignAppId = applicationId;
  document.getElementById('candidates-list').innerHTML = '<div class="empty">후보를 불러오는 중...</div>';
  document.getElementById('modal-candidates').style.display = 'flex';
  try {
    const candidates = await api('GET', `/api/admin/applications/${applicationId}/candidates`);
    if (!candidates.length) {
      document.getElementById('candidates-list').innerHTML = '<div class="empty">해당 분야의 활성 멘토가 없습니다.</div>';
      return;
    }
    document.getElementById('candidates-list').innerHTML = candidates.map(c => `
      <div class="chat-item" style="margin-bottom:0.8rem">
        <div class="chat-item-header">
          <h4>👤 ${esc(c.name)} — ${esc(c.major)}</h4>
          ${c.overlaps_desired_at ? '<span class="chat-status confirmed">시간 가능 ✓</span>' : ''}
        </div>
        <div class="chat-item-body">${(c.fields||[]).map(f=>`<span class="tag">#${esc(f)}</span>`).join(' ')}</div>
        <div class="chat-item-actions">
          <button class="btn-sm approve" onclick="assignMentor(${applicationId},${c.mentor_id})">배정하기</button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    document.getElementById('candidates-list').innerHTML = `<div class="empty">${e.message}</div>`;
  }
};

window.closeCandidatesModal = function () {
  document.getElementById('modal-candidates').style.display = 'none';
};

window.assignMentor = async function (applicationId, mentorId) {
  const btn = event?.target;
  try {
    if (btn) { btn.disabled = true; btn.textContent = '처리 중...'; }
    await api('POST', `/api/admin/applications/${applicationId}/assign`, { mentor_id: mentorId });
    closeCandidatesModal();
    showToast('멘토가 배정되었습니다!', 'success');
    loadAdminApplications();
  } catch (e) {
    showToast(e.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = '배정하기'; }
  }
};

// ─── ADMIN: 멘토 관리 ───
async function loadAdminMentors() {
  const c = document.getElementById('chat-content');
  c.innerHTML = '<div class="empty">불러오는 중...</div>';
  try {
    const mentors = await api('GET', '/api/admin/mentors');
    if (!mentors.length) { c.innerHTML = '<div class="empty">멘토가 없습니다.</div>'; return; }
    c.innerHTML = mentors.map(m => `
      <div class="chat-item">
        <div class="chat-item-header">
          <h4>👤 ${esc(m.name || '(이름없음)')} — ${esc(m.major)}</h4>
          <span class="chat-status ${m.is_active ? 'confirmed' : 'cancelled'}">${m.is_active ? '활성' : '비활성'}</span>
        </div>
        <div class="chat-item-body">${(m.fields||[]).map(f=>`<span class="tag">#${esc(f)}</span>`).join(' ')}</div>
        <div class="chat-item-actions">
          <button class="btn-sm ${m.is_active ? 'cancel' : 'approve'}" onclick="toggleMentorActive(${m.id},${!m.is_active})">
            ${m.is_active ? '비활성화' : '활성화'}
          </button>
        </div>
      </div>
    `).join('');
  } catch (e) { c.innerHTML = `<div class="empty">${e.message}</div>`; }
}

window.toggleMentorActive = async function (mentorId, isActive) {
  try {
    await api('PATCH', `/api/admin/mentors/${mentorId}/active`, { is_active: isActive });
    showToast(`멘토가 ${isActive ? '활성화' : '비활성화'}되었습니다.`, 'success');
    loadAdminMentors();
  } catch (e) { showToast(e.message, 'error'); }
};

// ─── ADMIN: 통계 ───
async function loadAdminStats() {
  const c = document.getElementById('chat-content');
  c.innerHTML = '<div class="empty">불러오는 중...</div>';
  try {
    const stats = await api('GET', '/api/admin/mentors/stats');
    if (!stats.length) { c.innerHTML = '<div class="empty">통계가 없습니다.</div>'; return; }
    c.innerHTML = `
      <table class="stats-table">
        <thead><tr><th>멘토</th><th>직무</th><th>활성</th><th>배정</th><th>완료</th></tr></thead>
        <tbody>
          ${stats.map(s => `
            <tr>
              <td>${esc(s.name || '-')}</td>
              <td>${esc(s.major)}</td>
              <td>${s.is_active ? '✅' : '❌'}</td>
              <td>${s.assigned_count}</td>
              <td>${s.completed_count}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (e) { c.innerHTML = `<div class="empty">${e.message}</div>`; }
}

// ─── ADMIN: 기록 전체 ───
async function loadAdminRecords() {
  const c = document.getElementById('chat-content');
  c.innerHTML = '<div class="empty">불러오는 중...</div>';
  try {
    const records = await api('GET', '/api/admin/records');
    if (!records.length) { c.innerHTML = '<div class="empty">기록이 없습니다.</div>'; return; }
    c.innerHTML = records.map(r => `
      <div class="record-item">
        <div class="record-meta">신청 #${r.application_id} · ${formatDate(r.created_at)}</div>
        <div class="record-summary">${esc(r.summary)}</div>
        ${r.follow_up_task ? `<div class="record-followup"><strong>후속:</strong> ${esc(r.follow_up_task)}</div>` : ''}
        ${r.needs_next_consultation ? '<div class="record-next">🔄 다음 상담 필요</div>' : ''}
      </div>
    `).join('');
  } catch (e) { c.innerHTML = `<div class="empty">${e.message}</div>`; }
}

// ─── ADMIN: 멘티 이력 ───
async function loadAdminMenteeHistory() {
  const c = document.getElementById('chat-content');
  c.innerHTML = `
    <div style="margin-bottom:1rem;display:flex;gap:0.5rem;align-items:center">
      <input type="number" id="mentee-id-input" placeholder="멘티 user_id 입력" style="padding:0.4rem 0.8rem;border:1px solid #ddd;border-radius:6px;width:200px">
      <button class="btn-sm approve" onclick="fetchMenteeHistory()">조회</button>
    </div>
    <div id="mentee-history-list"><div class="empty">멘티 ID를 입력하고 조회하세요.</div></div>
  `;
}

window.fetchMenteeHistory = async function () {
  const menteeId = document.getElementById('mentee-id-input')?.value.trim();
  const listEl = document.getElementById('mentee-history-list');
  if (!menteeId) { showToast('멘티 ID를 입력하세요.', 'error'); return; }
  listEl.innerHTML = '<div class="empty">불러오는 중...</div>';
  try {
    const apps = await api('GET', `/api/admin/mentees/${menteeId}/applications`);
    if (!apps.length) { listEl.innerHTML = '<div class="empty">신청 이력이 없습니다.</div>'; return; }
    listEl.innerHTML = apps.map(a => `
      <div class="chat-item">
        <div class="chat-item-header">
          <h4>#${a.id} · ${esc(a.interest_field)} — ${esc(a.topic)}</h4>
          <span class="chat-status ${statusClass(a.status)}">${statusLabel(a.status)}</span>
        </div>
        <div class="chat-item-body">희망: ${formatDate(a.desired_at)}</div>
        <div class="chat-item-date">${formatDate(a.created_at)}</div>
      </div>
    `).join('');
  } catch (e) { listEl.innerHTML = `<div class="empty">${e.message}</div>`; }
};

// ═══════════════════════════════════════════════
//  Utils
// ═══════════════════════════════════════════════
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function statusLabel(s) {
  return { SUBMITTED: '신청접수', UNDER_REVIEW: '검토중', SCHEDULED: '일정확정', COMPLETED: '상담완료', REJECTED: '반려', CANCELLED: '취소' }[s] || s;
}

function statusClass(s) {
  return { SUBMITTED: 'pending', UNDER_REVIEW: 'review', SCHEDULED: 'confirmed', COMPLETED: 'completed', REJECTED: 'rejected', CANCELLED: 'cancelled' }[s] || '';
}

function assignStatusLabel(s) {
  return { PENDING: '대기중', APPROVED: '승인됨', REJECTED: '반려됨', SUPERSEDED: '교체됨' }[s] || s;
}

function assignStatusClass(s) {
  return { PENDING: 'review', APPROVED: 'confirmed', REJECTED: 'rejected', SUPERSEDED: 'cancelled' }[s] || '';
}

function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ═══════════════════════════════════════════════
//  Init
// ═══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
  renderNav();
  loadPopularMentors();
  loadMentorList();
  document.getElementById('register-role')?.addEventListener('change', (e) => {
    const extra = document.getElementById('mentor-extra-fields');
    if (extra) extra.style.display = e.target.value === 'MENTOR' ? 'block' : 'none';
  });
});

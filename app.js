/* ═══════════════════════════════════════════════════
   Match Point — app.js  (UTF-8)
   ═══════════════════════════════════════════════════ */
const API = "https://ww4bpvn22e.execute-api.us-east-1.amazonaws.com";

/* ── Storage ─────────────────────────────────────── */
const getToken = () => localStorage.getItem("mp.token");
const getUser  = () => { try { return JSON.parse(localStorage.getItem("mp.user")); } catch { return null; } };
const setSession = (token, user) => {
  localStorage.setItem("mp.token", token);
  localStorage.setItem("mp.user", JSON.stringify(user));
};
const clearSession = () => {
  localStorage.removeItem("mp.token");
  localStorage.removeItem("mp.user");
};

/* ── API helper ──────────────────────────────────── */
async function api(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(API + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data?.data ?? data;
}

/* ── Toast ───────────────────────────────────────── */
function toast(msg, type = "info") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  const icons = { success: "✅", error: "❌", info: "ℹ️" };
  el.innerHTML = `<span>${icons[type]||"ℹ️"}</span><span>${msg}</span>`;
  document.getElementById("toast-container").appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/* ── Modal ───────────────────────────────────────── */
function openModal(title, bodyHtml, footerHtml = "") {
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-body").innerHTML = bodyHtml;
  document.getElementById("modal-footer").innerHTML = footerHtml;
  document.getElementById("modal").classList.add("open");
}
function closeModal() { document.getElementById("modal").classList.remove("open"); }
document.getElementById("modal-close").onclick = closeModal;
document.getElementById("modal").onclick = (e) => { if (e.target.id === "modal") closeModal(); };

/* ── Status badge ────────────────────────────────── */
function badge(status) {
  const map = {
    PENDING:"badge-pending", ASSIGNED:"badge-assigned", CONFIRMED:"badge-confirmed",
    COMPLETED:"badge-completed", REJECTED:"badge-rejected", CANCELED:"badge-canceled",
  };
  const labels = {
    PENDING:"대기중", ASSIGNED:"검토중", CONFIRMED:"일정확정",
    COMPLETED:"상담완료", REJECTED:"반려", CANCELED:"취소",
  };
  return `<span class="badge ${map[status]||""}">${labels[status]||status}</span>`;
}

const fmtDate = ts => ts ? new Date(ts * 1000).toLocaleDateString("ko-KR") : "-";
const shortId = id => id ? id.slice(0,8)+"…" : "-";

/* ═══ AUTH ══════════════════════════════════════════ */
document.querySelectorAll(".auth-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".auth-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".auth-form").forEach(f => f.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.auth + "-form").classList.add("active");
  });
});

document.querySelectorAll(".role-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".role-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("signup-role").value = btn.dataset.role;
    document.getElementById("mentee-fields").style.display = btn.dataset.role === "mentee" ? "" : "none";
    document.getElementById("mentor-fields").style.display = btn.dataset.role === "mentor" ? "" : "none";
  });
});

document.getElementById("login-form").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    const data = await api("POST", "/auth/login", {
      nickname: document.getElementById("login-nickname").value.trim(),
      password: document.getElementById("login-password").value,
    });
    setSession(data.access_token, data.user);
    toast("로그인했습니다.", "success");
    launchApp();
  } catch (err) { toast(err.message, "error"); }
});

document.getElementById("signup-form").addEventListener("submit", async e => {
  e.preventDefault();
  const role = document.getElementById("signup-role").value;
  const body = {
    nickname: document.getElementById("signup-nickname").value.trim(),
    password: document.getElementById("signup-password").value,
    role,
  };
  if (role === "mentee") {
    body.major = document.getElementById("signup-major").value.trim();
    const raw = document.getElementById("signup-interest").value;
    body.interest_fields = raw.split(",").map(s => s.trim()).filter(Boolean);
  } else {
    const raw = document.getElementById("signup-mentor-fields").value;
    body.mentor_fields = raw.split(",").map(s => s.trim()).filter(Boolean);
    body.intro = document.getElementById("signup-intro").value.trim();
  }
  try {
    await api("POST", "/auth/signup", body);
    toast("가입이 완료됐습니다. 로그인해주세요.", "success");
    document.querySelector('[data-auth="login"]').click();
  } catch (err) { toast(err.message, "error"); }
});

/* ═══ APP SHELL ══════════════════════════════════════ */
function launchApp() {
  document.getElementById("auth-screen").style.display = "none";
  const app = document.getElementById("app-screen");
  app.classList.add("visible");
  const user = getUser();
  document.getElementById("user-name").textContent = user?.nickname || "-";
  document.getElementById("user-role").textContent = { mentee:"멘티", mentor:"멘토", admin:"관리자" }[user?.role] || user?.role;
  document.getElementById("user-avatar").textContent = (user?.nickname || "?")[0].toUpperCase();
  buildSidebar(user?.role);
}

document.getElementById("logout-btn").addEventListener("click", () => {
  clearSession();
  document.getElementById("app-screen").classList.remove("visible");
  document.getElementById("auth-screen").style.display = "";
  toast("로그아웃했습니다.");
});

const MENUS = {
  mentee: [
    { id:"my-requests",    icon:"📋", label:"내 신청 목록" },
    { id:"new-request",    icon:"✏️",  label:"멘토링 신청" },
    { id:"my-schedule",    icon:"📅", label:"일정 확인" },
    { id:"my-records",     icon:"📝", label:"상담 기록" },
  ],
  mentor: [
    { id:"mentor-requests", icon:"📥", label:"배정된 요청" },
    { id:"mentor-profile",  icon:"👤", label:"내 프로필" },
    { id:"mentor-schedule", icon:"📅", label:"일정 관리" },
  ],
  admin: [
    { id:"admin-overview",      icon:"📊", label:"대시보드" },
    { id:"admin-requests",      icon:"📋", label:"전체 신청 관리" },
    { id:"admin-mentors",       icon:"👥", label:"멘토 관리" },
    { id:"admin-assign",        icon:"🤝", label:"멘토 배정" },
    { id:"admin-verifications", icon:"🔍", label:"증빙 검토" },
    { id:"admin-records",       icon:"📝", label:"상담 기록" },
  ],
};

function buildSidebar(role) {
  const sidebar = document.getElementById("sidebar");
  const menus = MENUS[role] || [];
  sidebar.innerHTML = `
    <div class="sidebar-section">
      <div class="sidebar-label">메뉴</div>
      ${menus.map(m => `
        <div class="nav-item" data-page="${m.id}">
          <span class="nav-icon">${m.icon}</span>${m.label}
        </div>`).join("")}
    </div>`;
  sidebar.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", () => navigateTo(item.dataset.page));
  });
  if (menus.length) navigateTo(menus[0].id);
}

function navigateTo(pageId) {
  document.querySelectorAll(".nav-item").forEach(n => n.classList.toggle("active", n.dataset.page === pageId));
  renderPage(pageId);
}

/* ═══ PAGE ROUTER ════════════════════════════════════ */
async function renderPage(pageId) {
  const el = document.getElementById("main-content");
  el.innerHTML = `<div style="color:var(--muted);padding:2rem">불러오는 중...</div>`;
  try {
    switch (pageId) {
      case "my-requests":     await pageMenteeRequests(el); break;
      case "new-request":     pageNewRequest(el); break;
      case "my-schedule":     await pageMenteeSchedule(el); break;
      case "my-records":      await pageMenteeRecords(el); break;
      case "mentor-requests": await pageMentorRequests(el); break;
      case "mentor-profile":  await pageMentorProfile(el); break;
      case "mentor-schedule": await pageMentorSchedule(el); break;
      case "admin-overview":  await pageAdminOverview(el); break;
      case "admin-requests":  await pageAdminRequests(el); break;
      case "admin-mentors":   await pageAdminMentors(el); break;
      case "admin-assign":    await pageAdminAssign(el); break;
      case "admin-verifications": await pageAdminVerifications(el); break;
      case "admin-records":   await pageAdminRecords(el); break;
      default: el.innerHTML = "<p>준비 중입니다.</p>";
    }
  } catch (err) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
  }
}

function requestRow(r, actions = "") {
  return `<tr>
    <td class="text-mono" title="${r.request_id}">${shortId(r.request_id)}</td>
    <td>${r.interest_field||"-"}</td>
    <td>${r.topic||"-"}</td>
    <td>${badge(r.status)}</td>
    <td>${fmtDate(r.created_at)}</td>
    <td><div class="td-actions">${actions}</div></td>
  </tr>`;
}

/* ═══ MENTEE PAGES ═══════════════════════════════════ */
async function pageMenteeRequests(el) {
  const data = await api("GET", "/requests");
  const list = data?.requests || data || [];
  el.innerHTML = `
    <div class="page-header"><h2>내 신청 목록</h2><p>나의 멘토링 신청 현황입니다.</p></div>
    ${list.length === 0
      ? `<div class="empty-state"><div class="empty-icon">📭</div><p>아직 신청 내역이 없습니다.</p></div>`
      : `<div class="table-wrap"><table>
           <thead><tr><th>ID</th><th>관심분야</th><th>주제</th><th>상태</th><th>신청일</th><th>액션</th></tr></thead>
           <tbody>${list.map(r => {
             const actions = r.status === "PENDING"
               ? `<button class="btn btn-danger btn-sm" onclick="cancelRequest('${r.request_id}')">취소</button>` : "";
             return requestRow(r, actions);
           }).join("")}</tbody>
         </table></div>`}`;
}

async function cancelRequest(id) {
  if (!confirm("신청을 취소하시겠습니까?")) return;
  try {
    await api("PATCH", `/requests/${id}/cancel`);
    toast("신청이 취소됐습니다.", "success");
    navigateTo("my-requests");
  } catch (err) { toast(err.message, "error"); }
}

function pageNewRequest(el) {
  el.innerHTML = `
    <div class="page-header"><h2>멘토링 신청</h2><p>원하는 분야와 주제로 멘토링을 신청하세요.</p></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;align-items:start">
      <div class="card">
        <div class="card-title">✏️ 신청 내용</div>
        <div class="field"><label>관심 분야</label><input id="nr-field" placeholder="예: AWS" required></div>
        <div class="field"><label>상담 주제</label><input id="nr-topic" placeholder="예: EC2 인스턴스 설정" required></div>
        <div class="field"><label>요청 메시지</label><textarea id="nr-msg" placeholder="궁금한 내용을 자세히 적어주세요." required style="min-height:140px"></textarea></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:1.25rem">
        <div class="card">
          <div class="card-title">📅 희망 일정 <small style="font-weight:400;color:var(--muted)">선택</small></div>
          <div class="field"><label>희망 날짜</label><input id="nr-date" type="date"></div>
          <div class="field"><label>희망 시작 시간</label><input id="nr-time" type="time"></div>
        </div>
        <div class="card" style="background:var(--p-lt);border-color:#fcd9b6">
          <div style="font-size:.78rem;font-weight:700;color:var(--p-dk);margin-bottom:.4rem">💡 안내</div>
          <p style="font-size:.76rem;color:var(--ink-2);line-height:1.65">희망 날짜와 시간을 입력하면 해당 시간대에 가능한 멘토를 우선 추천해드립니다.</p>
        </div>
        <button class="btn btn-primary btn-full" style="font-size:.9rem;padding:.85rem" onclick="submitNewRequest()">신청하기 🚀</button>
      </div>
    </div>`;
}

async function submitNewRequest() {
  const body = {
    interest_field: document.getElementById("nr-field").value.trim(),
    topic: document.getElementById("nr-topic").value.trim(),
    message: document.getElementById("nr-msg").value.trim(),
  };
  const d = document.getElementById("nr-date").value;
  const t = document.getElementById("nr-time").value;
  if (d) body.preferred_date = d;
  if (t) body.preferred_time = t;
  if (!body.interest_field || !body.topic || !body.message) { toast("필수 항목을 입력해주세요.", "error"); return; }
  try {
    await api("POST", "/requests", body);
    toast("신청이 완료됐습니다.", "success");
    navigateTo("my-requests");
  } catch (err) { toast(err.message, "error"); }
}

async function pageMenteeSchedule(el) {
  const data = await api("GET", "/requests");
  const list = (data?.requests || data || []).filter(r => r.status === "CONFIRMED" && r.schedule);
  el.innerHTML = `
    <div class="page-header"><h2>확정된 일정</h2><p>멘토링 일정이 확정된 신청입니다.</p></div>
    ${list.length === 0
      ? `<div class="empty-state"><div class="empty-icon">📅</div><p>확정된 일정이 없습니다.</p></div>`
      : `<div class="card-grid">${list.map(r => {
          const s = r.schedule;
          const hasLink = !!s.meeting_link;
          return `<div class="card">
            <div class="card-title">${r.topic}</div>
            <p style="font-size:.8rem;color:var(--muted);margin-bottom:.75rem">${r.interest_field}</p>
            <div style="background:var(--green-lt);border:1.5px solid #86efac;border-radius:var(--r);padding:.85rem;margin-bottom:.85rem">
              <div style="font-weight:800;color:var(--green);font-size:.88rem">📅 ${s.date}</div>
              <div style="font-size:.8rem;color:var(--ink-2);margin-top:.2rem">${s.start_time} ~ ${s.end_time}</div>
            </div>
            ${hasLink
              ? `<a href="${s.meeting_link}" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:.5rem;padding:.7rem;background:#eff6ff;border:1.5px solid #93c5fd;border-radius:var(--r);font-size:.82rem;font-weight:700;color:#1d4ed8;text-decoration:none;margin-bottom:.75rem">🎥 화상 회의 참여하기</a>`
              : `<p style="font-size:.75rem;color:var(--muted);text-align:center;margin-bottom:.75rem">⏳ 화상 링크 등록 대기 중</p>`}
            ${badge(r.status)}
          </div>`;
        }).join("")}</div>`}`;
}

async function pageMenteeRecords(el) {
  const data = await api("GET", "/requests");
  const list = (data?.requests || data || []).filter(r => r.status === "COMPLETED");
  el.innerHTML = `
    <div class="page-header"><h2>상담 기록</h2><p>완료된 상담의 기록을 확인합니다.</p></div>
    ${list.length === 0
      ? `<div class="empty-state"><div class="empty-icon">📝</div><p>상담 기록이 없습니다.</p></div>`
      : `<div class="card-grid">${list.map(r => {
          const rec = r.record || {};
          return `<div class="card">
            <div class="card-title">${r.topic}</div>
            <p style="font-size:.78rem;color:var(--muted)">${r.interest_field} · ${fmtDate(r.created_at)}</p>
            <hr>
            <p style="font-size:.8rem;margin-bottom:.5rem"><strong>요약</strong><br>${rec.summary||"-"}</p>
            <p style="font-size:.8rem;margin-bottom:.5rem"><strong>후속 과제</strong><br>${rec.follow_up_task||"-"}</p>
            <p style="font-size:.8rem"><strong>다음 상담</strong> ${rec.needs_next_consultation ? "✅ 필요" : "❌ 불필요"}</p>
          </div>`;
        }).join("")}</div>`}`;
}

/* ═══ MENTOR PAGES ═══════════════════════════════════ */
async function pageMentorRequests(el) {
  const user = getUser();
  const data = await api("GET", `/mentors/${user.user_id}/requests`);
  const list = data?.requests || data || [];
  el.innerHTML = `
    <div class="page-header"><h2>배정된 요청</h2><p>나에게 배정된 멘토링 요청 목록입니다.</p></div>
    ${list.length === 0
      ? `<div class="empty-state"><div class="empty-icon">📥</div><p>배정된 요청이 없습니다.</p></div>`
      : `<div class="table-wrap"><table>
           <thead><tr><th>ID</th><th>관심분야</th><th>주제</th><th>상태</th><th>희망 일정</th><th>확정 일정</th><th>액션</th></tr></thead>
           <tbody>${list.map(r => {
             const sch = r.schedule ? `${r.schedule.date} ${r.schedule.start_time}` : "-";
             const pref = r.preferred_date
               ? `<span style="font-size:.73rem;color:var(--p);font-weight:600">${r.preferred_date}${r.preferred_time ? " "+r.preferred_time : ""}</span>`
               : `<span style="color:var(--muted);font-size:.73rem">미입력</span>`;
             let actions = "";
             if (r.status === "ASSIGNED") {
               actions = `
                 <button class="btn btn-success btn-sm" onclick="approveRequest('${r.request_id}','${r.preferred_date||''}','${r.preferred_time||''}')">승인</button>
                 <button class="btn btn-danger btn-sm" onclick="openRejectModal('${r.request_id}')">반려</button>`;
             } else if (r.status === "CONFIRMED") {
               const hasLink = !!r.schedule?.meeting_link;
               actions = `
                 <button class="btn btn-secondary btn-sm" onclick="openMeetingLinkModal('${r.request_id}','${r.schedule?.meeting_link||''}')" title="${hasLink?"링크 수정":"링크 등록"}">${hasLink?"🔗":"➕🔗"}</button>
                 <button class="btn btn-secondary btn-sm" onclick="openScheduleModal('${r.request_id}','${r.schedule?.date||''}','${r.schedule?.start_time||''}')">일정수정</button>
                 <button class="btn btn-primary btn-sm" onclick="completeRequest('${r.request_id}')">완료처리</button>`;
             } else if (r.status === "COMPLETED" && !r.record) {
               actions = `<button class="btn btn-primary btn-sm" onclick="openRecordModal('${r.request_id}')">기록작성</button>`;
             }
             return `<tr>
               <td class="text-mono" title="${r.request_id}">${shortId(r.request_id)}</td>
               <td>${r.interest_field||"-"}</td><td>${r.topic||"-"}</td>
               <td>${badge(r.status)}</td>
               <td>${pref}</td>
               <td style="font-size:.75rem">${sch}</td>
               <td><div class="td-actions">${actions}</div></td>
             </tr>`;
           }).join("")}</tbody>
         </table></div>`}`;
}

async function approveRequest(id, prefDate = "", prefTime = "") {
  try {
    await api("POST", `/assignments/${id}/approve`);
    toast("승인됐습니다. 일정을 등록해주세요.", "success");
    // 멘티의 희망 일정을 기본값으로 모달에 채워줌
    openScheduleModal(id, prefDate, prefTime);
  } catch (err) { toast(err.message, "error"); }
}

function openRejectModal(id) {
  openModal("배정 반려",
    `<div class="field"><label>반려 사유</label><textarea id="reject-reason" placeholder="반려 사유를 입력하세요."></textarea></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">취소</button>
     <button class="btn btn-danger" onclick="rejectRequest('${id}')">반려</button>`);
}

async function rejectRequest(id) {
  const reason = document.getElementById("reject-reason")?.value.trim();
  if (!reason) { toast("반려 사유를 입력해주세요.", "error"); return; }
  try {
    await api("POST", `/assignments/${id}/reject`, { reject_reason: reason });
    toast("반려됐습니다.", "success");
    closeModal();
    navigateTo("mentor-requests");
  } catch (err) { toast(err.message, "error"); }
}

function openScheduleModal(id, date, time) {
  const prefHint = date
    ? `<div style="display:flex;align-items:center;gap:.5rem;padding:.65rem .9rem;background:var(--p-lt);border:1.5px solid #fcd9b6;border-radius:var(--r);margin-bottom:1rem;font-size:.8rem;color:var(--p-dk);font-weight:600">
        💡 멘티 희망 일정: <strong>${date}${time ? " "+time : ""}</strong>
        ${date ? `<button type="button" class="btn btn-secondary btn-sm" style="margin-left:auto;padding:.25rem .6rem;font-size:.72rem" onclick="document.getElementById('sch-date').value='${date}';${time?`document.getElementById('sch-time').value='${time}';`:''}" >그대로 사용</button>` : ""}
      </div>`
    : `<p style="font-size:.78rem;color:var(--muted);margin-bottom:1rem">멘티가 희망 일정을 입력하지 않았습니다.</p>`;
  openModal("일정 등록/수정",
    `${prefHint}
     <p style="font-size:.8rem;color:var(--muted);margin-bottom:1rem">종료 시간은 시작 시간 +2시간으로 자동 설정됩니다.</p>
     <div class="field"><label>날짜</label><input id="sch-date" type="date" value="${date}"></div>
     <div class="field"><label>시작 시간</label><input id="sch-time" type="time" value="${time}"></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">취소</button>
     <button class="btn btn-primary" onclick="saveSchedule('${id}')">저장</button>`);
}

async function saveSchedule(id) {
  const date  = document.getElementById("sch-date")?.value;
  const start = document.getElementById("sch-time")?.value;
  if (!date || !start) { toast("날짜와 시간을 입력해주세요.", "error"); return; }
  try {
    await api("POST", `/requests/${id}/schedule`, { date, start_time: start });
    toast("일정이 등록됐습니다.", "success");
    closeModal();
    navigateTo("mentor-requests");
  } catch (err) { toast(err.message, "error"); }
}

async function completeRequest(id) {
  if (!confirm("상담을 완료 처리하시겠습니까?")) return;
  try {
    await api("PATCH", `/requests/${id}/complete`);
    toast("완료 처리됐습니다. 기록을 작성해주세요.", "success");
    navigateTo("mentor-requests");
  } catch (err) { toast(err.message, "error"); }
}

function openRecordModal(id) {
  openModal("상담 기록 작성",
    `<div class="field"><label>상담 요약</label><textarea id="rec-summary" placeholder="오늘 상담 내용 요약"></textarea></div>
     <div class="field"><label>후속 과제</label><textarea id="rec-task" placeholder="다음까지 할 과제"></textarea></div>
     <div class="checkbox-row">
       <input id="rec-next" type="checkbox">
       <label for="rec-next">다음 상담 필요</label>
     </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">취소</button>
     <button class="btn btn-primary" onclick="submitRecord('${id}')">작성 완료</button>`);
}

async function submitRecord(id) {
  const summary  = document.getElementById("rec-summary")?.value.trim();
  const task     = document.getElementById("rec-task")?.value.trim();
  const needsNext = document.getElementById("rec-next")?.checked || false;
  if (!summary || !task) { toast("내용을 입력해주세요.", "error"); return; }
  try {
    await api("POST", "/records", { request_id: id, summary, follow_up_task: task, needs_next_consultation: needsNext });
    toast("기록이 저장됐습니다.", "success");
    closeModal();
    navigateTo("mentor-requests");
  } catch (err) { toast(err.message, "error"); }
}

/* ── Verification ─────────────────────────────────── */
function openVerificationUpload(mentorId, field) {
  openModal(`"${field}" 증빙 파일 업로드`,
    `<p style="font-size:.82rem;color:var(--muted);margin-bottom:1.25rem;line-height:1.7">
       자격증, 수료증, 학위증 등 전문성을 증명할 수 있는 파일을 업로드하세요.<br>
       운영자 검토 후 ✅ 검증됨 태그가 부여됩니다.
     </p>
     <div id="drop-zone"
       style="border:2px dashed var(--line);border-radius:var(--r-lg);padding:2rem;text-align:center;cursor:pointer;transition:all .18s;background:var(--surf-2)"
       onclick="document.getElementById('verify-file').click()"
       ondragover="event.preventDefault();this.style.borderColor='var(--p)';this.style.background='var(--p-lt)'"
       ondragleave="this.style.borderColor='var(--line)';this.style.background='var(--surf-2)'"
       ondrop="event.preventDefault();this.style.borderColor='var(--line)';this.style.background='var(--surf-2)';handleVerifyDrop(event)">
       <div style="font-size:2rem;margin-bottom:.5rem">📎</div>
       <div style="font-weight:700;color:var(--ink);margin-bottom:.25rem">클릭하거나 파일을 드래그하세요</div>
       <div style="font-size:.75rem;color:var(--muted)">PDF, JPG, PNG, DOCX 등 모든 형식 지원</div>
     </div>
     <input id="verify-file" type="file" style="display:none" onchange="showVerifyFileName(this)">
     <div id="verify-filename" style="display:none;margin-top:.75rem;padding:.6rem .9rem;background:var(--p-lt);border:1.5px solid #fcd9b6;border-radius:var(--r);font-size:.8rem;font-weight:600;color:var(--p-dk)"></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">취소</button>
     <button class="btn btn-primary" id="verify-submit-btn" onclick="submitVerification('${mentorId}','${field}')">업로드</button>`
  );
}

function showVerifyFileName(input) {
  const name = input.files[0]?.name;
  const zone = document.getElementById("drop-zone");
  const label = document.getElementById("verify-filename");
  if (name) {
    label.style.display = "block";
    label.innerHTML = `📄 ${name}`;
    if (zone) { zone.style.borderColor = "var(--p)"; zone.style.background = "var(--p-lt)"; }
  }
}

function handleVerifyDrop(e) {
  const file = e.dataTransfer.files[0];
  if (!file) return;
  const input = document.getElementById("verify-file");
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
  showVerifyFileName(input);
}

async function submitVerification(mentorId, field) {
  const fileInput = document.getElementById("verify-file");
  if (!fileInput?.files?.length) { toast("파일을 선택해주세요.", "error"); return; }
  const file = fileInput.files[0];

  // 버튼 비활성화 + 진행 표시
  const submitBtn = document.querySelector("#modal-footer .btn-primary");
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "업로드 중..."; }

  try {
    // 1. Presigned URL 요청 (파일 MIME 타입 함께 전달)
    const data = await api("POST", `/mentors/${mentorId}/verifications`, {
      field,
      filename:     file.name,
      content_type: file.type || "application/octet-stream",
    });

    // 2. S3에 직접 PUT 업로드 (Content-Type 헤더 포함)
    const res = await fetch(data.upload_url, {
      method:  "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body:    file,
    });
    if (!res.ok) throw new Error(`S3 업로드 실패: HTTP ${res.status}`);

    toast(`"${field}" 증빙 파일이 업로드됐습니다. 운영자 검토 후 태그가 부여됩니다.`, "success");
    closeModal();
    // getUser()로 최신 user 정보 가져와서 재렌더링
    navigateTo("mentor-profile");
  } catch (err) {
    toast(err.message, "error");
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "업로드"; }
  }
}

async function pageAdminVerifications(el) {
  const data = await api("GET", "/admin/verifications");
  const list = data?.pending || data || [];
  el.innerHTML = `
    <div class="page-header"><h2>증빙 검토</h2><p>멘토가 제출한 전문 분야 증빙 목록입니다.</p></div>
    ${list.length === 0
      ? `<div class="empty-state"><div class="empty-icon">📋</div><p>검토 대기 중인 증빙이 없습니다.</p></div>`
      : `<div style="display:flex;flex-direction:column;gap:1rem">
           ${list.map(m => `
             <div class="card">
               <div class="card-title">👤 ${m.nickname} <span class="text-mono text-muted" style="font-size:.72rem">${shortId(m.mentor_id)}</span></div>
               <div style="display:flex;flex-direction:column;gap:.75rem">
                 ${m.pending_verifications.map(v => `
                   <div style="display:flex;align-items:center;gap:.75rem;padding:.85rem;background:var(--surf-2);border-radius:var(--r);border:1.5px solid var(--line)">
                     <div style="flex:1">
                       <div style="font-weight:700;color:var(--ink);margin-bottom:.2rem">🏷️ ${v.field}</div>
                       <div style="font-size:.75rem;color:var(--muted)">${new Date((v.submitted_at||0)*1000).toLocaleString("ko-KR")}</div>
                     </div>
                     ${v.view_url ? `<a href="${v.view_url}" target="_blank" class="btn btn-secondary btn-sm">📄 파일 보기</a>` : `<span style="font-size:.75rem;color:var(--muted)">파일 없음</span>`}
                     <button class="btn btn-success btn-sm" onclick="reviewVerification('${m.mentor_id}','${v.field}','approve')">✅ 승인</button>
                     <button class="btn btn-danger btn-sm" onclick="openRejectVerification('${m.mentor_id}','${v.field}')">❌ 거절</button>
                   </div>`).join("")}
               </div>
             </div>`).join("")}
         </div>`}`;
}

async function reviewVerification(mentorId, field, action, rejectReason) {
  try {
    const body = { action, field };
    if (rejectReason) body.reject_reason = rejectReason;
    await api("PATCH", `/admin/verifications/${mentorId}`, body);
    toast(action === 'approve' ? `"${field}" 승인됐습니다.` : `"${field}" 거절됐습니다.`, "success");
    closeModal();
    navigateTo("admin-verifications");
  } catch (err) { toast(err.message, "error"); }
}

function openRejectVerification(mentorId, field) {
  openModal(`"${field}" 증빙 거절`,
    `<div class="field"><label>거절 사유</label><textarea id="reject-verify-reason" placeholder="거절 사유를 입력하세요."></textarea></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">취소</button>
     <button class="btn btn-danger" onclick="reviewVerification('${mentorId}','${field}','reject',document.getElementById('reject-verify-reason').value.trim())">거절</button>`
  );
}

function openMeetingLinkModal(requestId, currentLink) {
  openModal("화상 회의 링크 등록",
    `<p style="font-size:.82rem;color:var(--muted);margin-bottom:1rem">Zoom, Google Meet, Teams 등 화상 회의 링크를 등록하세요.</p>
     <div class="field">
       <label>화상 링크 URL</label>
       <input id="meeting-link-input" type="url" placeholder="https://zoom.us/j/..." value="${currentLink||''}">
     </div>
     ${currentLink ? `<a href="${currentLink}" target="_blank" style="font-size:.78rem;color:var(--blue);font-weight:600;text-decoration:none">🔗 현재 링크 열기</a>` : ""}`,
    `<button class="btn btn-secondary" onclick="closeModal()">취소</button>
     <button class="btn btn-primary" onclick="saveMeetingLink('${requestId}')">저장</button>`);
  setTimeout(() => document.getElementById("meeting-link-input")?.focus(), 100);
}

async function saveMeetingLink(requestId) {
  const link = document.getElementById("meeting-link-input")?.value.trim();
  if (!link) { toast("링크를 입력해주세요.", "error"); return; }
  if (!link.startsWith("http://") && !link.startsWith("https://")) {
    toast("http:// 또는 https://로 시작하는 URL을 입력해주세요.", "error"); return;
  }
  try {
    await api("PATCH", `/requests/${requestId}/schedule/link`, { meeting_link: link });
    toast("화상 링크가 등록됐습니다. 🎥", "success");
    closeModal();
    navigateTo("mentor-schedule");
  } catch (err) { toast(err.message, "error"); }
}

async function pageMentorProfile(el) {
  const user = getUser();
  const data = await api("GET", `/mentors/${user.user_id}`);
  const saved = data.available_times || {};
  const DAYS = [
    { key:"MON", label:"월" }, { key:"TUE", label:"화" },
    { key:"WED", label:"수" }, { key:"THU", label:"목" },
    { key:"FRI", label:"금" },
  ];
  const opts = (sel) => Array.from({length:24}, (_,i) =>
    `<option value="${i}" ${i===sel?"selected":""}>${String(i).padStart(2,"0")}:00</option>`).join("");
  const dayBoxes = DAYS.map(d => {
    const isActive = !!saved[d.key];
    const sv = saved[d.key]?.start ?? 9;
    const ev = saved[d.key]?.end   ?? 18;
    return `<div style="display:flex;align-items:center;gap:.75rem;padding:.75rem 0;border-bottom:1.5px solid var(--line)">
      <button type="button" id="daybtn-${d.key}" class="btn btn-sm ${isActive?"btn-primary":"btn-secondary"}" style="width:46px;flex-shrink:0;font-weight:800" onclick="toggleDay('${d.key}')">${d.label}</button>
      <div id="time-${d.key}" style="display:${isActive?"flex":"none"};align-items:center;gap:.5rem;flex:1">
        <select id="start-${d.key}" style="flex:1;padding:.5rem .65rem;border:2px solid var(--line);border-radius:10px;font-size:.8rem;font-weight:600;background:var(--surf)">${opts(sv)}</select>
        <span style="color:var(--muted);font-size:.82rem;white-space:nowrap;font-weight:700">~</span>
        <select id="end-${d.key}"   style="flex:1;padding:.5rem .65rem;border:2px solid var(--line);border-radius:10px;font-size:.8rem;font-weight:600;background:var(--surf)">${opts(ev)}</select>
      </div>
      <span id="time-off-${d.key}" style="display:${isActive?"none":"block"};color:var(--muted);font-size:.75rem;font-weight:600;padding:.3rem .7rem;background:var(--surf-2);border-radius:8px">불가</span>
    </div>`;
  }).join("");

  el.innerHTML = `
    <div class="page-header"><h2>내 프로필</h2></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;align-items:start">
      <div style="display:flex;flex-direction:column;gap:1.25rem">
        <div class="card">
          <div style="display:flex;align-items:center;gap:1rem;padding-bottom:1.25rem;margin-bottom:1.25rem;border-bottom:2px solid var(--line)">
            <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#f97316,#fbbf24);display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.35rem;font-weight:900;flex-shrink:0;box-shadow:0 4px 12px rgba(249,115,22,.3)">
              ${(data.nickname||"?")[0].toUpperCase()}
            </div>
            <div style="flex:1">
              <div style="font-size:1.05rem;font-weight:800;color:var(--ink)">${data.nickname}</div>
              <div style="font-size:.75rem;color:var(--muted);margin-top:.15rem">멘토 계정</div>
            </div>
            <div style="display:flex;align-items:center;gap:.6rem;padding:.5rem .85rem;border-radius:99px;border:2px solid ${data.mentor_active ? "#86efac" : "#f0ddd4"};background:${data.mentor_active ? "#f0fdf4" : "#f8fafc"};cursor:pointer" onclick="toggleMentorActive('${user.user_id}',${data.mentor_active})">
              <span style="font-size:.72rem;font-weight:800;color:${data.mentor_active ? "#15803d" : "#94a3b8"}">${data.mentor_active ? "🟢 활성" : "⚫ 비활성"}</span>
            </div>
          </div>
          <div class="field"><label>소개글</label><textarea id="p-intro" style="min-height:120px">${data.intro||""}</textarea></div>
          <button class="btn btn-primary btn-full" onclick="updateIntro('${user.user_id}')">소개 저장</button>
        </div>
        <div class="card">
          <div style="font-size:.88rem;font-weight:800;color:var(--ink);margin-bottom:.75rem">🏷️ 전문 분야</div>
          <div style="display:flex;flex-wrap:wrap;gap:.5rem;min-height:36px;margin-bottom:1rem;padding:.75rem;background:var(--surf-2);border-radius:var(--r);border:2px solid var(--line)">
            ${(data.mentor_fields||[]).map(f => {
              const isVerified = (data.verified_fields||[]).includes(f);
              const vList = (data.field_verifications||[]).filter(v => v.field === f);
              const latest = vList[vList.length - 1];

              // 상태별 스타일
              let bg, border, color, badge, showBtn;
              if (isVerified) {
                bg = "#f0fdf4"; border = "#86efac"; color = "#15803d";
                badge = `<span style="font-size:.62rem;font-weight:800">✅ 검증됨</span>`;
                showBtn = false;
              } else if (latest?.status === 'pending') {
                bg = "#fffbeb"; border = "#fde68a"; color = "#92400e";
                badge = `<span style="font-size:.62rem;font-weight:800">⏳ 검토중</span>`;
                showBtn = false;
              } else if (latest?.status === 'rejected') {
                bg = "#fff1f2"; border = "#fda4af"; color = "#be123c";
                badge = `<span style="font-size:.62rem;font-weight:800">❌ 거절됨</span>`;
                showBtn = true;
              } else {
                bg = "#f8fafc"; border = "#cbd5e1"; color = "#475569";
                badge = `<span style="font-size:.62rem;font-weight:800">미검증</span>`;
                showBtn = true;
              }

              return `<div style="display:inline-flex;align-items:center;gap:.35rem;padding:.35rem .75rem;background:${bg};border:1.5px solid ${border};border-radius:99px;transition:all .15s">
                <span style="font-size:.8rem;font-weight:800;color:${color}">${f}</span>
                <span style="color:${color};opacity:.85">${badge}</span>
                ${showBtn
                  ? `<button class="btn btn-ghost btn-sm" style="padding:.1rem .4rem;font-size:.68rem;color:${color};opacity:.75" onclick="openVerificationUpload('${user.user_id}','${f}')">📎</button>`
                  : ''}
              </div>`;
            }).join("")||`<span style="color:var(--muted);font-size:.78rem">미설정</span>`}
          </div>
          <div class="field" style="margin-bottom:.75rem">
            <label>분야 수정 <small>쉼표로 구분</small></label>
            <input id="p-fields" value="${(data.mentor_fields||[]).join(", ")}" placeholder="AWS, Backend, Docker">
          </div>
          <button class="btn btn-primary btn-full" onclick="updateFields('${user.user_id}')">분야 저장</button>
        </div>
      </div>
      <div class="card" style="height:fit-content">
        <div style="font-size:.88rem;font-weight:800;color:var(--ink);margin-bottom:.4rem">📅 상담 가능 시간</div>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:1rem">가능한 요일 버튼을 눌러 활성화하고 시간을 설정하세요.</p>
        <div>${dayBoxes}</div>
        <button class="btn btn-primary btn-full" style="margin-top:1.25rem" onclick="updateTimes('${user.user_id}')">시간 저장</button>
      </div>
    </div>`;
}

function toggleDay(key) {
  const btn    = document.getElementById(`daybtn-${key}`);
  const timeEl = document.getElementById(`time-${key}`);
  const offEl  = document.getElementById(`time-off-${key}`);
  const isOn   = timeEl.style.display !== "none";
  timeEl.style.display = isOn ? "none" : "flex";
  offEl.style.display  = isOn ? "block" : "none";
  btn.className = isOn ? "btn btn-sm btn-secondary" : "btn btn-sm btn-primary";
}

async function toggleMentorActive(id, currentActive) {
  const isActive = currentActive === true || currentActive === "true";
  const next = !isActive;
  const label = next ? "활성" : "비활성";
  if (!confirm(`멘토 상태를 ${label}으로 변경하시겠습니까?\n${next ? "활성화 시 멘토 후보에 포함됩니다." : "비활성화 시 멘토 후보에서 제외됩니다."}`)) return;
  try {
    await api("PATCH", `/mentors/${id}/active`, { mentor_active: next });
    toast(`${label} 상태로 변경됐습니다.`, "success");
    // 배지만 즉시 DOM 업데이트 (재렌더링 없이)
    const badge = document.querySelector(`[onclick^="toggleMentorActive"]`);
    if (badge) {
      badge.style.borderColor = next ? "#86efac" : "#f0ddd4";
      badge.style.background  = next ? "#f0fdf4" : "#f8fafc";
      badge.setAttribute("onclick", `toggleMentorActive('${id}',${next})`);
      const span = badge.querySelector("span");
      if (span) {
        span.style.color = next ? "#15803d" : "#94a3b8";
        span.textContent = next ? "🟢 활성" : "⚫ 비활성";
      }
    }
  } catch (err) { toast(err.message, "error"); }
}

async function updateIntro(id) {
  try {
    await api("PUT", `/mentors/${id}`, { intro: document.getElementById("p-intro").value.trim() });
    toast("소개가 저장됐습니다.", "success");
  } catch (err) { toast(err.message, "error"); }
}

async function updateFields(id) {
  const mentor_fields = document.getElementById("p-fields").value.split(",").map(s=>s.trim()).filter(Boolean);
  try {
    await api("PUT", `/mentors/${id}/fields`, { mentor_fields });
    toast("전문 분야가 저장됐습니다.", "success");
  } catch (err) { toast(err.message, "error"); }
}

async function updateTimes(id) {
  const DAYS = ["MON","TUE","WED","THU","FRI"];
  const available_times = {};
  for (const key of DAYS) {
    const timeEl = document.getElementById(`time-${key}`);
    if (!timeEl || timeEl.style.display === "none") continue;
    const start = parseInt(document.getElementById(`start-${key}`)?.value || "9");
    const end   = parseInt(document.getElementById(`end-${key}`)?.value   || "18");
    if (end <= start) { toast(`${key}: 종료 시간이 시작 시간보다 늦어야 합니다.`, "error"); return; }
    available_times[key] = { start, end };
  }
  try {
    await api("PUT", `/mentors/${id}/times`, { available_times });
    toast("상담 가능 시간이 저장됐습니다.", "success");
  } catch (err) { toast(err.message, "error"); }
}

async function pageMentorSchedule(el) {
  const user = getUser();
  const data = await api("GET", `/mentors/${user.user_id}/requests`);
  const list = (data?.requests || data || []).filter(r => r.status === "CONFIRMED");
  el.innerHTML = `
    <div class="page-header"><h2>일정 관리</h2><p>확정된 상담 일정입니다.</p></div>
    ${list.length === 0
      ? `<div class="empty-state"><div class="empty-icon">📅</div><p>확정된 일정이 없습니다.</p></div>`
      : `<div class="card-grid">${list.map(r => {
          const s = r.schedule || {};
          const hasLink = !!s.meeting_link;
          return `<div class="card">
            <div class="card-title">${r.topic}</div>
            <p style="font-size:.8rem;color:var(--muted);margin-bottom:.75rem">${r.interest_field}</p>
            <div style="background:var(--green-lt);border:1.5px solid #86efac;border-radius:var(--r);padding:.85rem;margin-bottom:.85rem">
              <div style="font-weight:800;color:var(--green);font-size:.88rem">📅 ${s.date||"-"}</div>
              <div style="font-size:.8rem;color:var(--ink-2);margin-top:.2rem">${s.start_time||"-"} ~ ${s.end_time||"-"}</div>
            </div>
            ${hasLink
              ? `<a href="${s.meeting_link}" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:.5rem;padding:.65rem;background:#eff6ff;border:1.5px solid #93c5fd;border-radius:var(--r);font-size:.8rem;font-weight:700;color:#1d4ed8;text-decoration:none;margin-bottom:.75rem">🎥 화상 회의 링크 열기</a>`
              : `<p style="font-size:.75rem;color:var(--muted);margin-bottom:.5rem">화상 링크가 아직 등록되지 않았습니다.</p>`}
            <div style="display:flex;gap:.5rem">
              <button class="btn btn-secondary btn-sm" style="flex:1" onclick="openMeetingLinkModal('${r.request_id}','${s.meeting_link||''}')">${hasLink?"🔗 링크 수정":"🔗 링크 등록"}</button>
              <button class="btn btn-secondary btn-sm" onclick="openScheduleModal('${r.request_id}','${s.date||''}','${s.start_time||''}')">일정 수정</button>
              <button class="btn btn-primary btn-sm" onclick="completeRequest('${r.request_id}')">완료</button>
            </div>
          </div>`;
        }).join("")}</div>`}`;
}

/* ═══ ADMIN PAGES ════════════════════════════════════ */
async function pageAdminOverview(el) {
  const [allData, mentorsData] = await Promise.all([
    api("GET", "/admin/requests"),
    api("GET", "/admin/mentors"),
  ]);
  const reqs    = allData?.requests || allData || [];
  const mentors = mentorsData?.mentors || mentorsData || [];
  const count   = s => reqs.filter(r => r.status === s).length;
  el.innerHTML = `
    <div class="page-header"><h2>대시보드</h2><p>전체 멘토링 현황입니다.</p></div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">전체 신청</div><div class="stat-value primary">${reqs.length}</div></div>
      <div class="stat-card"><div class="stat-label">대기중</div><div class="stat-value warn">${count("PENDING")}</div></div>
      <div class="stat-card"><div class="stat-label">배정됨</div><div class="stat-value">${count("ASSIGNED")}</div></div>
      <div class="stat-card"><div class="stat-label">일정확정</div><div class="stat-value">${count("CONFIRMED")}</div></div>
      <div class="stat-card"><div class="stat-label">상담완료</div><div class="stat-value success">${count("COMPLETED")}</div></div>
      <div class="stat-card"><div class="stat-label">활성 멘토</div><div class="stat-value primary">${mentors.filter(m=>m.mentor_active).length}</div></div>
    </div>
    <div class="section-title">최근 PENDING 신청</div>
    <div class="table-wrap"><table>
      <thead><tr><th>ID</th><th>관심분야</th><th>주제</th><th>상태</th><th>신청일</th><th>액션</th></tr></thead>
      <tbody>${reqs.filter(r=>r.status==="PENDING").slice(0,5).map(r =>
        requestRow(r, `<button class="btn btn-primary btn-sm" onclick="navigateTo('admin-assign')">배정</button>`)
      ).join("") || "<tr><td colspan='6' style='text-align:center;color:var(--muted);padding:1.5rem'>없음</td></tr>"}</tbody>
    </table></div>`;
}

async function pageAdminRequests(el) {
  let status = "";
  const render = async () => {
    const qs   = status ? `?status=${status}` : "";
    const data = await api("GET", `/admin/requests${qs}`);
    const list = data?.requests || data || [];
    document.getElementById("req-list").innerHTML = list.length === 0
      ? `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:2rem">없음</td></tr>`
      : list.map(r => requestRow(r, `<button class="btn btn-secondary btn-sm" onclick="viewRequestDetail('${r.request_id}')">상세</button>`)).join("");
  };
  el.innerHTML = `
    <div class="page-header"><h2>전체 신청 관리</h2></div>
    <div style="display:flex;gap:.5rem;margin-bottom:1rem;flex-wrap:wrap">
      ${["","PENDING","ASSIGNED","CONFIRMED","COMPLETED","REJECTED","CANCELED"].map(s =>
        `<button class="btn btn-secondary btn-sm" onclick="filterAdminRequests('${s}',this)">${s||"전체"}</button>`
      ).join("")}
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>ID</th><th>관심분야</th><th>주제</th><th>상태</th><th>신청일</th><th>액션</th></tr></thead>
      <tbody id="req-list"><tr><td colspan="6" style="text-align:center;color:var(--muted);padding:2rem">불러오는 중...</td></tr></tbody>
    </table></div>`;
  window.filterAdminRequests = async (s, btn) => {
    document.querySelectorAll(".page-header ~ div .btn").forEach(b => { b.style.background=""; b.style.color=""; });
    if (btn) { btn.style.background="var(--p)"; btn.style.color="#fff"; }
    status = s; await render();
  };
  await render();
}

async function viewRequestDetail(id) {
  const data = await api("GET", `/requests/${id}`);
  openModal("신청 상세", `
    <div style="font-size:.82rem;display:flex;flex-direction:column;gap:.5rem">
      <div><strong>ID</strong>: <span class="text-mono">${data.request_id}</span></div>
      <div><strong>상태</strong>: ${badge(data.status)}</div>
      <div><strong>관심분야</strong>: ${data.interest_field}</div>
      <div><strong>주제</strong>: ${data.topic}</div>
      <div><strong>메시지</strong>: ${data.message}</div>
      <div><strong>멘티 ID</strong>: <span class="text-mono">${shortId(data.mentee_user_id)}</span></div>
      <div><strong>멘토 ID</strong>: <span class="text-mono">${data.mentor_user_id ? shortId(data.mentor_user_id) : "미배정"}</span></div>
      ${data.schedule ? `<div><strong>일정</strong>: ${data.schedule.date} ${data.schedule.start_time}~${data.schedule.end_time}</div>` : ""}
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">닫기</button>`);
}

async function pageAdminMentors(el) {
  const data = await api("GET", "/admin/mentors");
  const list = data?.mentors || data || [];
  el.innerHTML = `
    <div class="page-header"><h2>멘토 관리</h2><p>전체 멘토 목록과 활성 상태입니다.</p></div>
    <div class="table-wrap"><table>
      <thead><tr><th>전문 분야</th><th>상태</th><th>액션</th></tr></thead>
      <tbody>${list.length === 0
        ? `<tr><td colspan="3" style="text-align:center;color:var(--muted);padding:2rem">없음</td></tr>`
        : list.map(m => `<tr>
            <td>${(m.mentor_fields||[]).map(f=>`<span class="chip">${f}</span>`).join("")||"-"}</td>
            <td><span class="badge ${m.mentor_active?"badge-active":"badge-inactive"}">${m.mentor_active?"활성":"비활성"}</span></td>
            <td><button class="btn btn-secondary btn-sm" onclick="viewMentorStats('${m.user_id}')">통계</button></td>
          </tr>`).join("")}
      </tbody>
    </table></div>`;
}

async function viewMentorStats(id) {
  const data = await api("GET", `/admin/mentors/${id}/stats`);
  openModal("멘토 통계", `
    <div class="stats-grid" style="grid-template-columns:repeat(2,1fr)">
      <div class="stat-card"><div class="stat-label">전체 배정</div><div class="stat-value primary">${data.total_assigned}</div></div>
      <div class="stat-card"><div class="stat-label">상담 완료</div><div class="stat-value success">${data.total_completed}</div></div>
      <div class="stat-card"><div class="stat-label">배정됨</div><div class="stat-value">${data.by_status?.ASSIGNED||0}</div></div>
      <div class="stat-card"><div class="stat-label">일정확정</div><div class="stat-value">${data.by_status?.CONFIRMED||0}</div></div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">닫기</button>`);
}

async function pageAdminAssign(el) {
  const data    = await api("GET", "/admin/requests?status=PENDING");
  const pending = data?.requests || data || [];
  el.innerHTML  = `
    <div class="page-header"><h2>멘토 배정</h2><p>PENDING 상태 신청에 멘토를 배정합니다.</p></div>
    ${pending.length === 0
      ? `<div class="empty-state"><div class="empty-icon">✅</div><p>배정 대기 중인 신청이 없습니다.</p></div>`
      : `<div class="table-wrap"><table>
           <thead><tr><th>ID</th><th>관심분야</th><th>주제</th><th>신청일</th><th>액션</th></tr></thead>
           <tbody>${pending.map(r => `<tr>
             <td class="text-mono" title="${r.request_id}">${shortId(r.request_id)}</td>
             <td>${r.interest_field}</td><td>${r.topic}</td><td>${fmtDate(r.created_at)}</td>
             <td><button class="btn btn-primary btn-sm" onclick="openAssignModal('${r.request_id}','${r.interest_field}')">후보 조회 및 배정</button></td>
           </tr>`).join("")}</tbody>
         </table></div>`}`;
}

async function openAssignModal(requestId, interestField) {
  openModal("멘토 후보 조회", `<div style="color:var(--muted);padding:1rem 0">후보를 불러오는 중...</div>`);
  try {
    const data       = await api("GET", `/requests/${requestId}/candidates`);
    const candidates = data?.candidates || data || [];
    if (candidates.length === 0) {
      document.getElementById("modal-body").innerHTML =
        `<div class="empty-state"><div class="empty-icon">🔍</div><p>관심 분야 "<strong>${interestField}</strong>"에 매칭되는 멘토가 없습니다.</p></div>`;
      return;
    }
    document.getElementById("modal-body").innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
        <p style="font-size:.82rem;color:var(--ink-2)">관심 분야 <strong style="color:var(--p)">${interestField}</strong> 기준 · 총 ${candidates.length}명</p>
        <span style="font-size:.72rem;color:var(--muted)">유사도순 정렬</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:.75rem">
        ${candidates.map(c => {
          const pct = Math.round((c.match_score||0)*100);
          const col = pct>=90 ? "var(--green)" : pct>=75 ? "var(--p)" : "var(--sec)";
          const fields = (c.mentor_fields||[]).map(f =>
            `<span style="display:inline-block;padding:.18rem .55rem;background:var(--p-lt);color:var(--p-dk);border:1.5px solid #fbbf8a;border-radius:99px;font-size:.68rem;font-weight:700;margin:.1rem">${f}</span>`
          ).join("");
          return `<div style="border:1.5px solid var(--line);border-radius:14px;padding:1rem;background:var(--surf)">
            <div style="display:flex;align-items:flex-start;gap:.85rem">
              <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--p),var(--sec));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:.9rem;flex-shrink:0">?</div>
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem">
                  <span style="font-size:.68rem;font-weight:700;padding:.15rem .5rem;background:${col}20;color:${col};border-radius:99px;border:1.5px solid ${col}50">유사도 ${pct}%</span>
                  ${c.available ? `<span style="font-size:.68rem;color:var(--green);font-weight:700">⏰ 가능시간 설정됨</span>` : `<span style="font-size:.68rem;color:var(--muted)">⚠️ 가능시간 미설정</span>`}
                </div>
                ${c.intro ? `<p style="font-size:.75rem;color:var(--muted);margin-bottom:.5rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.intro}</p>` : ""}
                <div style="margin-bottom:.4rem">${fields}</div>
                <span style="font-size:.72rem;color:var(--muted)">📋 진행 ${c.active_request_count}건</span>
              </div>
              <button class="btn btn-primary btn-sm" style="flex-shrink:0" onclick="assignMentor('${requestId}','${c.mentor_id}')">배정</button>
            </div>
          </div>`;
        }).join("")}
      </div>`;
  } catch (err) {
    document.getElementById("modal-body").innerHTML = `<p style="color:var(--muted)">${err.message}</p>`;
  }
}

async function assignMentor(requestId, mentorId) {
  try {
    await api("POST", "/assignments", { request_id: requestId, mentor_id: mentorId });
    toast("멘토가 배정됐습니다.", "success");
    closeModal();
    navigateTo("admin-assign");
  } catch (err) { toast(err.message, "error"); }
}

async function pageAdminRecords(el) {
  const data = await api("GET", "/records");
  const list = data?.records || data || [];
  el.innerHTML = `
    <div class="page-header"><h2>전체 상담 기록</h2><p>완료된 모든 상담 기록입니다.</p></div>
    ${list.length === 0
      ? `<div class="empty-state"><div class="empty-icon">📝</div><p>상담 기록이 없습니다.</p></div>`
      : `<div class="card-grid">${list.map(r => {
          const rec = r.record || {};
          return `<div class="card">
            <div class="card-title" style="font-size:.82rem">${shortId(r.request_id)}</div>
            <p style="font-size:.78rem;color:var(--muted);margin-bottom:.6rem">멘티 ${shortId(r.mentee_user_id)} · ${fmtDate(r.updated_at)}</p>
            <p style="font-size:.8rem;margin-bottom:.4rem"><strong>요약</strong><br>${rec.summary||"-"}</p>
            <p style="font-size:.8rem"><strong>후속 과제</strong><br>${rec.follow_up_task||"-"}</p>
          </div>`;
        }).join("")}</div>`}`;
}

/* ═══ INIT ═══════════════════════════════════════════ */
(function init() {
  const user  = getUser();
  const token = getToken();
  if (user && token) launchApp();
})();

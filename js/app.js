/**
 * IT-Курс для Героев — Система управления учениками
 * Хранение данных: localStorage
 *
 * Структура данных:
 * localStorage["pro_course_students"] = {
 *   "login": {
 *     login: string,
 *     startDate: string (ISO),
 *     completedLessons: { [lessonNum]: dateString }
 *   }
 * }
 * localStorage["pro_course_current"] = "login"
 */

const STORAGE_KEY = "pro_course_students";
const CURRENT_KEY = "pro_course_current";

// ============ DATA API ============

function getAllStudents() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveAllStudents(students) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
}

function getCurrentLogin() {
  return localStorage.getItem(CURRENT_KEY) || null;
}

function setCurrentLogin(login) {
  localStorage.setItem(CURRENT_KEY, login);
}

function clearCurrentLogin() {
  localStorage.removeItem(CURRENT_KEY);
}

function getStudent(login) {
  const students = getAllStudents();
  return students[login] || null;
}

function createStudent(login) {
  const students = getAllStudents();
  if (students[login]) return students[login]; // already exists
  students[login] = {
    login: login,
    startDate: new Date().toISOString().slice(0, 10),
    completedLessons: {}
  };
  saveAllStudents(students);
  return students[login];
}

function deleteStudent(login) {
  const students = getAllStudents();
  delete students[login];
  saveAllStudents(students);
  // if deleted student was current, clear
  if (getCurrentLogin() === login) {
    clearCurrentLogin();
  }
}

function completeLesson(login, lessonNum) {
  const students = getAllStudents();
  if (!students[login]) return;
  if (!students[login].completedLessons[lessonNum]) {
    students[login].completedLessons[lessonNum] = new Date().toISOString().slice(0, 10);
    saveAllStudents(students);
  }
}

function uncompleteLesson(login, lessonNum) {
  const students = getAllStudents();
  if (!students[login]) return;
  delete students[login].completedLessons[lessonNum];
  saveAllStudents(students);
}

function isLessonCompleted(login, lessonNum) {
  const student = getStudent(login);
  if (!student) return false;
  return !!student.completedLessons[lessonNum];
}

function getCompletedCount(login) {
  const student = getStudent(login);
  if (!student) return 0;
  return Object.keys(student.completedLessons).length;
}

// ============ PAGE DETECTION ============

function getPageType() {
  const path = window.location.pathname;
  if (path.includes("login.html")) return "login";
  if (path.includes("admin.html")) return "admin";
  if (path.match(/lesson-(\d+)\.html/)) return "lesson";
  if (path.includes("index.html") || path.endsWith("/") || path.endsWith("/pro-course-children/") || path.endsWith("/pro-course-children")) return "index";
  return "unknown";
}

function getLessonNumber() {
  const match = window.location.pathname.match(/lesson-(\d+)\.html/);
  return match ? parseInt(match[1], 10) : null;
}

// ============ BASE PATH ============

function getBasePath() {
  const pageType = getPageType();
  if (pageType === "lesson") return "../";
  return "";
}

// ============ AUTH GUARD ============

function requireAuth() {
  const login = getCurrentLogin();
  if (!login || !getStudent(login)) {
    const base = getBasePath();
    window.location.href = base + "login.html";
    return null;
  }
  return login;
}

// ============ INDEX PAGE ============

function initIndexPage() {
  const login = requireAuth();
  if (!login) return;

  const student = getStudent(login);

  // Update hero with student info
  updateStudentBadge(login);

  // Update all lesson cards
  const cards = document.querySelectorAll(".lesson-card");
  cards.forEach(card => {
    const numEl = card.querySelector(".card-num");
    if (!numEl) return;
    const match = numEl.textContent.match(/\d+/);
    if (!match) return;
    const num = parseInt(match[0], 10);

    // Remove existing badges
    const oldBadge = card.querySelector(".done-badge, .current-badge");
    if (oldBadge) oldBadge.remove();

    // Remove old classes
    card.classList.remove("done", "current", "upcoming");

    const completed = isLessonCompleted(login, num);
    const completedCount = getCompletedCount(login);

    if (completed) {
      card.classList.add("done");
      const badge = document.createElement("span");
      badge.className = "done-badge";
      badge.textContent = "\u2713 \u041F\u0420\u041E\u0419\u0414\u0415\u041D\u041E";
      card.appendChild(badge);
    } else {
      // Find the first uncompleted lesson
      let firstUncompleted = null;
      for (let i = 1; i <= 18; i++) {
        if (!isLessonCompleted(login, i)) {
          firstUncompleted = i;
          break;
        }
      }

      if (num === firstUncompleted) {
        card.classList.add("current");
        const badge = document.createElement("span");
        badge.className = "current-badge";
        badge.textContent = "\u25B6 \u0421\u041B\u0415\u0414\u0423\u042E\u0429\u0418\u0419";
        card.appendChild(badge);
      } else {
        card.classList.add("upcoming");
      }
    }
  });

  // Update progress
  updateProgress(login);

  // Update section labels
  updateSectionLabels();
}

function updateProgress(login) {
  const count = getCompletedCount(login);
  const progressEl = document.getElementById("course-progress");
  if (progressEl) {
    const pct = Math.round((count / 18) * 100);
    progressEl.innerHTML = `
      <div style="max-width:960px; margin:0 auto 24px; padding:0 20px">
        <div style="display:flex; justify-content:space-between; color:white; font-weight:800; font-size:0.95rem; margin-bottom:6px">
          <span>\u041F\u0440\u043E\u0433\u0440\u0435\u0441\u0441: ${count} / 18 \u0443\u0440\u043E\u043A\u043E\u0432</span>
          <span>${pct}%</span>
        </div>
        <div class="progress-bar" style="height:18px">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
      </div>`;
  }
}

function updateSectionLabels() {
  // Section labels are already static topic-based, no changes needed
}

// ============ LESSON PAGE ============

function initLessonPage() {
  const login = requireAuth();
  if (!login) return;

  const lessonNum = getLessonNumber();
  if (!lessonNum) return;

  // Add student badge to header
  updateStudentBadge(login, true);

  // Add completion controls before bottom nav
  addLessonControls(login, lessonNum);
}

function addLessonControls(login, lessonNum) {
  const bottomNav = document.querySelector(".bottom-nav");
  if (!bottomNav) return;

  const completed = isLessonCompleted(login, lessonNum);

  const controlDiv = document.createElement("div");
  controlDiv.id = "lesson-controls";
  controlDiv.style.cssText = "text-align:center; padding:20px 20px 0;";

  if (completed) {
    controlDiv.innerHTML = `
      <div style="background:#d1fae5; border:3px solid #10b981; border-radius:20px; padding:20px; max-width:500px; margin:0 auto">
        <div style="font-size:1.5rem; margin-bottom:8px">\u2705</div>
        <div style="font-weight:900; color:#065f46; font-size:1.1rem; margin-bottom:12px">\u0423\u0440\u043E\u043A \u043F\u0440\u043E\u0439\u0434\u0435\u043D!</div>
        <button onclick="handleUncomplete(${lessonNum})" class="btn" style="background:#f87171; color:white; font-size:0.85rem; padding:8px 16px">
          \u274C \u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u043F\u0440\u043E\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u0435
        </button>
      </div>`;
  } else {
    controlDiv.innerHTML = `
      <button onclick="handleComplete(${lessonNum})" class="btn" style="background:linear-gradient(135deg,#10b981,#059669); color:white; font-size:1.1rem; padding:14px 32px; box-shadow:0 8px 24px rgba(16,185,129,0.4)">
        \u2705 \u041E\u0442\u043C\u0435\u0442\u0438\u0442\u044C \u0443\u0440\u043E\u043A \u043A\u0430\u043A \u043F\u0440\u043E\u0439\u0434\u0435\u043D\u043D\u044B\u0439
      </button>`;
  }

  bottomNav.parentNode.insertBefore(controlDiv, bottomNav);
}

function handleComplete(lessonNum) {
  const login = getCurrentLogin();
  if (!login) return;
  completeLesson(login, lessonNum);
  // Refresh controls
  const old = document.getElementById("lesson-controls");
  if (old) old.remove();
  addLessonControls(login, lessonNum);
}

function handleUncomplete(lessonNum) {
  const login = getCurrentLogin();
  if (!login) return;
  uncompleteLesson(login, lessonNum);
  const old = document.getElementById("lesson-controls");
  if (old) old.remove();
  addLessonControls(login, lessonNum);
}

// ============ STUDENT BADGE (header) ============

function updateStudentBadge(login, isLesson) {
  const student = getStudent(login);
  if (!student) return;

  const base = isLesson ? "../" : "";

  // For index page: add to hero area
  const header = document.querySelector(".header");
  const hero = document.querySelector(".hero");
  const target = header || hero;
  if (!target) return;

  const count = getCompletedCount(login);

  const displayName = student.fio ? escapeHtml(student.fio) : escapeHtml(login);
  const loginLabel = student.fio ? `${escapeHtml(login)}` : "";
  const nameLine = student.fio
    ? `<div style="color:white; font-weight:900; font-size:1rem">${displayName}</div>
       <div style="color:rgba(255,255,255,0.7); font-size:0.8rem; font-weight:700">\u041B\u043E\u0433\u0438\u043D: ${loginLabel} | \u041D\u0430\u0447\u0430\u043B\u043E: ${student.startDate} | \u041F\u0440\u043E\u0439\u0434\u0435\u043D\u043E: ${count}/18</div>`
    : `<div style="color:white; font-weight:900; font-size:1rem">\u0423\u0447\u0435\u043D\u0438\u043A: ${escapeHtml(login)}</div>
       <div style="color:rgba(255,255,255,0.7); font-size:0.8rem; font-weight:700">\u041D\u0430\u0447\u0430\u043B\u043E: ${student.startDate} | \u041F\u0440\u043E\u0439\u0434\u0435\u043D\u043E: ${count}/18</div>`;

  const badgeHTML = `
    <div id="student-bar" style="background:rgba(255,255,255,0.15); backdrop-filter:blur(10px); border-bottom:2px solid rgba(255,255,255,0.3); padding:10px 24px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px">
      <div style="display:flex; align-items:center; gap:12px">
        <span style="font-size:1.5rem">\uD83D\uDC66</span>
        <div>
          ${nameLine}
        </div>
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap">
        <a href="${base}admin.html" class="btn" style="background:rgba(255,255,255,0.2); color:white; padding:6px 14px; font-size:0.85rem">\u2699\uFE0F \u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435</a>
        <button onclick="switchStudent()" class="btn" style="background:rgba(255,255,255,0.2); color:white; padding:6px 14px; font-size:0.85rem; border:none; cursor:pointer">\uD83D\uDD04 \u0421\u043C\u0435\u043D\u0438\u0442\u044C \u0443\u0447\u0435\u043D\u0438\u043A\u0430</button>
      </div>
    </div>`;

  // Insert at very top of body
  document.body.insertAdjacentHTML("afterbegin", badgeHTML);
}

function switchStudent() {
  clearCurrentLogin();
  const base = getBasePath();
  window.location.href = base + "login.html";
}

// ============ HELPERS ============

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ============ INIT ============

document.addEventListener("DOMContentLoaded", function () {
  const pageType = getPageType();

  switch (pageType) {
    case "index":
      initIndexPage();
      break;
    case "lesson":
      initLessonPage();
      break;
    // login and admin handle themselves
  }
});

const STORAGE_KEY_TOKEN = "dateplanner_token";
const STORAGE_KEY_USER = "dateplanner_user";
const WORKER_API_URL = "https://date-planner-api.mdm-tracker-backend.workers.dev";
const TOAST_DURATION_MS = 3500;
const PARTICLE_COUNT_DESKTOP = 22;
const PARTICLE_COUNT_MOBILE = 14;
const MOBILE_BREAKPOINT = 640;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;
const ANIMATION_MIN_DURATION_S = 18;
const ANIMATION_VAR_DURATION_S = 18;
const ANIMATION_MAX_DELAY_S = 25;
const PARTICLE_MIN_SIZE_PX = 14;
const PARTICLE_VAR_SIZE_PX = 14;

const PARTICLE_PATHS = [
  "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
  "M12 2L14.5 9.5 22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z",
  "M12 2L2 12l10 10 10-10L12 2z",
  "M12 2l2.4 5.4 5.6.8-4 4 1 5.8-5-2.6-5 2.6 1-5.8-4-4 5.6-.8z",
];

const PARTICLE_COLORS = [
  "#f48fb1",
  "#f06292",
  "#e1bee7",
  "#f8bbd9",
  "#ce93d8",
];

const TRASH_ICON_SVG = '<svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';

let currentRolledDate = null;

function getToken() {
  return sessionStorage.getItem(STORAGE_KEY_TOKEN);
}

function getStoredUser() {
  return sessionStorage.getItem(STORAGE_KEY_USER);
}

function setSession(token, username) {
  sessionStorage.setItem(STORAGE_KEY_TOKEN, token);
  sessionStorage.setItem(STORAGE_KEY_USER, username);
}

function clearSession() {
  sessionStorage.removeItem(STORAGE_KEY_TOKEN);
  sessionStorage.removeItem(STORAGE_KEY_USER);
}

function showToast(message) {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, TOAST_DURATION_MS);
}

function createParticleSvg(pathD, color) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathD);
  path.setAttribute("fill", color);
  svg.appendChild(path);
  return svg;
}

function createFloatingParticles() {
  const container = document.getElementById("floating-bg");
  if (!container) return;
  container.innerHTML = "";
  const count = window.innerWidth < MOBILE_BREAKPOINT ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT_DESKTOP;
  for (let i = 0; i < count; i++) {
    const el = document.createElement("span");
    el.className = "float-particle";
    const path = PARTICLE_PATHS[i % PARTICLE_PATHS.length];
    const color = PARTICLE_COLORS[i % PARTICLE_COLORS.length];
    el.appendChild(createParticleSvg(path, color));
    el.style.left = `${Math.random() * 100}%`;
    const size = PARTICLE_MIN_SIZE_PX + Math.random() * PARTICLE_VAR_SIZE_PX;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    const duration = ANIMATION_MIN_DURATION_S + Math.random() * ANIMATION_VAR_DURATION_S;
    el.style.animationDuration = `${duration}s`;
    el.style.animationDelay = `-${Math.random() * ANIMATION_MAX_DELAY_S}s`;
    container.appendChild(el);
  }
}

async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const url = `${WORKER_API_URL}${endpoint}`;
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    clearSession();
    updateUiState();
    throw new Error("Session expired. Please log in again.");
  }
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Request failed with status ${response.status}`);
  }
  return response.json();
}

function formatRemainingTime(ms) {
  if (ms <= 0) return "Ready";
  const days = Math.floor(ms / MS_PER_DAY);
  const hours = Math.floor((ms % MS_PER_DAY) / MS_PER_HOUR);
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}

function updateUiState() {
  const token = getToken();
  const user = getStoredUser();
  const loginSection = document.getElementById("login-section");
  const appSection = document.getElementById("app-section");
  const userBadge = document.getElementById("user-badge");
  const userNameDisplay = document.getElementById("user-name-display");
  const btnLogout = document.getElementById("btn-logout");

  if (token && user) {
    loginSection.classList.add("hidden");
    appSection.classList.remove("hidden");
    userBadge.classList.remove("hidden");
    btnLogout.classList.remove("hidden");
    userNameDisplay.textContent = user;
    loadDates();
  } else {
    loginSection.classList.remove("hidden");
    appSection.classList.add("hidden");
    userBadge.classList.add("hidden");
    btnLogout.classList.add("hidden");
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const usernameInput = document.getElementById("login-username");
  const passwordInput = document.getElementById("login-password");
  const errorBanner = document.getElementById("login-error");
  errorBanner.classList.add("hidden");
  try {
    const res = await apiRequest("/api/login", {
      method: "POST",
      body: JSON.stringify({
        username: usernameInput.value.trim(),
        password: passwordInput.value,
      }),
    });
    setSession(res.token, res.username);
    usernameInput.value = "";
    passwordInput.value = "";
    updateUiState();
    showToast(`Welcome back, ${res.username}!`);
  } catch (err) {
    errorBanner.textContent = err.message;
    errorBanner.classList.remove("hidden");
  }
}

function handleLogout() {
  clearSession();
  updateUiState();
  showToast("Logged out");
}

async function loadDates() {
  try {
    const data = await apiRequest("/api/dates");
    renderAvailableList(data.available || []);
    renderCooldownList(data.coolingDown || []);
  } catch (err) {
    showToast(`Could not load dates: ${err.message}`);
  }
}

function renderAvailableList(items) {
  const container = document.getElementById("available-dates-list");
  const countBadge = document.getElementById("available-count");
  countBadge.textContent = String(items.length);
  container.innerHTML = "";
  if (items.length === 0) {
    container.innerHTML = '<p class="empty-state">No date plans available yet. Add some above!</p>';
    return;
  }
  items.forEach(item => {
    const el = document.createElement("div");
    el.className = "date-item";
    el.innerHTML = `
      <div class="item-content">
        <span class="item-title">${escapeHtml(item.title)}</span>
        <div class="item-details">
          <span>By ${escapeHtml(item.creator)}</span>
          <span>• Rolled ${item.roll_count} time(s)</span>
        </div>
      </div>
      <div class="item-actions">
        <button type="button" class="icon-btn btn-delete" data-id="${item.id}" title="Delete" aria-label="Delete">
          ${TRASH_ICON_SVG}
        </button>
      </div>
    `;
    el.querySelector(".btn-delete").addEventListener("click", () => deleteDate(item.id));
    container.appendChild(el);
  });
}

function renderCooldownList(items) {
  const container = document.getElementById("cooldown-dates-list");
  const countBadge = document.getElementById("cooldown-count");
  countBadge.textContent = String(items.length);
  container.innerHTML = "";
  if (items.length === 0) {
    container.innerHTML = '<p class="empty-state">No dates on cooldown right now.</p>';
    return;
  }
  items.forEach(item => {
    const el = document.createElement("div");
    el.className = "date-item";
    el.innerHTML = `
      <div class="item-content">
        <span class="item-title">${escapeHtml(item.title)}</span>
        <div class="item-details">
          <span>By ${escapeHtml(item.creator)}</span>
          <span class="cooldown-pill">${formatRemainingTime(item.remaining_ms || 0)}</span>
        </div>
      </div>
      <div class="item-actions">
        <button type="button" class="btn btn-secondary btn-sm btn-release" data-id="${item.id}">Release</button>
      </div>
    `;
    el.querySelector(".btn-release").addEventListener("click", () => releaseDate(item.id));
    container.appendChild(el);
  });
}

async function handleRollDate() {
  const rollButton = document.getElementById("btn-roll-date");
  rollButton.disabled = true;
  try {
    const res = await apiRequest("/api/dates/roll", { method: "POST" });
    if (res.status === "empty") {
      showToast(res.message);
      return;
    }
    displayRolledDate(res.date);
    await loadDates();
  } catch (err) {
    showToast(`Roll failed: ${err.message}`);
  } finally {
    rollButton.disabled = false;
  }
}

function displayRolledDate(date) {
  currentRolledDate = date;
  const resultCard = document.getElementById("roll-result-card");
  const titleEl = document.getElementById("rolled-title");
  const creatorEl = document.getElementById("rolled-creator");
  titleEl.textContent = date.title;
  creatorEl.textContent = `Suggested by ${date.creator}`;
  resultCard.classList.remove("hidden");
  showToast("Date rolled! Have fun!");
}

async function handleQuickRelease() {
  if (!currentRolledDate) return;
  await releaseDate(currentRolledDate.id);
  const resultCard = document.getElementById("roll-result-card");
  resultCard.classList.add("hidden");
  currentRolledDate = null;
}

async function releaseDate(id) {
  try {
    await apiRequest(`/api/dates/${id}/reset-cooldown`, { method: "POST" });
    showToast("Date released from waitlist!");
    await loadDates();
  } catch (err) {
    showToast(`Could not release date: ${err.message}`);
  }
}

async function deleteDate(id) {
  if (!confirm("Are you sure you want to delete this date plan?")) return;
  try {
    await apiRequest(`/api/dates/${id}`, { method: "DELETE" });
    showToast("Date removed.");
    await loadDates();
  } catch (err) {
    showToast(`Could not delete date: ${err.message}`);
  }
}

async function handleAddDateSubmit(event) {
  event.preventDefault();
  const titleInput = document.getElementById("new-date-title");
  const title = titleInput.value.trim();
  const creator = getStoredUser() || "Partner";
  if (!title) return;
  try {
    await apiRequest("/api/dates", {
      method: "POST",
      body: JSON.stringify({ title, creator }),
    });
    titleInput.value = "";
    showToast("Date plan added!");
    await loadDates();
  } catch (err) {
    showToast(`Could not add date plan: ${err.message}`);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function initEventHandlers() {
  document.getElementById("login-form").addEventListener("submit", handleLoginSubmit);
  document.getElementById("btn-logout").addEventListener("click", handleLogout);
  document.getElementById("btn-roll-date").addEventListener("click", handleRollDate);
  document.getElementById("btn-quick-release").addEventListener("click", handleQuickRelease);
  document.getElementById("add-date-form").addEventListener("submit", handleAddDateSubmit);
}

document.addEventListener("DOMContentLoaded", () => {
  createFloatingParticles();
  initEventHandlers();
  updateUiState();
});

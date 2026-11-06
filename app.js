const STORAGE_KEY_TOKEN = "dateplanner_token";
const STORAGE_KEY_USER = "dateplanner_user";
const STORAGE_KEY_WORKER_URL = "dateplanner_worker_url";
const DEFAULT_WORKER_URL = "https://date-planner-api.mdm-tracker-backend.workers.dev";
const TOAST_DURATION_MS = 3500;
const PARTICLE_COUNT_DESKTOP = 20;
const PARTICLE_COUNT_MOBILE = 12;
const MOBILE_BREAKPOINT = 640;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;

let currentRolledDate = null;

function getWorkerUrl() {
  return localStorage.getItem(STORAGE_KEY_WORKER_URL) || DEFAULT_WORKER_URL;
}

function setWorkerUrl(url) {
  const sanitized = url.replace(/\/+$/, "");
  localStorage.setItem(STORAGE_KEY_WORKER_URL, sanitized);
}

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

function createFloatingParticles() {
  const container = document.getElementById("floating-bg");
  if (!container) return;
  const symbols = ["🌸", "💕", "✿", "♡", "🌷", "✦", "🩷", "💮", "✨", "🌹"];
  const count = window.innerWidth < MOBILE_BREAKPOINT ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT_DESKTOP;
  for (let i = 0; i < count; i++) {
    const el = document.createElement("span");
    el.className = "float-particle";
    el.textContent = symbols[i % symbols.length];
    el.style.left = `${Math.random() * 100}%`;
    el.style.animationDuration = `${18 + Math.random() * 22}s`;
    el.style.animationDelay = `${Math.random() * 20}s`;
    el.style.fontSize = `${0.8 + Math.random() * 1.2}rem`;
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
  const url = `${getWorkerUrl()}${endpoint}`;
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
    showToast(`Welcome back, ${res.username}! 💕`);
  } catch (err) {
    errorBanner.textContent = err.message;
    errorBanner.classList.remove("hidden");
  }
}

function handleLogout() {
  clearSession();
  updateUiState();
  showToast("Logged out safely.");
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
        <button type="button" class="icon-btn btn-delete" data-id="${item.id}" title="Delete" aria-label="Delete">🗑️</button>
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
  const cooldownEl = document.getElementById("rolled-cooldown");
  titleEl.textContent = date.title;
  creatorEl.textContent = `Suggested by ${date.creator}`;
  cooldownEl.textContent = "Cooldown active (14 days)";
  resultCard.classList.remove("hidden");
  showToast("Date rolled! Have fun! 💕");
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
    showToast("Date released from waitlist! ✨");
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
  const creatorInput = document.getElementById("new-date-creator");
  const title = titleInput.value.trim();
  const creator = creatorInput.value.trim() || getStoredUser() || "Partner";
  if (!title) return;
  try {
    await apiRequest("/api/dates", {
      method: "POST",
      body: JSON.stringify({ title, creator }),
    });
    titleInput.value = "";
    showToast("Date plan added! 💖");
    await loadDates();
  } catch (err) {
    showToast(`Could not add date plan: ${err.message}`);
  }
}

function openSettingsDialog() {
  const dialog = document.getElementById("settings-dialog");
  const input = document.getElementById("worker-url-input");
  input.value = getWorkerUrl();
  dialog.showModal();
}

function closeSettingsDialog() {
  const dialog = document.getElementById("settings-dialog");
  dialog.close();
}

function handleSaveSettings() {
  const input = document.getElementById("worker-url-input");
  const val = input.value.trim();
  if (val) {
    setWorkerUrl(val);
    showToast("Worker API URL updated!");
    closeSettingsDialog();
    if (getToken()) {
      loadDates();
    }
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
  document.getElementById("btn-open-settings").addEventListener("click", openSettingsDialog);
  document.getElementById("btn-config-api-shortcut").addEventListener("click", openSettingsDialog);
  document.getElementById("btn-close-settings").addEventListener("click", closeSettingsDialog);
  document.getElementById("btn-save-settings").addEventListener("click", handleSaveSettings);
}

document.addEventListener("DOMContentLoaded", () => {
  createFloatingParticles();
  initEventHandlers();
  updateUiState();
});

const STORAGE_KEY_TOKEN = "dateplanner_token";
const STORAGE_KEY_USER = "dateplanner_user";
const STORAGE_KEY_LANG = "dateplanner_lang";
const WORKER_API_URL = "https://date-planner-api.mdm-tracker-backend.workers.dev";
const TOAST_DURATION_MS = 3500;
const AUTO_REFRESH_INTERVAL_MS = 6000;
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

const TRANSLATIONS = {
  en: {
    brandTitle: "Our Date Planner",
    logOut: "Log Out",
    privateSpace: "Private Space",
    loginSubtitle: "Please log in to manage our date plans",
    usernameLabel: "Username",
    usernamePh: "Enter username",
    passwordLabel: "Password",
    passwordPh: "Enter password",
    enterPlanner: "Enter Planner",
    whatShouldWeDo: "What should we do?",
    rollDate: "Roll a Date Plan!",
    todaysAdventure: "Today's Adventure",
    suggestedBy: "Suggested by",
    releaseWaitlistNow: "Release from waitlist now",
    addDateIdea: "Add a New Date Idea",
    datePlanLabel: "Date Plan",
    datePlanPh: "e.g. Stargazing picnic with strawberries...",
    addToPlans: "Add to Plans",
    availableDates: "Available Dates",
    emptyAvailable: "No date plans available yet. Add some above!",
    waitlist: "Waitlist",
    emptyWaitlist: "No dates on cooldown right now.",
    lastDatePlan: "Last Date Plan",
    emptyLastPlan: "No date plan rolled yet.",
    lastRolled: "Last rolled",
    latestAdded: "Latest added",
    ready: "Ready",
    left: "left",
    by: "By",
    rolledTimes: "Rolled",
    times: "time(s)",
    release: "Release",
    delete: "Delete",
    welcomeBack: "Welcome back",
    loggedOut: "Logged out",
    dateRolled: "Date rolled! Have fun!",
    dateReleased: "Date released from waitlist!",
    datePlanAdded: "Date plan added!",
    dateRemoved: "Date removed.",
    confirmDelete: "Are you sure you want to delete this date plan?",
    sessionExpired: "Session expired. Please log in again.",
  },
  es: {
    brandTitle: "Nuestro Planificador",
    logOut: "Cerrar sesión",
    privateSpace: "Espacio Privado",
    loginSubtitle: "Inicia sesión para gestionar nuestros planes",
    usernameLabel: "Usuario",
    usernamePh: "Ingresa tu usuario",
    passwordLabel: "Contraseña",
    passwordPh: "Ingresa tu contraseña",
    enterPlanner: "Entrar al Planificador",
    whatShouldWeDo: "¿Qué hacemos hoy?",
    rollDate: "¡Elegir un Plan!",
    todaysAdventure: "Aventura de Hoy",
    suggestedBy: "Sugerido por",
    releaseWaitlistNow: "Liberar de la lista de espera",
    addDateIdea: "Agregar Nueva Idea",
    datePlanLabel: "Plan de Cita",
    datePlanPh: "ej. Picnic bajo las estrellas con fresas...",
    addToPlans: "Agregar a Planes",
    availableDates: "Planes Disponibles",
    emptyAvailable: "Aún no hay planes disponibles. ¡Agrega uno arriba!",
    waitlist: "Lista de Espera",
    emptyWaitlist: "No hay planes en espera en este momento.",
    lastDatePlan: "Último Plan de Cita",
    emptyLastPlan: "Aún no se ha elegido ningún plan.",
    lastRolled: "Última elección",
    latestAdded: "Último agregado",
    ready: "Listo",
    left: "restantes",
    by: "Por",
    rolledTimes: "Elegido",
    times: "vez/veces",
    release: "Liberar",
    delete: "Eliminar",
    welcomeBack: "¡Hola de nuevo",
    loggedOut: "Sesión cerrada",
    dateRolled: "¡Plan elegido! ¡A divertirse!",
    dateReleased: "¡Plan liberado de la lista de espera!",
    datePlanAdded: "¡Plan agregado!",
    dateRemoved: "Plan eliminado.",
    confirmDelete: "¿Seguro/a que deseas eliminar este plan de cita?",
    sessionExpired: "Sesión expirada. Por favor inicia sesión nuevamente.",
  },
};

const TRASH_ICON_SVG = '<svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';

let currentRolledDate = null;
let autoRefreshTimer = null;

function getLang() {
  return localStorage.getItem(STORAGE_KEY_LANG) || "en";
}

function t(key) {
  const lang = getLang();
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  return dict[key] || key;
}

function updateLangToggleUi() {
  const current = getLang();
  const enSpan = document.getElementById("lang-en");
  const esSpan = document.getElementById("lang-es");
  if (enSpan && esSpan) {
    enSpan.classList.toggle("active", current === "en");
    esSpan.classList.toggle("active", current === "es");
  }
}

function applyStaticTranslations() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = t(key);
  });
  document.querySelectorAll("[data-i18n-ph]").forEach(el => {
    const key = el.getAttribute("data-i18n-ph");
    if (key) el.setAttribute("placeholder", t(key));
  });
}

function applyTranslations() {
  applyStaticTranslations();
  updateLangToggleUi();
  if (getToken()) loadDates(true);
}

function toggleLang() {
  const next = getLang() === "en" ? "es" : "en";
  localStorage.setItem(STORAGE_KEY_LANG, next);
  applyTranslations();
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
    throw new Error(t("sessionExpired"));
  }
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Request failed with status ${response.status}`);
  }
  return response.json();
}

function formatRemainingTime(ms) {
  if (ms <= 0) return t("ready");
  const days = Math.floor(ms / MS_PER_DAY);
  const hours = Math.floor((ms % MS_PER_DAY) / MS_PER_HOUR);
  if (days > 0) return `${days}d ${hours}h ${t("left")}`;
  return `${hours}h ${t("left")}`;
}

function startAutoRefresh() {
  stopAutoRefresh();
  autoRefreshTimer = setInterval(() => {
    if (!document.hidden && getToken()) {
      loadDates(true);
    }
  }, AUTO_REFRESH_INTERVAL_MS);
}

function stopAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
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
    loadDates(false);
    startAutoRefresh();
  } else {
    loginSection.classList.remove("hidden");
    appSection.classList.add("hidden");
    userBadge.classList.add("hidden");
    btnLogout.classList.add("hidden");
    stopAutoRefresh();
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
    showToast(`${t("welcomeBack")}, ${res.username}!`);
  } catch (err) {
    errorBanner.textContent = err.message;
    errorBanner.classList.remove("hidden");
  }
}

function handleLogout() {
  stopAutoRefresh();
  clearSession();
  updateUiState();
  showToast(t("loggedOut"));
}

async function loadDates(isSilent = false) {
  try {
    const data = await apiRequest("/api/dates");
    renderAvailableList(data.available || []);
    renderCooldownList(data.coolingDown || []);
    renderLastPlan(data.lastRolled || data.latestPlan || null);
  } catch (err) {
    if (!isSilent) {
      showToast(`Could not load dates: ${err.message}`);
    }
  }
}

function renderAvailableList(items) {
  const container = document.getElementById("available-dates-list");
  const countBadge = document.getElementById("available-count");
  countBadge.textContent = String(items.length);
  container.innerHTML = "";
  if (items.length === 0) {
    container.innerHTML = `<p class="empty-state">${escapeHtml(t("emptyAvailable"))}</p>`;
    return;
  }
  items.forEach(item => {
    const el = document.createElement("div");
    el.className = "date-item";
    el.innerHTML = `
      <div class="item-content">
        <span class="item-title">${escapeHtml(item.title)}</span>
        <div class="item-details">
          <span>${escapeHtml(t("by"))} ${escapeHtml(item.creator)}</span>
          <span>• ${escapeHtml(t("rolledTimes"))} ${item.roll_count} ${escapeHtml(t("times"))}</span>
        </div>
      </div>
      <div class="item-actions">
        <button type="button" class="icon-btn btn-delete" data-id="${item.id}" title="${escapeHtml(t("delete"))}" aria-label="${escapeHtml(t("delete"))}">
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
    container.innerHTML = `<p class="empty-state">${escapeHtml(t("emptyWaitlist"))}</p>`;
    return;
  }
  items.forEach(item => {
    const el = document.createElement("div");
    el.className = "date-item";
    el.innerHTML = `
      <div class="item-content">
        <span class="item-title">${escapeHtml(item.title)}</span>
        <div class="item-details">
          <span>${escapeHtml(t("by"))} ${escapeHtml(item.creator)}</span>
          <span class="cooldown-pill">${formatRemainingTime(item.remaining_ms || 0)}</span>
        </div>
      </div>
      <div class="item-actions">
        <button type="button" class="btn btn-secondary btn-sm btn-release" data-id="${item.id}">
          ${escapeHtml(t("release"))}
        </button>
      </div>
    `;
    el.querySelector(".btn-release").addEventListener("click", () => releaseDate(item.id));
    container.appendChild(el);
  });
}

function renderLastPlan(item) {
  const container = document.getElementById("last-plan-content");
  if (!container) return;
  if (!item) {
    container.innerHTML = `<p class="empty-state">${escapeHtml(t("emptyLastPlan"))}</p>`;
    return;
  }
  const tagText = item.roll_count > 0 ? t("lastRolled") : t("latestAdded");
  container.innerHTML = `
    <div class="last-plan-body">
      <div class="item-content">
        <h4 class="last-plan-title">${escapeHtml(item.title)}</h4>
        <div class="last-plan-sub">
          <span>${escapeHtml(t("by"))} ${escapeHtml(item.creator)}</span>
          <span>• ${escapeHtml(tagText)}</span>
          <span>• ${escapeHtml(t("rolledTimes"))} ${item.roll_count} ${escapeHtml(t("times"))}</span>
        </div>
      </div>
    </div>
  `;
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
    await loadDates(true);
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
  creatorEl.textContent = `${t("suggestedBy")} ${date.creator}`;
  resultCard.classList.remove("hidden");
  showToast(t("dateRolled"));
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
    showToast(t("dateReleased"));
    await loadDates(true);
  } catch (err) {
    showToast(`Could not release date: ${err.message}`);
  }
}

async function deleteDate(id) {
  if (!confirm(t("confirmDelete"))) return;
  try {
    await apiRequest(`/api/dates/${id}`, { method: "DELETE" });
    showToast(t("dateRemoved"));
    await loadDates(true);
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
    showToast(t("datePlanAdded"));
    await loadDates(true);
  } catch (err) {
    showToast(`Could not add date plan: ${err.message}`);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function handleVisibilityChange() {
  if (!document.hidden && getToken()) {
    loadDates(true);
  }
}

function initEventHandlers() {
  document.getElementById("btn-lang-toggle").addEventListener("click", toggleLang);
  document.getElementById("login-form").addEventListener("submit", handleLoginSubmit);
  document.getElementById("btn-logout").addEventListener("click", handleLogout);
  document.getElementById("btn-roll-date").addEventListener("click", handleRollDate);
  document.getElementById("btn-quick-release").addEventListener("click", handleQuickRelease);
  document.getElementById("add-date-form").addEventListener("submit", handleAddDateSubmit);
  document.addEventListener("visibilitychange", handleVisibilityChange);
}

document.addEventListener("DOMContentLoaded", () => {
  createFloatingParticles();
  initEventHandlers();
  applyTranslations();
  updateUiState();
});

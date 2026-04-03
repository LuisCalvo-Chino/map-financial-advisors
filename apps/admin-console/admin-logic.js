import { auth, db } from "../../src/config/firebase-config.js";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  Timestamp,
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  updateDoc,
} from "firebase/firestore";
import {
  PLAN_LABELS,
  PLAN_TYPE,
  USER_ROLE,
  USER_STATUS,
  addMonths,
  addYears,
  buildInitialUserProfile,
  isPlanExpired,
  normalizeUserDoc,
} from "../../src/data/user-schema.js";

const PAGE_SIZE = 20;
const SEARCH_BATCH_SIZE = 250;
const PLAN_APP_MAP = {
  [PLAN_TYPE.free]: [],
  [PLAN_TYPE.basico]: [],
  [PLAN_TYPE.profesional]: [],
  [PLAN_TYPE.vitalicio]: [],
};

const state = {
  authReady: false,
  currentAdmin: null,
  currentAdminDoc: null,
  webapps: [],
  pageIndex: 0,
  pageStack: [],
  rows: [],
  searchTerm: "",
  searchResults: [],
  selectedUser: null,
};

const els = {
  accessGuard: document.getElementById("admin-access-guard"),
  console: document.getElementById("admin-console"),
  tbody: document.getElementById("admin-user-tbody"),
  summary: document.getElementById("admin-result-summary"),
  prevBtn: document.getElementById("admin-prev-btn"),
  nextBtn: document.getElementById("admin-next-btn"),
  pageIndicator: document.getElementById("admin-page-indicator"),
  searchInput: document.getElementById("admin-search-input"),
  searchBtn: document.getElementById("admin-search-btn"),
  resetBtn: document.getElementById("admin-reset-btn"),
  toast: document.getElementById("admin-toast"),
  session: document.getElementById("admin-session"),
  drawer: document.getElementById("admin-drawer"),
  drawerCloseBackdrop: document.getElementById("admin-drawer-close"),
  drawerCloseBtn: document.getElementById("drawer-close-btn"),
  drawerForm: document.getElementById("admin-user-form"),
  drawerUserName: document.getElementById("drawer-user-name"),
  drawerUserEmail: document.getElementById("drawer-user-email"),
  drawerRole: document.getElementById("drawer-role"),
  drawerStatus: document.getElementById("drawer-status"),
  drawerPlanType: document.getElementById("drawer-plan-type"),
  drawerPlanExpiry: document.getElementById("drawer-plan-expiry"),
  drawerAppsGrid: document.getElementById("drawer-apps-grid"),
  addMonthBtn: document.getElementById("drawer-add-month"),
  addYearBtn: document.getElementById("drawer-add-year"),
  lifetimeBtn: document.getElementById("drawer-set-lifetime"),
};

renderSessionLoading();
bindUi();

onAuthStateChanged(auth, async (user) => {
  state.authReady = true;

  if (!user) {
    renderGuard(`
      <h2>Inicia sesión como administrador</h2>
      <p>La consola MAP requiere una sesión activa con rol <code>admin</code>.</p>
      <p><a class="webapp-card__link" href="../../index.html">Volver al portal principal</a></p>
    `);
    return;
  }

  try {
    await auth.authStateReady();
  } catch (error) {
    console.error("[MAP admin] authStateReady:", error);
  }

  const sessionUser = auth.currentUser ?? user;
  state.currentAdmin = sessionUser;
  renderSessionUser(sessionUser);

  try {
    const adminSnap = await getDoc(doc(db, "usuarios", sessionUser.uid));
    if (!adminSnap.exists()) {
      renderGuard(`
        <h2>Acceso denegado</h2>
        <p>No existe un perfil administrativo asociado a tu UID.</p>
      `);
      return;
    }

    const adminDoc = normalizeUserDoc(adminSnap.data(), adminSnap.id);
    state.currentAdminDoc = adminDoc;
    if (adminDoc.rol !== USER_ROLE.admin) {
      renderGuard(`
        <h2>Acceso denegado</h2>
        <p>Tu perfil no tiene permisos de administrador para esta consola.</p>
      `);
      return;
    }

    els.accessGuard.hidden = true;
    els.console.hidden = false;
    await Promise.all([loadWebappsCatalog(), loadPage(0)]);
  } catch (error) {
    console.error("[MAP admin] auth bootstrap:", error);
    const code =
      error && typeof error === "object" && "code" in error
        ? String(/** @type {{ code?: string }} */ (error).code || "")
        : "";
    const detail =
      error && typeof error === "object" && "message" in error
        ? String(/** @type {{ message?: string }} */ (error).message || "")
        : "";
    const hint =
      code === "permission-denied"
        ? "<p>Tu usuario debe tener <code>rol: \"admin\"</code> en <code>usuarios/{uid}</code> y las reglas publicadas deben permitir <code>list</code> sobre <code>usuarios</code> para administradores.</p>"
        : "";
    renderGuard(`
      <h2>No se pudo cargar la consola</h2>
      <p>Revisa tus reglas de Firestore o la conexión con Firebase.</p>
      ${hint}
      <p><code>${escapeHtml(code || "sin-código")}</code> ${escapeHtml(detail || "")}</p>
    `);
  }
});

function bindUi() {
  els.prevBtn?.addEventListener("click", () => {
    void goToPreviousPage();
  });
  els.nextBtn?.addEventListener("click", () => {
    void goToNextPage();
  });
  els.searchBtn?.addEventListener("click", () => {
    void runGlobalSearch();
  });
  els.resetBtn?.addEventListener("click", () => {
    resetSearch();
  });
  els.searchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void runGlobalSearch();
    }
  });

  els.drawerCloseBackdrop?.addEventListener("click", closeDrawer);
  els.drawerCloseBtn?.addEventListener("click", closeDrawer);
  els.drawerForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    void saveDrawerChanges();
  });
  els.drawerPlanType?.addEventListener("change", () => {
    applyPlanToDrawer({ syncApps: true });
  });
  els.addMonthBtn?.addEventListener("click", () => {
    bumpDrawerExpiry("month");
  });
  els.addYearBtn?.addEventListener("click", () => {
    bumpDrawerExpiry("year");
  });
  els.lifetimeBtn?.addEventListener("click", () => {
    setDrawerLifetime();
  });
}

async function loadWebappsCatalog() {
  const snap = await getDocs(query(collection(db, "webapps"), orderBy(documentId())));
  state.webapps = snap.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      titulo:
        typeof data.titulo === "string" && data.titulo.trim()
          ? data.titulo.trim()
          : docSnap.id,
      es_gratuita: Boolean(data.es_gratuita),
      planes_incluidos: Array.isArray(data.planes_incluidos)
        ? data.planes_incluidos.map((item) => String(item))
        : [],
    };
  });
}

async function loadPage(pageIndex) {
  setTableLoading("Cargando usuarios...");

  const rows = [];
  let pageCursor = null;

  if (pageIndex > 0) {
    pageCursor = state.pageStack[pageIndex - 1] ?? null;
  }

  const constraints = [orderBy(documentId()), limit(PAGE_SIZE)];
  if (pageCursor) constraints.push(startAfter(pageCursor));
  const pageQuery = query(collection(db, "usuarios"), ...constraints);
  const snap = await getDocs(pageQuery);

  snap.docs.forEach((docSnap) => {
    rows.push(normalizeUserDoc(docSnap.data(), docSnap.id));
  });

  state.pageIndex = pageIndex;
  state.rows = rows;
  state.searchResults = [];
  state.searchTerm = "";
  if (els.searchInput) els.searchInput.value = "";
  state.pageStack[pageIndex] = snap.docs.at(-1) ?? null;

  renderTable(rows);
  updatePaginationState({
    page: pageIndex + 1,
    canPrev: pageIndex > 0,
    canNext: snap.docs.length === PAGE_SIZE,
    summary:
      rows.length === 0
        ? "No hay usuarios registrados."
        : `Mostrando ${rows.length} usuarios (página ${pageIndex + 1}).`,
  });
}

async function goToNextPage() {
  if (state.searchTerm) {
    paginateSearch(1);
    return;
  }
  if (els.nextBtn?.disabled) return;
  await loadPage(state.pageIndex + 1);
}

async function goToPreviousPage() {
  if (state.searchTerm) {
    paginateSearch(-1);
    return;
  }
  if (state.pageIndex === 0) return;
  await loadPage(state.pageIndex - 1);
}

async function runGlobalSearch() {
  const term = els.searchInput?.value.trim().toLowerCase() ?? "";
  if (!term) {
    await loadPage(0);
    return;
  }

  setTableLoading("Buscando en toda la colección...");
  state.searchTerm = term;
  state.pageIndex = 0;

  let lastDoc = null;
  /** @type {ReturnType<typeof normalizeUserDoc>[]} */
  const allUsers = [];

  while (true) {
    const constraints = [orderBy(documentId()), limit(SEARCH_BATCH_SIZE)];
    if (lastDoc) constraints.push(startAfter(lastDoc));
    const snap = await getDocs(query(collection(db, "usuarios"), ...constraints));

    snap.docs.forEach((docSnap) => {
      allUsers.push(normalizeUserDoc(docSnap.data(), docSnap.id));
    });

    lastDoc = snap.docs.at(-1) ?? null;
    if (snap.docs.length < SEARCH_BATCH_SIZE) break;
  }

  state.searchResults = allUsers.filter((user) => {
    return (
      user.nombre.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      user.uid.toLowerCase().includes(term)
    );
  });

  renderSearchPage(0);
}

function renderSearchPage(pageIndex) {
  state.pageIndex = pageIndex;
  const start = pageIndex * PAGE_SIZE;
  const rows = state.searchResults.slice(start, start + PAGE_SIZE);
  state.rows = rows;
  renderTable(rows);

  const totalPages = Math.max(1, Math.ceil(state.searchResults.length / PAGE_SIZE));
  updatePaginationState({
    page: pageIndex + 1,
    canPrev: pageIndex > 0,
    canNext: pageIndex + 1 < totalPages,
    summary:
      state.searchResults.length === 0
        ? `No encontramos coincidencias para "${state.searchTerm}".`
        : `${state.searchResults.length} coincidencias para "${state.searchTerm}". Página ${pageIndex + 1} de ${totalPages}.`,
  });
}

function paginateSearch(direction) {
  const totalPages = Math.max(1, Math.ceil(state.searchResults.length / PAGE_SIZE));
  const nextPage = state.pageIndex + direction;
  if (nextPage < 0 || nextPage >= totalPages) return;
  renderSearchPage(nextPage);
}

function resetSearch() {
  void loadPage(0);
}

/**
 * @param {ReturnType<typeof normalizeUserDoc>[]} rows
 */
function renderTable(rows) {
  if (!els.tbody) return;

  if (rows.length === 0) {
    els.tbody.innerHTML = `
      <tr>
        <td colspan="6" class="admin-empty">No hay usuarios para mostrar.</td>
      </tr>
    `;
    return;
  }

  els.tbody.innerHTML = rows
    .map((user) => {
      const expired = user.status !== USER_STATUS.suspended && isPlanExpired(user);
      const statusClass =
        user.status === USER_STATUS.suspended
          ? "admin-badge admin-badge--suspended"
          : expired
            ? "admin-badge admin-badge--expired"
            : "admin-badge admin-badge--active";
      const statusLabel =
        user.status === USER_STATUS.suspended
          ? "Suspendido"
          : expired
            ? "Expirado"
            : "Activo";
      const planLabel = PLAN_LABELS[user.plan.tipo] ?? user.plan.tipo;
      const expiryLabel = user.plan.fecha_vencimiento
        ? formatDate(user.plan.fecha_vencimiento)
        : user.plan.tipo === PLAN_TYPE.vitalicio
          ? "Vitalicio"
          : "Sin fecha";

      return `
        <tr class="admin-user-row" data-user-id="${escapeAttr(user.uid)}">
          <td>
            <p class="admin-user-cell__name">${escapeHtml(user.nombre)}</p>
            <p class="admin-user-cell__email">${escapeHtml(user.email || "Sin email")}</p>
          </td>
          <td class="admin-user-cell__uid">${escapeHtml(user.uid)}</td>
          <td><span class="admin-badge admin-badge--neutral">${escapeHtml(user.rol)}</span></td>
          <td>${escapeHtml(planLabel)}</td>
          <td><span class="${statusClass}">${statusLabel}</span></td>
          <td>${escapeHtml(expiryLabel)}</td>
        </tr>
      `;
    })
    .join("");

  els.tbody.querySelectorAll(".admin-user-row").forEach((row) => {
    row.addEventListener("click", () => {
      const userId = /** @type {HTMLElement} */ (row).dataset.userId;
      if (!userId) return;
      const user = state.rows.find((item) => item.uid === userId);
      if (user) openDrawer(user);
    });
  });
}

function setTableLoading(message) {
  if (!els.tbody) return;
  els.tbody.innerHTML = `
    <tr>
      <td colspan="6" class="admin-loading">${escapeHtml(message)}</td>
    </tr>
  `;
}

/**
 * @param {{ page: number; canPrev: boolean; canNext: boolean; summary: string }} stateView
 */
function updatePaginationState(stateView) {
  if (els.summary) els.summary.textContent = stateView.summary;
  if (els.pageIndicator) els.pageIndicator.textContent = `Página ${stateView.page}`;
  if (els.prevBtn) els.prevBtn.disabled = !stateView.canPrev;
  if (els.nextBtn) els.nextBtn.disabled = !stateView.canNext;
}

/**
 * @param {ReturnType<typeof normalizeUserDoc>} user
 */
function openDrawer(user) {
  state.selectedUser = structuredClone(user);
  if (!els.drawer || !els.drawerUserName || !els.drawerUserEmail) return;

  els.drawerUserName.textContent = user.nombre;
  els.drawerUserEmail.textContent = `${user.email} · UID ${user.uid}`;
  els.drawerRole.value = user.rol;
  els.drawerStatus.value = user.status;
  els.drawerPlanType.value = user.plan.tipo;
  els.drawerPlanExpiry.value = formatDateForInput(user.plan.fecha_vencimiento);
  renderAppChecklist(user.apps_activas);

  els.drawer.classList.add("is-open");
  els.drawer.setAttribute("aria-hidden", "false");
}

function closeDrawer() {
  if (!els.drawer) return;
  els.drawer.classList.remove("is-open");
  els.drawer.setAttribute("aria-hidden", "true");
  state.selectedUser = null;
}

/**
 * @param {string[]} selectedApps
 */
function renderAppChecklist(selectedApps) {
  if (!els.drawerAppsGrid) return;
  if (state.webapps.length === 0) {
    els.drawerAppsGrid.innerHTML = `
      <p class="admin-user-cell__hint">No hay webapps registradas en Firestore.</p>
    `;
    return;
  }

  els.drawerAppsGrid.innerHTML = state.webapps
    .map((app) => {
      const checked = selectedApps.includes(app.id) ? "checked" : "";
      const meta = app.es_gratuita ? "Gratuita" : "Premium";
      return `
        <label class="admin-app-checkbox">
          <input type="checkbox" value="${escapeAttr(app.id)}" ${checked} />
          <span>
            <span class="admin-app-checkbox__title">${escapeHtml(app.titulo)}</span>
            <span class="admin-app-checkbox__meta">${escapeHtml(app.id)} · ${meta}</span>
          </span>
        </label>
      `;
    })
    .join("");
}

function applyPlanToDrawer(options = { syncApps: false }) {
  if (!state.selectedUser || !els.drawerPlanType || !els.drawerPlanExpiry) return;
  const planType = els.drawerPlanType.value;

  if (planType === PLAN_TYPE.vitalicio) {
    els.drawerPlanExpiry.value = "";
  }

  if (!options.syncApps) return;

  const staticApps = PLAN_APP_MAP[planType] ?? [];
  const dynamicApps = state.webapps
    .filter((app) => app.planes_incluidos.includes(planType))
    .map((app) => app.id);
  const selected = [...new Set([...staticApps, ...dynamicApps])];

  renderAppChecklist(selected);
}

function bumpDrawerExpiry(unit) {
  if (!els.drawerPlanExpiry) return;
  const current = els.drawerPlanExpiry.value ? new Date(els.drawerPlanExpiry.value) : null;
  const next = unit === "month" ? addMonths(current, 1) : addYears(current, 1);
  els.drawerPlanExpiry.value = formatDateForInput(next);
}

function setDrawerLifetime() {
  if (!els.drawerPlanType || !els.drawerPlanExpiry) return;
  els.drawerPlanType.value = PLAN_TYPE.vitalicio;
  els.drawerPlanExpiry.value = "";
  applyPlanToDrawer({ syncApps: true });
}

async function saveDrawerChanges() {
  if (!state.selectedUser) return;

  const appsActivas = Array.from(
    els.drawerAppsGrid?.querySelectorAll('input[type="checkbox"]:checked') ?? []
  ).map((input) => /** @type {HTMLInputElement} */ (input).value);

  const planType = els.drawerPlanType?.value ?? PLAN_TYPE.free;
  const expiryValue = els.drawerPlanExpiry?.value ?? "";
  const expiryDate = expiryValue ? new Date(`${expiryValue}T00:00:00`) : null;

  const payload = {
    rol: els.drawerRole?.value ?? USER_ROLE.usuario,
    status: els.drawerStatus?.value ?? USER_STATUS.active,
    apps_activas: appsActivas,
    plan: {
      tipo: planType,
      fecha_inicio: state.selectedUser.plan.fecha_inicio
        ? Timestamp.fromDate(state.selectedUser.plan.fecha_inicio)
        : Timestamp.now(),
      fecha_vencimiento:
        planType === PLAN_TYPE.vitalicio || !expiryDate
          ? null
          : Timestamp.fromDate(expiryDate),
    },
  };

  try {
    await updateDoc(doc(db, "usuarios", state.selectedUser.uid), payload);
    showToast("Cambios guardados correctamente.", "success");
    closeDrawer();

    if (state.searchTerm) {
      const index = state.searchResults.findIndex((item) => item.uid === state.selectedUser.uid);
      if (index >= 0) {
        state.searchResults[index] = normalizeUserDoc(
          {
            ...state.searchResults[index],
            ...payload,
          },
          state.selectedUser.uid
        );
      }
      renderSearchPage(state.pageIndex);
    } else {
      await loadPage(state.pageIndex);
    }
  } catch (error) {
    console.error("[MAP admin] save user:", error);
    showToast(
      "No se pudieron guardar los cambios. Revisa permisos en Firestore o el esquema del documento.",
      "error"
    );
  }
}

function renderGuard(html) {
  if (!els.accessGuard || !els.console) return;
  els.console.hidden = true;
  els.accessGuard.hidden = false;
  els.accessGuard.innerHTML = html;
}

function renderSessionLoading() {
  if (!els.session) return;
  els.session.textContent = "Validando sesión…";
}

/**
 * @param {import("firebase/auth").User} user
 */
function renderSessionUser(user) {
  if (!els.session) return;
  els.session.innerHTML = `
    <span>${escapeHtml(user.email || "admin@map")}</span>
    <button id="admin-logout-btn" type="button" class="btn-map-secondary">Cerrar sesión</button>
  `;
  document.getElementById("admin-logout-btn")?.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "../../index.html";
  });
}

/**
 * @param {string} message
 * @param {"success" | "error"} kind
 */
function showToast(message, kind) {
  if (!els.toast) return;
  els.toast.hidden = false;
  els.toast.textContent = message;
  els.toast.className = `admin-toast admin-toast--${kind}`;
  window.clearTimeout(showToast._timer);
  showToast._timer = window.setTimeout(() => {
    if (!els.toast) return;
    els.toast.hidden = true;
  }, 4200);
}
showToast._timer = 0;

/**
 * @param {Date | null} date
 */
function formatDate(date) {
  if (!date) return "Sin fecha";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * @param {Date | null} date
 */
function formatDateForInput(date) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * @param {string} text
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {string} text
 */
function escapeAttr(text) {
  return escapeHtml(text).replace(/'/g, "&#39;");
}

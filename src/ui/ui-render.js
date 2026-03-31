import {
  PLAN_LABELS,
  canAccessWebapp,
  isPlanExpired,
} from "../data/user-schema.js";

const ICON_GLYPH = {
  users: "👥",
  user: "👤",
  shield: "🛡",
  calendar: "📅",
  calculator: "🧮",
  chart: "📊",
  home: "🏠",
  default: "◆",
};

/**
 * @param {{ error?: string; success?: string }} msg
 */
export function setHomeAuthMessage(msg) {
  const el = document.getElementById("home-auth-message");
  if (!el) return;
  const text = msg.success || msg.error || "";
  el.textContent = text;
  el.hidden = !text;
  el.classList.remove("home-auth-message--error", "home-auth-message--ok");
  if (msg.success) el.classList.add("home-auth-message--ok");
  else if (msg.error) el.classList.add("home-auth-message--error");
}

/**
 * @param {{
 *   onGoogle: () => void | Promise<void>;
 *   onLoginEmail: (email: string, password: string) => void | Promise<void>;
 *   onRegister: (nombre: string, email: string, password: string) => void | Promise<void>;
 * }} handlers
 */
export function renderHomeAuth(handlers) {
  document.body.dataset.shell = "guest";

  const container = document.getElementById("main-container");
  if (!container) return;

  container.innerHTML = `
    <section class="home-layout">
      <div class="home-intro">
        <p class="home-eyebrow">Asesores patrimoniales</p>
        <h1 class="home-title">MAP</h1>
        <p class="home-tagline">
          Gestión patrimonial, inversión y salud en un solo acceso seguro.
        </p>
      </div>
      <div class="home-auth-card">
        <div class="home-auth-tabs" role="tablist">
          <button type="button" class="home-auth-tab is-active" data-tab="login" role="tab" aria-selected="true">
            Ingresar
          </button>
          <button type="button" class="home-auth-tab" data-tab="register" role="tab" aria-selected="false">
            Registrarse
          </button>
        </div>
        <p id="home-auth-message" class="home-auth-message" hidden role="status"></p>
        <div id="panel-login" class="home-auth-panel" role="tabpanel">
          <form id="form-login" class="home-form" novalidate>
            <label class="home-label">Correo
              <input type="email" name="email" class="home-input" autocomplete="email" required />
            </label>
            <label class="home-label">Contraseña
              <input type="password" name="password" class="home-input" autocomplete="current-password" required />
            </label>
            <button type="submit" class="btn-map-primary">Ingresar a mi cuenta</button>
          </form>
          <p class="home-divider"><span>o</span></p>
          <button type="button" id="btn-google-login" class="btn-map-google btn-map-google--full">
            Continuar con Google
          </button>
        </div>
        <div id="panel-register" class="home-auth-panel is-hidden" role="tabpanel" hidden>
          <form id="form-register" class="home-form" novalidate>
            <label class="home-label">Nombre completo
              <input type="text" name="nombre" class="home-input" autocomplete="name" required />
            </label>
            <label class="home-label">Correo
              <input type="email" name="email" class="home-input" autocomplete="email" required />
            </label>
            <label class="home-label">Contraseña
              <input type="password" name="password" class="home-input" autocomplete="new-password" required minlength="6" />
            </label>
            <button type="submit" class="btn-map-primary">Crear cuenta</button>
          </form>
          <p class="home-divider"><span>o</span></p>
          <button type="button" id="btn-google-register" class="btn-map-google btn-map-google--full">
            Registrarse con Google
          </button>
        </div>
      </div>
    </section>
  `;

  setHomeAuthMessage({});

  const tabs = container.querySelectorAll(".home-auth-tab");
  const panelLogin = container.querySelector("#panel-login");
  const panelRegister = container.querySelector("#panel-register");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const name = tab.getAttribute("data-tab");
      tabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle("is-active", active);
        t.setAttribute("aria-selected", active ? "true" : "false");
      });
      const isLogin = name === "login";
      panelLogin?.classList.toggle("is-hidden", !isLogin);
      panelRegister?.classList.toggle("is-hidden", isLogin);
      if (panelLogin) panelLogin.hidden = !isLogin;
      if (panelRegister) panelRegister.hidden = isLogin;
      setHomeAuthMessage({});
    });
  });

  container.querySelector("#form-login")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = /** @type {HTMLFormElement} */ (e.target);
    const fd = new FormData(form);
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");
    void handlers.onLoginEmail(email, password);
  });

  container.querySelector("#form-register")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = /** @type {HTMLFormElement} */ (e.target);
    const fd = new FormData(form);
    const nombre = String(fd.get("nombre") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");
    void handlers.onRegister(nombre, email, password);
  });

  container.querySelector("#btn-google-login")?.addEventListener("click", () => {
    void handlers.onGoogle();
  });
  container.querySelector("#btn-google-register")?.addEventListener("click", () => {
    void handlers.onGoogle();
  });
}

/**
 * Vista del home autenticado: datos ya unidos en auth-handler (usuarios × webapps).
 * @param {{
 *   nombre: string;
 *   tiles: Array<
 *     | { appId: string; missing: true }
 *     | { appId: string; missing: false; titulo: string; url: string; icono: string }
 *   >;
 * }} view
 * @param {import("firebase/auth").User} user
 * @param {ReturnType<import("../data/user-schema.js").normalizeUserDoc>} userProfile
 * @param {{ onLinkGoogle: () => Promise<void>; onLinkPassword: (pwd: string) => Promise<void> }} handlers
 */
export function renderDashboard(view, user, userProfile, handlers) {
  document.body.dataset.shell = "app";

  const container = document.getElementById("main-container");
  if (!container) return;

  const { nombre, tiles } = view;
  const isAdmin = userProfile.rol === "admin";

  let gridHtml = "";
  if (tiles.length === 0 && !isAdmin) {
    gridHtml = `<p class="dashboard-empty">Aún no tienes aplicaciones asignadas. Contacta a tu asesor MAP.</p>`;
  } else {
    const adminCard = isAdmin
      ? `
        <article class="webapp-card webapp-card--admin" role="listitem">
          <div class="webapp-card__icon" aria-hidden="true">🗂</div>
          <h3 class="webapp-card__title">Consola Admin</h3>
          <p class="webapp-card__meta">apps/admin-console</p>
          <a class="webapp-card__link" href="./apps/admin-console/index.html">
            Abrir consola
          </a>
        </article>
      `
      : "";

    gridHtml =
      adminCard +
      tiles
      .map((tile) => {
        if (tile.missing) {
          return `
            <article class="webapp-card" role="listitem">
              <div class="webapp-card__icon" aria-hidden="true">${ICON_GLYPH.default}</div>
              <h3 class="webapp-card__title">No disponible</h3>
              <p class="webapp-card__meta">${escapeHtml(tile.appId)}</p>
              <span class="webapp-card__disabled">Sin entrada en <code>webapps</code> para este id</span>
            </article>
          `;
        }
        const glyph =
          ICON_GLYPH[/** @type {keyof typeof ICON_GLYPH} */ (tile.icono)] ||
          ICON_GLYPH.default;
        const titleEl = escapeHtml(tile.titulo);
        const linkHtml =
          tile.url && /^https?:\/\//i.test(tile.url)
            ? `<button class="webapp-card__link webapp-card__link-btn" type="button" data-app-id="${escapeAttr(tile.appId)}">Abrir aplicación</button>`
            : `<span class="webapp-card__disabled">URL no configurada</span>`;

        return `
          <article class="webapp-card" role="listitem">
            <div class="webapp-card__icon" aria-hidden="true">${glyph}</div>
            <h3 class="webapp-card__title">${titleEl}</h3>
            <p class="webapp-card__meta">${escapeHtml(tile.appId)}</p>
            ${linkHtml}
          </article>
        `;
      })
      .join("");
  }

  const providers = user.providerData.map((p) => p.providerId);
  const hasGoogle = providers.includes("google.com");
  const hasPassword = providers.includes("password");

  container.innerHTML = `
    <div class="dashboard-shell">
      <h2 class="dashboard-greeting">Hola, ${escapeHtml(nombre)}</h2>
      <p class="dashboard-hint">Tu menú de herramientas MAP:</p>
      <div class="app-grid app-grid--dashboard" id="app-grid" role="list">
        ${gridHtml}
      </div>
    </div>
  `;

  // Escuchar el evento del menú de perfil para abrir el modal
  const openProfileHandler = () => {
    renderProfileModal(user, userProfile, { hasGoogle, hasPassword }, handlers);
  };
  
  // Limpiar listeners anteriores para evitar duplicados si se re-renderiza
  document.removeEventListener("map:open-profile", window._mapProfileHandler);
  window._mapProfileHandler = openProfileHandler;
  document.addEventListener("map:open-profile", window._mapProfileHandler);

  container.querySelectorAll("[data-app-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const appId = /** @type {HTMLElement} */ (button).dataset.appId;
      const tile = tiles.find((item) => !item.missing && item.appId === appId);
      if (!tile || tile.missing || !tile.url) return;

      if (!canAccessWebapp(userProfile, tile)) {
        renderAccessBlockedModal();
        return;
      }

      window.open(tile.url, "_blank", "noopener,noreferrer");
    });
  });
}

/**
 * Renderiza el modal de configuración de perfil
 */
export function renderProfileModal(user, userProfile, authState, handlers) {
  const { hasGoogle, hasPassword } = authState;
  const planLabel = PLAN_LABELS[userProfile.plan.tipo] ?? userProfile.plan.tipo;
  const accessState =
    userProfile.status === "suspended"
      ? "Suspendido"
      : isPlanExpired(userProfile)
        ? "Expirado"
        : "Activo";
  
  const modal = document.createElement("div");
  modal.className = "map-modal-overlay";
  modal.id = "profile-modal";
  
  modal.innerHTML = `
    <div class="map-modal map-modal--large">
      <div class="map-modal__header">
        <h3 class="map-modal__title">Configuración de Perfil</h3>
        <button type="button" class="map-modal__close" id="btn-close-profile">✕</button>
      </div>
      
      <div class="map-modal__body">
        <section class="profile-section">
          <h4 class="profile-section__title">Información Personal</h4>
          <div class="profile-field">
            <label class="home-label">Nombre</label>
            <input type="text" class="home-input" value="${escapeAttr(user.displayName || "")}" readonly disabled />
            <span class="profile-field__hint">Para cambiar tu nombre, contacta a tu asesor.</span>
          </div>
          <div class="profile-field">
            <label class="home-label">Correo Electrónico</label>
            <input type="email" class="home-input" value="${escapeAttr(user.email || "")}" readonly disabled />
          </div>
          <div class="profile-field">
            <label class="home-label">Plan actual</label>
            <input type="text" class="home-input" value="${escapeAttr(planLabel)}" readonly disabled />
          </div>
          <div class="profile-field">
            <label class="home-label">Estado de acceso</label>
            <input type="text" class="home-input" value="${escapeAttr(accessState)}" readonly disabled />
          </div>
        </section>

        <section class="profile-section">
          <h4 class="profile-section__title">Métodos de Acceso</h4>
          <p class="dashboard-hint" style="margin-bottom: 1rem;">Gestiona cómo inicias sesión en MAP.</p>
          <div class="dashboard-security__methods">
            ${
              hasGoogle
                ? `<div class="security-linked"><span>✅</span> Google vinculado</div>`
                : `<button type="button" id="btn-link-google" class="btn-map-google">Vincular mi cuenta de Google</button>`
            }
            ${
              hasPassword
                ? `<div class="security-linked"><span>✅</span> Contraseña configurada</div>`
                : `<button type="button" id="btn-link-password" class="btn-map-primary">Crear contraseña de acceso</button>`
            }
          </div>
        </section>

        <section class="profile-section">
          <h4 class="profile-section__title">Integraciones (Próximamente)</h4>
          <p class="dashboard-hint" style="margin-bottom: 1rem;">Conecta tus herramientas externas.</p>
          <div class="integrations-grid">
            <div class="integration-card integration-card--coming-soon">
              <span class="integration-card__icon">📹</span>
              <span class="integration-card__name">Zoom</span>
              <span class="integration-card__status">Próximamente</span>
            </div>
            <div class="integration-card integration-card--coming-soon">
              <span class="integration-card__icon">📅</span>
              <span class="integration-card__name">Google Calendar</span>
              <span class="integration-card__status">Próximamente</span>
            </div>
            <div class="integration-card">
              <span class="integration-card__icon">🗂</span>
              <span class="integration-card__name">Consola Admin</span>
              <span class="integration-card__status">${
                userProfile.rol === "admin" ? "Disponible" : "Solo admin"
              }</span>
            </div>
          </div>
          ${
            userProfile.rol === "admin"
              ? `<div style="margin-top: 1rem;">
                  <a class="btn-map-primary" href="./apps/admin-console/index.html" style="display: inline-flex; text-decoration: none;">
                    Abrir Consola de Administrador
                  </a>
                </div>`
              : ""
          }
        </section>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);

  const cleanup = () => modal.remove();

  document.getElementById("btn-close-profile")?.addEventListener("click", cleanup);
  
  // Cerrar al hacer clic fuera del modal
  modal.addEventListener("click", (e) => {
    if (e.target === modal) cleanup();
  });

  if (!hasGoogle) {
    document.getElementById("btn-link-google")?.addEventListener("click", async () => {
      try {
        await handlers.onLinkGoogle();
        window.location.reload();
      } catch (e) {
        renderStatusModal("No se pudo vincular Google", errorMessage(e));
      }
    });
  }

  if (!hasPassword) {
    document.getElementById("btn-link-password")?.addEventListener("click", () => {
      promptForNewPassword(async (password) => {
        try {
          await handlers.onLinkPassword(password);
          window.location.reload();
        } catch (e) {
          renderStatusModal("No se pudo crear la contraseña", errorMessage(e));
        }
      });
    });
  }
}

export function renderAccessBlockedModal() {
  renderStatusModal(
    "Acceso restringido",
    "Cuenta en suspensión. Contacta al equipo MAP para actualizar tu pago."
  );
}

export function promptForPassword(email, onConfirm, onCancel) {
  const modal = document.createElement("div");
  modal.className = "map-modal-overlay";
  modal.innerHTML = `
    <div class="map-modal">
      <h3 class="map-modal__title">Vincular cuenta</h3>
      <p class="map-modal__text">La cuenta <strong>${escapeHtml(email)}</strong> ya existe. Ingresa tu contraseña de MAP para vincularla con Google.</p>
      <input type="password" id="modal-password" class="home-input" placeholder="Contraseña" style="width: 100%; box-sizing: border-box;" />
      <div class="map-modal__actions">
        <button id="modal-cancel" class="btn-map-secondary">Cancelar</button>
        <button id="modal-confirm" class="btn-map-primary">Vincular</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const cleanup = () => modal.remove();

  document.getElementById("modal-cancel").addEventListener("click", () => {
    cleanup();
    if (onCancel) onCancel();
  });

  document.getElementById("modal-confirm").addEventListener("click", () => {
    const pwd = document.getElementById("modal-password").value;
    cleanup();
    if (onConfirm) onConfirm(pwd);
  });
}

export function promptForNewPassword(onConfirm) {
  const modal = document.createElement("div");
  modal.className = "map-modal-overlay";
  modal.innerHTML = `
    <div class="map-modal">
      <h3 class="map-modal__title">Crear contraseña</h3>
      <p class="map-modal__text">Crea una contraseña para poder iniciar sesión con tu correo electrónico además de Google.</p>
      <input type="password" id="modal-new-password" class="home-input" placeholder="Nueva contraseña (mín. 6 caracteres)" style="width: 100%; box-sizing: border-box;" />
      <div class="map-modal__actions">
        <button id="modal-cancel" class="btn-map-secondary">Cancelar</button>
        <button id="modal-confirm" class="btn-map-primary">Guardar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const cleanup = () => modal.remove();

  document.getElementById("modal-cancel").addEventListener("click", cleanup);
  document.getElementById("modal-confirm").addEventListener("click", () => {
    const pwd = document.getElementById("modal-new-password").value;
    if (pwd.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    cleanup();
    if (onConfirm) onConfirm(pwd);
  });
}

/**
 * @param {string} title
 * @param {string} message
 */
export function renderStatusModal(title, message) {
  const modal = document.createElement("div");
  modal.className = "map-modal-overlay";
  modal.innerHTML = `
    <div class="map-modal">
      <h3 class="map-modal__title">${escapeHtml(title)}</h3>
      <p class="map-modal__text">${escapeHtml(message)}</p>
      <div class="map-modal__actions">
        <button id="modal-status-close" class="btn-map-primary">Entendido</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  const cleanup = () => modal.remove();
  document.getElementById("modal-status-close")?.addEventListener("click", cleanup);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) cleanup();
  });
}

/**
 * @param {string} text
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * @param {string} text
 */
function escapeAttr(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;");
}

/**
 * @param {unknown} error
 */
function errorMessage(error) {
  if (error instanceof Error && error.message) return error.message;
  return "Inténtalo de nuevo en unos segundos.";
}

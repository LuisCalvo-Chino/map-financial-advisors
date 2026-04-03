import { signOut } from "firebase/auth";
import { auth } from "../config/firebase-config.js";

/** @type {AbortController | null} */
let menuAbort = null;

function escapeAttr(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

/**
 * Monta el menú de usuario en `#user-profile` (mismo patrón que el portal).
 * @param {import("firebase/auth").User} user
 * @param {{
 *   isAdmin?: boolean;
 *   adminConsoleHref?: string;
 *   onOpenProfile?: () => void;
 * }} [options]
 */
export function mountUserHeaderMenu(user, options = {}) {
  const el = document.getElementById("user-profile");
  if (!el) return;

  if (!user) {
    menuAbort?.abort();
    menuAbort = null;
    el.innerHTML = "";
    return;
  }

  const {
    isAdmin = false,
    adminConsoleHref = "./apps/admin-console/index.html",
    onOpenProfile,
  } = options;

  menuAbort?.abort();
  menuAbort = new AbortController();
  const { signal } = menuAbort;

  const name = user.displayName || user.email || "Usuario";
  const adminItem = isAdmin
    ? `
        <a class="user-dropdown__item user-dropdown__item--link" href="${escapeAttr(adminConsoleHref)}">
          <span>🗂</span> Admin Console
        </a>
      `
    : "";

  el.innerHTML = `
    <div class="user-menu-container">
      <button type="button" id="btn-user-menu" class="btn-user-menu" aria-expanded="false" aria-haspopup="true">
        <span class="header-user-name">${escapeAttr(name)}</span>
        <span class="user-menu-icon">▼</span>
      </button>
      <div id="user-dropdown" class="user-dropdown is-hidden">
        <div class="user-dropdown__header">
          <p class="user-dropdown__name">${escapeAttr(name)}</p>
          <p class="user-dropdown__email">${escapeAttr(user.email || "")}</p>
        </div>
        <div class="user-dropdown__body">
          <button type="button" id="btn-open-profile" class="user-dropdown__item">
            <span>⚙️</span> Configuración de Perfil
          </button>
          ${adminItem}
        </div>
        <div class="user-dropdown__footer">
          <button type="button" id="btn-logout" class="user-dropdown__item user-dropdown__item--danger">
            <span>🚪</span> Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  `;

  const btnMenu = document.getElementById("btn-user-menu");
  const dropdown = document.getElementById("user-dropdown");

  btnMenu?.addEventListener(
    "click",
    (e) => {
      e.stopPropagation();
      const isExpanded = btnMenu.getAttribute("aria-expanded") === "true";
      btnMenu.setAttribute("aria-expanded", !isExpanded ? "true" : "false");
      dropdown?.classList.toggle("is-hidden", isExpanded);
    },
    { signal }
  );

  document.addEventListener(
    "click",
    (e) => {
      if (!el.contains(/** @type {Node} */ (e.target))) {
        btnMenu?.setAttribute("aria-expanded", "false");
        dropdown?.classList.add("is-hidden");
      }
    },
    { signal }
  );

  document.getElementById("btn-logout")?.addEventListener(
    "click",
    () => {
      void signOut(auth);
    },
    { signal }
  );

  document.getElementById("btn-open-profile")?.addEventListener(
    "click",
    () => {
      btnMenu?.setAttribute("aria-expanded", "false");
      dropdown?.classList.add("is-hidden");
      if (typeof onOpenProfile === "function") onOpenProfile();
      else document.dispatchEvent(new CustomEvent("map:open-profile"));
    },
    { signal }
  );
}

import { mountUserHeaderMenu } from "../../src/ui/user-header-menu.js";
import { renderProfileModal } from "../../src/ui/ui-render.js";
import {
  getGmailAccessState,
  linkGoogleAccount,
  linkPasswordAccount,
  requestGmailAccess,
} from "../../src/auth/auth-handler.js";
import { USER_ROLE } from "../../src/data/user-schema.js";

const ADMIN_CONSOLE_HREF = "../admin-console/index.html";

/**
 * @param {import("firebase/auth").User} user
 * @param {ReturnType<import("../../src/data/user-schema.js").normalizeUserDoc>} profile
 */
export async function initWebinarsUserHeader(user, profile) {
  const providers = user.providerData.map((p) => p.providerId);
  const hasGoogle = providers.includes("google.com");
  const hasPassword = providers.includes("password");

  let gmailAccess = {
    connected: false,
    email: "",
    providerLinked: false,
    scopes: [],
  };
  try {
    gmailAccess = await getGmailAccessState(user.uid);
  } catch {
    /* ignore */
  }

  const handlers = {
    onLinkGoogle: linkGoogleAccount,
    onLinkPassword: linkPasswordAccount,
    onRequestGmailAccess: requestGmailAccess,
  };

  const openProfile = () => {
    renderProfileModal(user, profile, { hasGoogle, hasPassword }, handlers, gmailAccess);
  };

  document.removeEventListener("map:open-profile", window._mapWebinarsProfileHandler);
  window._mapWebinarsProfileHandler = openProfile;
  document.addEventListener("map:open-profile", window._mapWebinarsProfileHandler);

  mountUserHeaderMenu(user, {
    isAdmin: profile.rol === USER_ROLE.admin,
    adminConsoleHref: ADMIN_CONSOLE_HREF,
    onOpenProfile: openProfile,
  });
}

export function clearWebinarsUserHeader() {
  document.removeEventListener("map:open-profile", window._mapWebinarsProfileHandler);
  mountUserHeaderMenu(null);
}

/**
 * @param {string} message
 */
export function setWebinarsHeaderLoading(message) {
  const el = document.getElementById("user-profile");
  if (!el) return;
  el.textContent = message;
}

export function setWebinarsLoggedOutHeader() {
  clearWebinarsUserHeader();
  const el = document.getElementById("user-profile");
  if (el) {
    el.innerHTML =
      '<a class="webinars-header-login-link" href="../../index.html">Iniciar sesión</a>';
  }
}

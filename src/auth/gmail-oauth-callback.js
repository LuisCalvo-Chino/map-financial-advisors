import { auth } from "../config/firebase-config.js";
import {
  fetchGmailBackend,
  getGmailOAuthRedirectUri,
} from "../services/gmail-backend.js";

const CALLBACK_RESULT_EVENT = "map:gmail-oauth-result";

bootstrapGmailOAuthCallback();

async function bootstrapGmailOAuthCallback() {
  const statusEl = document.getElementById("gmail-oauth-callback-status");

  try {
    await auth.authStateReady();

    if (!auth.currentUser?.uid) {
      throw new Error("No encontramos una sesión activa de MAP para completar Gmail Access.");
    }

    const url = new URL(window.location.href);
    const code = url.searchParams.get("code")?.trim() || "";
    const state = url.searchParams.get("state")?.trim() || "";
    const error = url.searchParams.get("error")?.trim() || "";
    const errorDescription = url.searchParams.get("error_description")?.trim() || "";

    if (error) {
      throw new Error(errorDescription || error);
    }
    if (!code || !state) {
      throw new Error("La respuesta de Google no incluyó código de autorización válido.");
    }

    const saved = readSavedState(state);
    if (!saved) {
      throw new Error("La sesión OAuth expiró o no coincide con la ventana que inició el flujo.");
    }

    const redirectUri = getGmailOAuthRedirectUri();
    const result = await fetchGmailBackend("/api/oauth/callback", {
      code,
      state,
      redirectUri,
    });

    if (statusEl) {
      statusEl.textContent = "Gmail Access configurado. Esta ventana se cerrará sola.";
    }

    notifyOpener({
      ok: true,
      state,
      result,
    });
    clearSavedState(state);
    window.setTimeout(() => window.close(), 900);
  } catch (error) {
    console.error("[MAP] Gmail OAuth callback:", error);
    if (statusEl) {
      statusEl.textContent =
        error instanceof Error ? error.message : "No se pudo completar Gmail Access.";
    }

    const fallbackState = new URL(window.location.href).searchParams.get("state")?.trim() || "";
    if (fallbackState) {
      notifyOpener({
        ok: false,
        state: fallbackState,
        error: error instanceof Error ? error.message : "No se pudo completar Gmail Access.",
      });
      clearSavedState(fallbackState);
    }
  }
}

function readSavedState(state) {
  try {
    const raw = window.sessionStorage.getItem(`map:gmail-oauth:${state}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearSavedState(state) {
  try {
    window.sessionStorage.removeItem(`map:gmail-oauth:${state}`);
  } catch {
    /* ignore */
  }
}

function notifyOpener(payload) {
  if (!window.opener) return;
  try {
    window.opener.postMessage(
      {
        type: CALLBACK_RESULT_EVENT,
        ...payload,
      },
      window.location.origin
    );
  } catch {
    /* ignore */
  }
}

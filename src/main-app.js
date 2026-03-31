import {
  renderConfigMissing,
  renderBootFailure,
  renderBootStuckHelp,
} from "./ui/ui-shell.js";

const BOOT_STUCK_MS = 14000;

async function boot() {
  let watchdog = 0;
  watchdog = window.setTimeout(() => {
    if (document.getElementById("shell-boot")) {
      renderBootStuckHelp();
    }
  }, BOOT_STUCK_MS);

  try {
    const key = import.meta.env.VITE_FIREBASE_API_KEY;
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

    if (!key || !projectId) {
      window.clearTimeout(watchdog);
      renderConfigMissing();
      return;
    }

    // Importamos la config para que Firebase se inicialice
    await import("./config/firebase-config.js");

    // No esperamos a auth.authStateReady() porque en algunos entornos locales
    // (o con bloqueadores) la promesa nunca resuelve y cuelga la app.
    // onAuthStateChanged en initAuthShell se dispara igual cuando Auth está listo.
    const { initAuthShell } = await import("./auth/auth-handler.js");
    initAuthShell();
  } catch (err) {
    console.error("[MAP] Arranque:", err);
    window.clearTimeout(watchdog);
    const msg = err instanceof Error ? err.message : String(err);
    renderBootFailure(msg);
  }
}

void boot();

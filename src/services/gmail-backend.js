import { auth } from "../config/firebase-config.js";

const DEFAULT_LOCAL_BACKEND_URL = "http://localhost:3000";

export function getGmailBackendBaseUrl() {
  const configured = String(import.meta.env.VITE_GMAIL_BACKEND_URL || "").trim();
  return (configured || DEFAULT_LOCAL_BACKEND_URL).replace(/\/$/, "");
}

export function getGmailOAuthRedirectUri(origin = window.location.origin) {
  return new URL("./gmail-oauth-callback.html", origin).toString();
}

export async function fetchGmailPublicBackend(path, payload = {}) {
  let response;
  try {
    response = await fetch(`${getGmailBackendBaseUrl()}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    const baseUrl = getGmailBackendBaseUrl();
    throw new Error(`No se pudo conectar con el backend de Gmail en ${baseUrl}.`);
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok || data?.ok === false) {
    throw new Error(String(data?.error || "Error en el backend de Gmail."));
  }

  return data;
}

export async function fetchGmailBackend(path, payload = {}) {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user?.uid) {
    throw new Error("Debes iniciar sesión para continuar.");
  }

  const idToken = await user.getIdToken();
  let response;
  try {
    response = await fetch(`${getGmailBackendBaseUrl()}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    const baseUrl = getGmailBackendBaseUrl();
    const origin =
      typeof window !== "undefined" ? String(window.location.origin || "") : "";
    const detail =
      error instanceof Error && error.message && error.message !== "Failed to fetch"
        ? ` (${error.message})`
        : "";
    throw new Error(
      `No se pudo conectar con el backend de Gmail en ${baseUrl}.${detail} ` +
        `Comprueba: (1) En otra terminal, desde la carpeta backend del repo: npm run dev (o npm run start:local / npx vercel dev --listen 3000). ` +
        `(2) VITE_GMAIL_BACKEND_URL en .env.local coincide con esa URL (p. ej. http://localhost:3000) y reiniciaste Vite tras cambiarla. ` +
        (origin
          ? `(3) En el .env del backend, ALLOWED_ORIGINS incluye ${origin} (ver FIREBASE_GMAIL.md).`
          : "")
    );
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok || data?.ok === false) {
    throw new Error(String(data?.error || "No se pudo comunicar con el backend de Gmail."));
  }

  return data;
}

import { auth, googleProvider, db } from "../config/firebase-config.js";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { firebaseAuthMessage } from "./auth-messages.js";
import {
  isDashboardWebappHidden,
  isDeprecatedWebappId,
} from "../config/portal-webapps.js";
import {
  buildInitialUserProfile,
  normalizeUserDoc,
} from "../data/user-schema.js";
import {
  promptForPassword,
  renderDashboard,
  renderHomeAuth,
  setHomeAuthMessage,
} from "../ui/ui-render.js";
import { mountUserHeaderMenu } from "../ui/user-header-menu.js";
import { dismissShellBoot } from "../ui/ui-shell.js";
import {
  fetchGmailBackend,
  getGmailOAuthRedirectUri,
} from "../services/gmail-backend.js";

const GMAIL_OAUTH_RESULT_EVENT = "map:gmail-oauth-result";

function gmailAccessDocRef(uid) {
  return doc(db, "usuarios", uid, "private", "gmail_access");
}

export async function getGmailAccessState(uid) {
  if (!uid) {
    return { connected: false, email: "", providerLinked: false, scopes: [] };
  }

  const snap = await getDoc(gmailAccessDocRef(uid));
  if (!snap.exists()) {
    return { connected: false, email: "", providerLinked: false, scopes: [] };
  }

  const data = snap.data();
  return {
    connected: Boolean(data.connected),
    email: typeof data.email === "string" ? data.email : "",
    providerLinked: Boolean(data.providerLinked),
    scopes: Array.isArray(data.scopes) ? data.scopes.map((item) => String(item)) : [],
  };
}

async function safeGetGmailAccessState(uid) {
  try {
    return await getGmailAccessState(uid);
  } catch (error) {
    console.warn("[MAP] No se pudo leer gmail_access; se usará estado pendiente.", error);
    return {
      connected: false,
      email: "",
      providerLinked: false,
      scopes: [],
    };
  }
}

export async function requestGmailAccess() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Debes iniciar sesión para configurar Gmail Access.");
  }

  const state = createRandomState();
  const redirectUri = getGmailOAuthRedirectUri(window.location.origin);
  persistOAuthState(state, {
    uid: user.uid,
    origin: window.location.origin,
    createdAt: Date.now(),
  });

  const response = await fetchGmailBackend("/api/oauth/start", {
    state,
    redirectUri,
  });
  const authUrl = String(response?.authUrl || "");
  if (!authUrl) {
    clearOAuthState(state);
    throw new Error("No se pudo iniciar Gmail Access.");
  }

  const popup = openCenteredPopup(authUrl, "map-gmail-access");
  if (!popup) {
    clearOAuthState(state);
    throw new Error("El navegador bloqueó la ventana emergente de Gmail Access.");
  }

  try {
    const payload = await waitForOAuthResult(state, popup);
    return {
      connected: true,
      email:
        payload && typeof payload === "object" && "result" in payload
          ? String(payload.result?.email || user.email || "")
          : user.email || "",
    };
  } finally {
    clearOAuthState(state);
  }
}

function createRandomState() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function persistOAuthState(state, payload) {
  window.sessionStorage.setItem(`map:gmail-oauth:${state}`, JSON.stringify(payload));
}

function clearOAuthState(state) {
  window.sessionStorage.removeItem(`map:gmail-oauth:${state}`);
}

function openCenteredPopup(url, name) {
  const width = 560;
  const height = 720;
  const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
  const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));
  return window.open(
    url,
    name,
    `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
  );
}

function waitForOAuthResult(state, popup) {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("La autorización de Gmail tardó demasiado o fue cancelada."));
    }, 180000);

    const closedWatcher = window.setInterval(() => {
      if (popup.closed) {
        cleanup();
        reject(new Error("La ventana de Gmail Access se cerró antes de completar el proceso."));
      }
    }, 500);

    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.type !== GMAIL_OAUTH_RESULT_EVENT) return;
      if (String(data.state || "") !== state) return;

      cleanup();
      if (data.ok) {
        resolve(data);
      } else {
        reject(new Error(String(data.error || "No se pudo completar Gmail Access.")));
      }
    };

    const cleanup = () => {
      window.clearTimeout(timeout);
      window.clearInterval(closedWatcher);
      window.removeEventListener("message", onMessage);
      try {
        if (!popup.closed) popup.close();
      } catch {
        /* ignore */
      }
    };

    window.addEventListener("message", onMessage);
  });
}

export async function loginWithGoogle() {
  try {
    setHomeAuthMessage({});
    const result = await signInWithPopup(auth, googleProvider);
    console.log("Usuario logueado:", result.user.displayName);
  } catch (error) {
    if (error.code === "auth/account-exists-with-different-credential") {
      const email = error.customData.email;
      const pendingCred = GoogleAuthProvider.credentialFromError(error);

      promptForPassword(
        email,
        async (password) => {
          try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            await linkWithCredential(result.user, pendingCred);
            // onAuthStateChanged se encargará de renderizar el dashboard
          } catch (linkError) {
            console.error("Error al vincular:", linkError);
            setHomeAuthMessage({
              error: "Contraseña incorrecta o error al vincular.",
            });
          }
        },
        () => {
          setHomeAuthMessage({ error: "Vinculación cancelada." });
        }
      );
    } else {
      console.error("Error en login:", error);
      setHomeAuthMessage({ error: firebaseAuthMessage(error) });
    }
  }
}

export async function loginWithEmail(email, password) {
  try {
    setHomeAuthMessage({});
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error("Error login email:", error);
    setHomeAuthMessage({ error: firebaseAuthMessage(error) });
  }
}

export async function registerWithEmail(nombre, email, password) {
  try {
    setHomeAuthMessage({});
    if (!nombre) {
      setHomeAuthMessage({ error: "Escribe tu nombre completo." });
      return;
    }
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(
      doc(db, "usuarios", cred.user.uid),
      buildInitialUserProfile({
        nombre: nombre.trim(),
        email: cred.user.email ?? email.trim(),
        fechaInicio: serverTimestamp(),
      })
    );
  } catch (error) {
    console.error("Error registro:", error);
    setHomeAuthMessage({ error: firebaseAuthMessage(error) });
  }
}

export function logout() {
  return signOut(auth);
}

export async function linkGoogleAccount() {
  const user = auth.currentUser;
  if (!user) return;
  await linkWithPopup(user, googleProvider);
}

export async function linkPasswordAccount(password) {
  const user = auth.currentUser;
  if (!user || !user.email) return;
  const cred = EmailAuthProvider.credential(user.email, password);
  await linkWithCredential(user, cred);
}

const PORTAL_ADMIN_HREF = "./apps/admin-console/index.html";

/** @param {import("firebase/auth").User} user */
function isGoogleUser(user) {
  return user.providerData.some((p) => p.providerId === "google.com");
}

/** @param {import("firebase/auth").User} user */
function profileFromGoogleUser(user) {
  const email = user.email ?? "";
  const nombre =
    (user.displayName && user.displayName.trim()) ||
    (email.includes("@") ? email.split("@")[0] : "") ||
    "Usuario";
  return buildInitialUserProfile({
    nombre,
    email,
    fechaInicio: serverTimestamp(),
  });
}

/**
 * Lee apps_activas del perfil y hace join con webapps/{appId} en paralelo.
 * @param {Record<string, unknown>} userData
 */
async function joinUserWebappsWithCatalog(userData) {
  const profile = normalizeUserDoc(userData);
  const ids = profile.apps_activas.filter((appId) => !isDeprecatedWebappId(appId));

  if (ids.length === 0) {
    return { nombre: profile.nombre, tiles: [] };
  }

  const snaps = await Promise.all(
    ids.map((appId) => getDoc(doc(db, "webapps", appId)))
  );

  const tiles = ids
    .map((appId, i) => {
      const snap = snaps[i];
      if (!snap.exists()) {
        return { appId, missing: true };
      }
      const d = snap.data();
      return {
        appId,
        missing: false,
        titulo:
          typeof d.titulo === "string" && d.titulo.trim()
            ? d.titulo.trim()
            : appId,
        url: typeof d.url === "string" ? d.url.trim() : "",
        es_gratuita: Boolean(d.es_gratuita),
        icono:
          typeof d.icono === "string" ? d.icono.toLowerCase().trim() : "",
      };
    })
    .filter((tile) => !isDashboardWebappHidden(tile));

  return { nombre: profile.nombre, tiles };
}

/** Registrar el shell: espera a que exista `main-container` y Firebase Auth esté listo (llamar desde `main-app` tras `authStateReady`). */
export function initAuthShell() {
  onAuthStateChanged(auth, async (user) => {
    dismissShellBoot();

    const mainContainer = document.getElementById("main-container");
    if (!mainContainer) return;

    if (user) {
      document.body.dataset.shell = "app";
      setHomeAuthMessage({});
      mountUserHeaderMenu(user, {
        isAdmin: false,
        adminConsoleHref: PORTAL_ADMIN_HREF,
      });
      try {
        const userRef = doc(db, "usuarios", user.uid);
        const userSnap = await getDoc(userRef);

        const handlers = {
          onLinkGoogle: linkGoogleAccount,
          onLinkPassword: linkPasswordAccount,
          onRequestGmailAccess: requestGmailAccess,
        };

        if (userSnap.exists()) {
          const profile = normalizeUserDoc(userSnap.data(), user.uid);
          mountUserHeaderMenu(user, {
            isAdmin: profile.rol === "admin",
            adminConsoleHref: PORTAL_ADMIN_HREF,
          });
          const view = await joinUserWebappsWithCatalog(userSnap.data());
          const gmailAccess = await safeGetGmailAccessState(user.uid);
          renderDashboard(view, user, profile, handlers, gmailAccess);
        } else if (isGoogleUser(user) && user.email) {
          const nuevo = profileFromGoogleUser(user);
          await setDoc(userRef, nuevo);
          const profile = normalizeUserDoc(
            {
              ...nuevo,
              plan: {
                ...nuevo.plan,
                fecha_inicio: new Date(),
              },
            },
            user.uid
          );
          mountUserHeaderMenu(user, {
            isAdmin: profile.rol === "admin",
            adminConsoleHref: PORTAL_ADMIN_HREF,
          });
          const view = await joinUserWebappsWithCatalog({
            ...nuevo,
            plan: {
              ...nuevo.plan,
              fecha_inicio: new Date(),
            },
          });
          const gmailAccess = await safeGetGmailAccessState(user.uid);
          renderDashboard(view, user, profile, handlers, gmailAccess);
        } else {
          mainContainer.innerHTML =
            '<div class="auth-error"><h2>Usuario no registrado</h2><p>No encontramos tu perfil en el sistema MAP. Regístrate con correo y contraseña o pide a un asesor que dé de alta tu cuenta.</p></div>';
        }
      } catch (err) {
        console.error("Error al leer perfil:", err);
        mainContainer.innerHTML =
          '<div class="auth-error"><h2>No se pudo cargar tu perfil</h2><p>Revisa tu conexión o los permisos en Firestore.</p></div>';
      }
    } else {
      mountUserHeaderMenu(null);
      renderHomeAuth({
        onGoogle: loginWithGoogle,
        onLoginEmail: loginWithEmail,
        onRegister: registerWithEmail,
      });
    }
  });
}

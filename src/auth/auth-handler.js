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
  buildInitialUserProfile,
  normalizeUserDoc,
} from "../data/user-schema.js";
import {
  promptForPassword,
  renderDashboard,
  renderHomeAuth,
  setHomeAuthMessage,
} from "../ui/ui-render.js";
import { dismissShellBoot } from "../ui/ui-shell.js";

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

function setHeaderUser(user) {
  const el = document.getElementById("user-profile");
  if (!el) return;

  if (!user) {
    el.innerHTML = "";
    return;
  }

  const name = user.displayName || user.email || "Usuario";
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

  btnMenu?.addEventListener("click", (e) => {
    e.stopPropagation();
    const isExpanded = btnMenu.getAttribute("aria-expanded") === "true";
    btnMenu.setAttribute("aria-expanded", !isExpanded ? "true" : "false");
    dropdown?.classList.toggle("is-hidden", isExpanded);
  });

  // Cerrar al hacer clic fuera
  document.addEventListener("click", (e) => {
    if (!el.contains(e.target)) {
      btnMenu?.setAttribute("aria-expanded", "false");
      dropdown?.classList.add("is-hidden");
    }
  });

  document.getElementById("btn-logout")?.addEventListener("click", () => {
    void logout();
  });

  document.getElementById("btn-open-profile")?.addEventListener("click", () => {
    btnMenu?.setAttribute("aria-expanded", "false");
    dropdown?.classList.add("is-hidden");
    // Despachar evento personalizado para que ui-render lo capture
    document.dispatchEvent(new CustomEvent("map:open-profile"));
  });
}

function escapeAttr(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

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
  const ids = profile.apps_activas;

  if (ids.length === 0) {
    return { nombre: profile.nombre, tiles: [] };
  }

  const snaps = await Promise.all(
    ids.map((appId) => getDoc(doc(db, "webapps", appId)))
  );

  const tiles = ids.map((appId, i) => {
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
  });

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
      setHeaderUser(user);
      try {
        const userRef = doc(db, "usuarios", user.uid);
        const userSnap = await getDoc(userRef);

        const handlers = {
          onLinkGoogle: linkGoogleAccount,
          onLinkPassword: linkPasswordAccount,
        };

        if (userSnap.exists()) {
          const profile = normalizeUserDoc(userSnap.data(), user.uid);
          const view = await joinUserWebappsWithCatalog(userSnap.data());
          renderDashboard(view, user, profile, handlers);
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
          const view = await joinUserWebappsWithCatalog({
            ...nuevo,
            plan: {
              ...nuevo.plan,
              fecha_inicio: new Date(),
            },
          });
          renderDashboard(view, user, profile, handlers);
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
      setHeaderUser(null);
      renderHomeAuth({
        onGoogle: loginWithGoogle,
        onLoginEmail: loginWithEmail,
        onRegister: registerWithEmail,
      });
    }
  });
}

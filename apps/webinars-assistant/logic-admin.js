import { auth, db } from "../../src/config/firebase-config.js";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { canAccessWebapp, normalizeUserDoc } from "../../src/data/user-schema.js";
import { generatePublicHexSlug, slugifyInternal } from "./webinar-defaults.js";
import {
  normalizeWebinarDocFromFirestore,
  renderWebinarFormShell,
} from "./webinar-form-ui.js";
import { sendPendingEmails } from "./email-engine.js";
import {
  clearWebinarsUserHeader,
  initWebinarsUserHeader,
  setWebinarsHeaderLoading,
  setWebinarsLoggedOutHeader,
} from "./webinars-header.js";

export { DEFAULT_WEBINAR_LOGO_PATH, resolveWebinarLogoUrl } from "./webinar-defaults.js";

export const WEBINAR_STATUS = {
  draft: "draft",
  published: "published",
  closed: "closed",
};

export const WEBINAR_FIELD_TYPES = {
  text: "text",
  email: "email",
  phone: "phone",
  file: "file",
  paragraph: "paragraph",
};

export const EMAIL_DELIVERY_STATE = {
  pending: "pending",
  sent: "sent",
  failed: "failed",
};

const PREMIUM_APP_CONFIG = {
  es_gratuita: false,
};

const DEFAULT_BRANDING = {
  logoUrl: "",
  logoMaxHeightPx: 180,
  headerColor: "#173862",
  footerColor: "#102742",
  backgroundColor: "#F4F0ED",
  contentColor: "#FFFFFF",
  titleColor: "#173862",
  textColor: "#102742",
  fieldTextColor: "#102742",
  fieldInputBackgroundColor: "#ffffff",
  fieldInputTextColor: "#102742",
  accentColor: "#A89F8F",
  title: "Nuevo webinar MAP",
  subtitle: "Disena una experiencia de registro profesional y alineada con la marca.",
  footerText: "MAP - Gestion profesional de registros y comunicaciones.",
};

/**
 * Objeto inicial de un webinar (borrador, branding por defecto, sin campos).
 * Sirve para validar el contrato y para armar el payload antes del CRUD.
 *
 * @param {{ ownerUid?: string, ownerEmail?: string }} [params]
 */
export function buildInitialWebinarDoc({ ownerUid = "", ownerEmail = "" } = {}) {
  return {
    titulo: "Nuevo webinar MAP",
    slug: slugifyInternal("Nuevo webinar MAP"),
    descripcion:
      "Webinar base para presentar una experiencia de registro premium dentro del ecosistema MAP.",
    estado: WEBINAR_STATUS.draft,
    publicHex: "",
    schedule: {
      startsAt: null,
      endsAt: null,
      timezone: "America/Costa_Rica",
    },
    branding: { ...DEFAULT_BRANDING },
    fields: [],
    drive: {
      rootFolderId: null,
      registrantFolderPrefix: "MAP-Webinar",
      allowFileUploads: false,
    },
    messaging: {
      enabled: false,
      templates: {},
      messages: [],
    },
    emails: {
      welcome: {
        enabled: true,
        subject: "Bienvenido a tu webinar MAP",
        htmlRef: null,
        state: EMAIL_DELIVERY_STATE.pending,
      },
      reminder: {
        enabled: true,
        subject: "Recordatorio de tu webinar MAP",
        htmlRef: null,
        state: EMAIL_DELIVERY_STATE.pending,
      },
      thankYou: {
        enabled: true,
        subject: "Gracias por participar con MAP",
        htmlRef: null,
        state: EMAIL_DELIVERY_STATE.pending,
      },
    },
    metrics: {
      totalRegistrations: 0,
      totalConfirmed: 0,
      totalAttended: 0,
    },
    publication: {
      isPublic: false,
      publicUrl: "",
      visibility: "private",
    },
    createdBy: {
      uid: ownerUid,
      email: ownerEmail,
    },
    createdAt: null,
    updatedAt: null,
  };
}

export const INITIAL_WEBINAR_TEMPLATE = buildInitialWebinarDoc();

/** @type {ReturnType<typeof buildInitialWebinarDoc> | null} */
let builderDraft = null;
/** @type {string | null} */
let builderFirestoreId = null;
/** @type {string | null} */
let builderSelectedFieldId = null;
/** @type {string | null} */
let lastInspectorFieldId = null;

/** @type {ReturnType<typeof setTimeout> | undefined} */
let builderToastTimer;

const els = {
  guard: document.getElementById("webinars-access-guard"),
  dashboard: document.getElementById("webinars-dashboard"),
  builder: document.getElementById("webinars-builder"),
};

bootstrapAdminShell();

function bootstrapAdminShell() {
  setWebinarsHeaderLoading("Verificando…");

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      setDashboardNewWebinarButtonsEnabled(false);
      renderGuard(
        "Inicia sesion con tu cuenta MAP para acceder al panel y al builder de webinars."
      );
      setWebinarsLoggedOutHeader();
      return;
    }

    try {
      await auth.authStateReady();
    } catch (e) {
      console.error("[MAP webinars] authStateReady:", e);
    }

    if (!auth.currentUser?.uid) {
      console.error("[MAP webinars] Sesión no iniciada tras authStateReady.");
      renderGuard(
        "No se pudo confirmar tu sesión con Firebase. Recarga la página o vuelve a iniciar sesión."
      );
      setWebinarsLoggedOutHeader();
      return;
    }

    if (auth.currentUser.uid !== user.uid) {
      console.warn("[MAP webinars] auth.currentUser y callback de auth divergen; se usa auth.currentUser.");
    }

    const sessionUser = auth.currentUser;

    try {
      const userSnap = await getDoc(doc(db, "usuarios", sessionUser.uid));
      if (!userSnap.exists()) {
        clearWebinarsUserHeader();
        renderGuard("No encontramos un perfil MAP asociado a tu usuario autenticado.");
        return;
      }

      const profile = normalizeUserDoc(userSnap.data(), sessionUser.uid);
      if (!canAccessWebapp(profile, PREMIUM_APP_CONFIG)) {
        await initWebinarsUserHeader(sessionUser, profile);
        renderGuard(
          "Tu plan MAP no permite abrir esta app o tu acceso se encuentra suspendido."
        );
        return;
      }

      renderAdminSurface();
      await initWebinarsUserHeader(sessionUser, profile);
      const view = document.body.dataset.webinarsView;
      if (view === "builder") {
        await initBuilderPage(sessionUser);
      } else if (view === "dashboard") {
        await initDashboardPage(sessionUser);
      } else if (view === "entries") {
        const { initEntriesPage } = await import("./logic-entries.js");
        await initEntriesPage(sessionUser, profile);
      } else if (view === "form-messages") {
        const { initFormMessagesPage } = await import("./logic-form-messages.js");
        await initFormMessagesPage(sessionUser, profile);
      }
    } catch (error) {
      console.error("[MAP webinars] bootstrap:", error);
      renderGuard(
        "No se pudo cargar la estructura del asistente. Revisa la conexion con Firebase y tus permisos."
      );
    }
  });
}

function createField(field) {
  return { ...field };
}

/**
 * Habilita o deshabilita los botones "Nuevo Webinar" (evita carrera antes de que Auth esté listo).
 * @param {boolean} enabled
 */
function setDashboardNewWebinarButtonsEnabled(enabled) {
  document.querySelectorAll("[data-webinars-new]").forEach((el) => {
    if (el instanceof HTMLButtonElement) {
      el.disabled = !enabled;
      el.setAttribute("aria-disabled", enabled ? "false" : "true");
      el.title = enabled ? "" : "Esperando confirmación de sesión…";
    }
  });
}

/**
 * Espera a que Firebase Auth termine de restaurar la sesión y devuelve `auth.currentUser` si hay UID.
 * No escribe en Firestore si esto devuelve null.
 *
 * @param {import("firebase/auth").User | null} [callbackUser]
 * @returns {Promise<import("firebase/auth").User | null>}
 */
async function getActorForFirestore(callbackUser) {
  try {
    await auth.authStateReady();
  } catch (e) {
    console.error("[MAP webinars] authStateReady (getActor):", e);
  }
  const cur = auth.currentUser;
  if (!cur?.uid) {
    console.error("[MAP webinars] Sesión no iniciada: auth.currentUser sin UID; no se enviará el documento.");
    return null;
  }
  if (callbackUser?.uid && callbackUser.uid !== cur.uid) {
    console.warn(
      "[MAP webinars] El usuario del callback no coincide con auth.currentUser; se usa auth.currentUser."
    );
  }
  return cur;
}

function processOwnedEmailQueue() {
  void sendPendingEmails({ limit: 10 }).catch((error) => {
    console.warn("[MAP webinars] No se pudo procesar la cola de correos pendiente.", error);
  });
}

/**
 * @param {import("firebase/auth").User | null | undefined} fallback
 */
function resolveActorUser(fallback) {
  const cur = auth.currentUser;
  if (cur?.uid) return cur;
  return fallback ?? null;
}

/**
 * @param {import("firebase/auth").User} user
 */
async function initDashboardPage(user) {
  const mount = document.getElementById("webinars-dashboard-list");
  if (!mount) return;

  setDashboardNewWebinarButtonsEnabled(false);

  const actor = await getActorForFirestore(user);
  if (!actor) {
    if (mount) {
      mount.innerHTML =
        "<p class=\"webinars-builder-status webinars-builder-status--error\">No hay sesión de Firebase activa. Recarga o inicia sesión de nuevo.</p>";
    }
    return;
  }

  bindDashboardNewWebinarButtons(actor);
  processOwnedEmailQueue();

  mount.innerHTML = "<p class=\"webinars-list-loading\">Cargando tus formularios…</p>";

  try {
    const q = query(
      collection(db, "webinars"),
      where("createdBy.uid", "==", actor.uid),
      limit(50)
    );
    const snap = await getDocs(q);
    const rows = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((row) => !row.archivedAt); // Filtrar archivados

    rows.sort((a, b) => {
      const fa = a.dashboardFavorite ? 1 : 0;
      const fb = b.dashboardFavorite ? 1 : 0;
      if (fa !== fb) return fb - fa;
      const ta = b.updatedAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0;
      const tb = a.updatedAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0;
      return ta - tb;
    });

    if (rows.length === 0) {
      mount.innerHTML =
        "<p class=\"dashboard-empty\">Aún no tienes formularios guardados. Usa el botón <strong>+ Nuevo formulario</strong> arriba para crear el primero.</p>";
    } else {
      mount.innerHTML = `<ul class="webinars-saved-list" role="list">${rows
        .map((row) => {
          const id = String(row.id);
          const fav = Boolean(row.dashboardFavorite);
          const pub = row.estado === "published" && row.publicHex;
          const copyUrl = pub ? buildPublicViewerUrl(String(row.publicHex)) : "";
          const copyRow = pub
            ? `<button type="button" class="webinars-actions-dropdown__item" data-action="copy-url" data-copy="${escapeAttr(copyUrl)}">Copiar URL</button>`
            : "";
          const favLabel = fav ? "Quitar favorito" : "Marcar favorito";
          return `
      <li class="webinars-saved-item" data-webinar-id="${escapeAttr(id)}">
        <div class="webinars-saved-item__info">
          <strong>${escapeHtml(String(row.titulo || "Sin título"))}</strong>
          <span class="webinars-saved-meta">Estado: ${escapeHtml(webinarEstadoLabel(String(row.estado || "")))}</span>
        </div>
        <div class="webinars-saved-item__actions">
          <a class="btn-map-secondary btn-map-secondary--small webinars-btn-with-icon" href="./entries.html?id=${escapeAttr(id)}">${ICON_OPEN}<span>Abrir</span></a>
          <button type="button" class="btn-map-secondary btn-map-secondary--small btn-map-danger webinars-btn-with-icon" data-archive-id="${escapeAttr(id)}">${ICON_TRASH}<span>Papelera</span></button>
          <div class="webinars-actions-menu-wrap">
            <button type="button" class="webinars-menu-dots" aria-haspopup="true" aria-expanded="false" aria-label="Más opciones">${ICON_DOTS}</button>
            <div class="webinars-actions-dropdown" hidden>
              ${copyRow}
              <button type="button" class="webinars-actions-dropdown__item" data-action="info" data-webinar-id="${escapeAttr(id)}">Info</button>
              <button type="button" class="webinars-actions-dropdown__item" data-action="favorite" data-webinar-id="${escapeAttr(id)}" data-favorite="${fav ? "1" : "0"}">${escapeHtml(favLabel)}</button>
            </div>
          </div>
        </div>
      </li>`;
        })
        .join("")}</ul>`;

      if (mount.dataset.mapDashboardDelegated !== "1") {
        mount.dataset.mapDashboardDelegated = "1";
        mount.addEventListener("click", (e) => {
          if (/** @type {HTMLElement} */ (e.target).closest(".webinars-actions-menu-wrap")) {
            e.stopPropagation();
          }
        });
        document.addEventListener("click", () => closeAllDashboardRowMenus());
      }

      mount.querySelectorAll(".webinars-menu-dots").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const wrap = /** @type {HTMLElement} */ (btn).closest(".webinars-actions-menu-wrap");
          const menu = wrap?.querySelector(".webinars-actions-dropdown");
          const wasOpen = menu && !menu.hidden;
          closeAllDashboardRowMenus();
          if (menu && !wasOpen) {
            menu.hidden = false;
            btn.setAttribute("aria-expanded", "true");
          } else {
            btn.setAttribute("aria-expanded", "false");
          }
        });
      });

      mount.querySelectorAll("[data-archive-id]").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const id = /** @type {HTMLElement} */ (e.currentTarget).dataset.archiveId;
          if (!id) return;
          if (
            confirm(
              "¿Mover este formulario a la papelera? Dejará de aparecer en la lista; los datos se conservan."
            )
          ) {
            try {
              await updateDoc(doc(db, "webinars", id), {
                archivedAt: serverTimestamp(),
                archivedBy: actor.uid,
              });
              initDashboardPage(user);
            } catch (err) {
              console.error("Error al archivar:", err);
              alert("No se pudo archivar el formulario. Revisa tus permisos.");
            }
          }
        });
      });

      mount.querySelectorAll("[data-action=\"copy-url\"]").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const url = /** @type {HTMLElement} */ (e.currentTarget).dataset.copy || "";
          closeAllDashboardRowMenus();
          try {
            await navigator.clipboard.writeText(url);
            alert("Enlace copiado al portapapeles.");
          } catch {
            prompt("Copia este enlace:", url);
          }
        });
      });

      mount.querySelectorAll("[data-action=\"info\"]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const id = /** @type {HTMLElement} */ (e.currentTarget).dataset.webinarId;
          const row = rows.find((r) => r.id === id);
          closeAllDashboardRowMenus();
          if (row) void showWebinarInfoModal(row, actor);
        });
      });

      mount.querySelectorAll("[data-action=\"favorite\"]").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const el = /** @type {HTMLElement} */ (e.currentTarget);
          const id = el.dataset.webinarId;
          if (!id) return;
          const currently = el.dataset.favorite === "1";
          closeAllDashboardRowMenus();
          try {
            await updateDoc(doc(db, "webinars", id), {
              dashboardFavorite: !currently,
              updatedAt: serverTimestamp(),
            });
            initDashboardPage(user);
          } catch (err) {
            console.error(err);
            alert("No se pudo actualizar el favorito.");
          }
        });
      });
    }
  } catch (e) {
    console.error(e);
    mount.innerHTML =
      "<p class=\"webinars-builder-status webinars-builder-status--error\">No se pudo leer la lista. Revisa reglas e índices de Firestore (ver FIREBASE_WEBINARS.md).</p>";
  }

  setDashboardNewWebinarButtonsEnabled(true);
}

/**
 * @param {import("firebase/auth").User} user
 */
function bindDashboardNewWebinarButtons(user) {
  const statusEl = document.getElementById("webinars-new-status");
  document.querySelectorAll("[data-webinars-new]").forEach((btn) => {
    if (btn.dataset.mapWebinarsNewBound === "1") return;
    btn.dataset.mapWebinarsNewBound = "1";
    btn.addEventListener("click", () => {
      void handleDashboardNewWebinar(user, btn, statusEl);
    });
  });
}

/**
 * @param {import("firebase/auth").User} user
 * @param {HTMLElement} trigger
 * @param {HTMLElement | null} statusEl
 */
async function handleDashboardNewWebinar(user, trigger, statusEl) {
  if (statusEl) {
    statusEl.textContent = "";
    statusEl.hidden = true;
    statusEl.classList.remove("webinars-builder-status--error");
  }

  const actor = await getActorForFirestore(user);
  if (!actor) {
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.textContent =
        "Tu sesión aún no está lista o cerraste sesión. Espera un momento o vuelve a entrar.";
      statusEl.classList.add("webinars-builder-status--error");
    }
    return;
  }

  trigger.setAttribute("aria-busy", "true");
  /** @type {HTMLButtonElement | null} */
  const b = trigger instanceof HTMLButtonElement ? trigger : null;
  if (b) b.disabled = true;

  try {
    const id = await createInitialWebinarDoc(actor);
    window.location.assign(`./builder.html?id=${encodeURIComponent(id)}`);
  } catch (e) {
    console.error("[MAP webinars] createInitialWebinarDoc:", e);
    if (statusEl) {
      statusEl.hidden = false;
      const code =
        typeof e === "object" && e !== null && "code" in e
          ? String(/** @type {{ code?: string }} */ (e).code)
          : "";
      const detail =
        typeof e === "object" && e !== null && "message" in e
          ? String(/** @type {{ message?: string }} */ (e).message)
          : String(e);
      let hint =
        "No se pudo crear el webinar. Revisa la consola y FIREBASE_WEBINARS.md.";
      if (code === "permission-denied") {
        hint =
          "Firestore denegó la operación (permission-denied). Suele ser reglas o una consulta sin filtro de dueño; revisa la consola.";
      } else if (code === "failed-precondition") {
        hint =
          "Puede faltar un índice compuesto (createdBy.uid + publicHex en webinars). Abre el enlace que muestra la consola de Firebase.";
      }
      statusEl.textContent = `${hint} (${code || "sin código"}: ${detail})`;
      statusEl.classList.add("webinars-builder-status--error");
    }
    trigger.removeAttribute("aria-busy");
    if (b) b.disabled = false;
  }
}

/**
 * @param {import("firebase/auth").User} user
 */
async function initBuilderPage(user) {
  builderFirestoreId = null;
  builderSelectedFieldId = null;
  lastInspectorFieldId = null;

  const actor = await getActorForFirestore(user);
  if (!actor) {
    setBuilderStatus(
      "Sesión no iniciada. Recarga la página o vuelve a iniciar sesión para usar el builder.",
      true
    );
    builderDraft = deepClone(
      buildInitialWebinarDoc({
        ownerUid: "",
        ownerEmail: "",
      })
    );
    populateBuilderFormFromDraft();
    renderBuilderFieldList();
    syncBuilderPreview();
    bindBuilderPageEvents(user);
    updatePublishUi();
    return;
  }

  builderDraft = deepClone(
    buildInitialWebinarDoc({
      ownerUid: actor.uid,
      ownerEmail: actor.email || "",
    })
  );
  processOwnedEmailQueue();

  const params = new URLSearchParams(window.location.search);
  const docId = params.get("id")?.trim();

  try {
    if (docId) {
      const snap = await getDoc(doc(db, "webinars", docId));
      const raw = snap.exists() ? snap.data() : undefined;
      if (isValidOwnedWebinarDoc(/** @type {Record<string, unknown>} */ (raw), actor)) {
        builderFirestoreId = docId;
        mergeRawIntoDraft(/** @type {Record<string, unknown>} */ (raw), actor);
      } else {
        const reason = snap.exists()
          ? "El documento no tiene permisos válidos (falta createdBy o no eres el dueño). "
          : "No existe un documento con ese ID. ";
        const newId = doc(collection(db, "webinars")).id;
        await writeNewWebinarDocAtId(newId, actor);
        builderFirestoreId = newId;
        const created = await getDoc(doc(db, "webinars", newId));
        if (created.exists()) {
          mergeRawIntoDraft(created.data(), actor);
        }
        replaceBuilderUrlWithDocId(newId);
        setBuilderStatus(
          `${reason}Se creó un formulario nuevo y seguro en Firestore.`,
          false
        );
      }
    } else {
      const newId = doc(collection(db, "webinars")).id;
      await writeNewWebinarDocAtId(newId, actor);
      builderFirestoreId = newId;
      const created = await getDoc(doc(db, "webinars", newId));
      if (created.exists()) {
        mergeRawIntoDraft(created.data(), actor);
      }
      replaceBuilderUrlWithDocId(newId);
    }
  } catch (e) {
    console.error(e);
    setBuilderStatus(
      "No se pudo inicializar el formulario en Firestore. Revisa reglas y conexión.",
      true
    );
  }

  populateBuilderFormFromDraft();
  renderBuilderFieldList();
  syncBuilderPreview();
  bindBuilderPageEvents(actor);
  updatePublishUi();
}

/**
 * @param {Record<string, unknown>} raw
 * @param {import("firebase/auth").User} user
 */
function mergeRawIntoDraft(raw, user) {
  if (!builderDraft) return;
  const base = createInitialUserDraft(user);
  const merged = deepClone(base);
  const keys = [
    "titulo",
    "slug",
    "descripcion",
    "estado",
    "publicHex",
    "schedule",
    "branding",
    "fields",
    "drive",
    "emails",
    "messaging",
    "metrics",
    "publication",
    "createdBy",
  ];
  for (const k of keys) {
    if (k in raw && raw[k] !== undefined) {
      /** @type {any} */ (merged)[k] = raw[k];
    }
  }
  if (merged.branding && typeof merged.branding === "object") {
    merged.branding = { ...DEFAULT_BRANDING, ...merged.branding };
  }
  merged.createdBy = {
    uid: user.uid,
    email: user.email || "",
  };
  Object.assign(builderDraft, merged);
}

function createInitialUserDraft(user) {
  return buildInitialWebinarDoc({
    ownerUid: user.uid,
    ownerEmail: user.email || "",
  });
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function syncBuilderEntriesNavLink() {
  const link = document.getElementById("builder-link-entries");
  if (!link) return;
  if (builderFirestoreId) {
    link.href = `./entries.html?id=${encodeURIComponent(builderFirestoreId)}`;
    link.hidden = false;
  } else {
    link.hidden = true;
  }
}

function populateBuilderFormFromDraft() {
  if (!builderDraft) return;

  const fid = document.getElementById("builder-firestore-id");
  const hexEl = document.getElementById("builder-public-hex");
  const titleEl = document.getElementById("builder-title");
  const subEl = document.getElementById("builder-subtitle");
  const stateEl = document.getElementById("builder-state");
  const logoEl = document.getElementById("builder-logo-url");
  const footerTextEl = document.getElementById("builder-footer-text");
  const h = document.getElementById("builder-header-color");
  const f = document.getElementById("builder-footer-color");
  const bg = document.getElementById("builder-background-color");
  const ct = document.getElementById("builder-content-color");
  const titleCol = document.getElementById("builder-title-color");
  const textCol = document.getElementById("builder-text-color");
  const fieldTextCol = document.getElementById("builder-field-text-color");
  const fieldInputBgCol = document.getElementById("builder-field-input-bg-color");
  const fieldInputTextCol = document.getElementById("builder-field-input-text-color");

  if (fid) fid.value = builderFirestoreId || "— (se crea al guardar)";
  if (hexEl) hexEl.value = builderDraft.publicHex || "";
  if (titleEl) titleEl.value = builderDraft.titulo;
  if (subEl) subEl.value = builderDraft.branding.subtitle || "";
  if (stateEl) stateEl.value = builderDraft.estado;
  if (logoEl) logoEl.value = builderDraft.branding.logoUrl || "";
  const logoHeightEl = document.getElementById("builder-logo-height");
  const logoHeightOut = document.getElementById("builder-logo-height-value");
  if (logoHeightEl) {
    const v = clampLogoHeightPx(builderDraft.branding.logoMaxHeightPx);
    logoHeightEl.value = String(v);
    if (logoHeightOut) logoHeightOut.textContent = String(v);
  }
  if (footerTextEl) footerTextEl.value = builderDraft.branding.footerText || "";
  if (h) h.value = normalizeHexColor(builderDraft.branding.headerColor, "#173862");
  if (f) f.value = normalizeHexColor(builderDraft.branding.footerColor, "#102742");
  if (bg) bg.value = normalizeHexColor(builderDraft.branding.backgroundColor, "#f4f0ed");
  if (ct) ct.value = normalizeHexColor(builderDraft.branding.contentColor, "#ffffff");
  if (titleCol) titleCol.value = normalizeHexColor(builderDraft.branding.titleColor, "#173862");
  if (textCol) textCol.value = normalizeHexColor(builderDraft.branding.textColor, "#102742");
  if (fieldTextCol) fieldTextCol.value = normalizeHexColor(builderDraft.branding.fieldTextColor, "#102742");
  if (fieldInputBgCol) {
    fieldInputBgCol.value = normalizeHexColor(
      builderDraft.branding.fieldInputBackgroundColor,
      "#ffffff"
    );
  }
  if (fieldInputTextCol) {
    fieldInputTextCol.value = normalizeHexColor(
      builderDraft.branding.fieldInputTextColor,
      "#102742"
    );
  }

  const msgEnabledEl = document.getElementById("builder-messaging-enabled");
  const msgActionsEl = document.getElementById("builder-messaging-actions");
  const btnMessages = document.getElementById("btn-builder-open-messages");

  if (msgEnabledEl) {
    msgEnabledEl.checked = Boolean(builderDraft.messaging?.enabled);
  }
  if (msgActionsEl) {
    msgActionsEl.hidden = !builderDraft.messaging?.enabled;
  }
  if (btnMessages && builderFirestoreId) {
    btnMessages.href = `./form-messages.html?id=${builderFirestoreId}`;
  }
  syncBuilderEntriesNavLink();
}

function readBuilderFormIntoDraft() {
  if (!builderDraft) return;

  const titleEl = document.getElementById("builder-title");
  const subEl = document.getElementById("builder-subtitle");
  const stateEl = document.getElementById("builder-state");
  const logoEl = document.getElementById("builder-logo-url");
  const footerTextEl = document.getElementById("builder-footer-text");
  const h = document.getElementById("builder-header-color");
  const f = document.getElementById("builder-footer-color");
  const bg = document.getElementById("builder-background-color");
  const ct = document.getElementById("builder-content-color");
  const titleCol = document.getElementById("builder-title-color");
  const textCol = document.getElementById("builder-text-color");
  const fieldTextCol = document.getElementById("builder-field-text-color");
  const fieldInputBgCol = document.getElementById("builder-field-input-bg-color");
  const fieldInputTextCol = document.getElementById("builder-field-input-text-color");

  if (titleEl) builderDraft.titulo = titleEl.value.trim() || builderDraft.titulo;
  if (subEl) builderDraft.branding.subtitle = subEl.value.trim();
  if (stateEl) {
    builderDraft.estado = /** @type {"draft"|"published"|"closed"} */ (
      stateEl.value
    );
  }
  if (logoEl) builderDraft.branding.logoUrl = logoEl.value.trim();
  const logoHeightEl = document.getElementById("builder-logo-height");
  const logoHeightOut = document.getElementById("builder-logo-height-value");
  if (logoHeightEl) {
    const v = clampLogoHeightPx(logoHeightEl.value);
    builderDraft.branding.logoMaxHeightPx = v;
    logoHeightEl.value = String(v);
    if (logoHeightOut) logoHeightOut.textContent = String(v);
  }
  if (footerTextEl) builderDraft.branding.footerText = footerTextEl.value.trim();
  if (h) builderDraft.branding.headerColor = h.value;
  if (f) builderDraft.branding.footerColor = f.value;
  if (bg) builderDraft.branding.backgroundColor = bg.value;
  if (ct) builderDraft.branding.contentColor = ct.value;
  if (titleCol) builderDraft.branding.titleColor = titleCol.value;
  if (textCol) builderDraft.branding.textColor = textCol.value;
  if (fieldTextCol) builderDraft.branding.fieldTextColor = fieldTextCol.value;
  if (fieldInputBgCol) builderDraft.branding.fieldInputBackgroundColor = fieldInputBgCol.value;
  if (fieldInputTextCol) builderDraft.branding.fieldInputTextColor = fieldInputTextCol.value;

  const msgEnabledEl = document.getElementById("builder-messaging-enabled");
  if (msgEnabledEl) {
    if (!builderDraft.messaging) builderDraft.messaging = {};
    builderDraft.messaging.enabled = msgEnabledEl.checked;
  }

  builderDraft.branding.title = builderDraft.titulo;
  builderDraft.slug = slugifyInternal(builderDraft.titulo);
  builderDraft.descripcion = builderDraft.branding.subtitle || builderDraft.descripcion;
}

/** @param {unknown} value */
function clampLogoHeightPx(value) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 180;
  return Math.min(400, Math.max(100, Math.round(n)));
}

/**
 * @param {string | undefined} hex
 * @param {string} fallback
 */
function normalizeHexColor(hex, fallback) {
  const raw = String(hex || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
  return fallback;
}

function syncBuilderPreview() {
  readBuilderFormIntoDraft();
  applyBrandingVarsToPreviewHost();
  const root = document.getElementById("builder-final-preview-root");
  const normalized = normalizeWebinarDocFromFirestore(
    /** @type {Record<string, unknown>} */ (builderDraft)
  );
  if (normalized) {
    renderWebinarFormShell(root, normalized, { previewMode: true, formId: "builder-preview-form" });
  }
}

/**
 * Refuerza variables CSS en el host de la vista previa según el borrador actual (tiempo real).
 */
function applyBrandingVarsToPreviewHost() {
  if (!builderDraft) return;
  const root = document.getElementById("builder-final-preview-root");
  if (!root) return;
  const b = builderDraft.branding;
  root.style.setProperty("--w-preview-bg", normalizeHexColor(b.backgroundColor, "#f4f0ed"));
  root.style.setProperty("--w-header", normalizeHexColor(b.headerColor, "#173862"));
  root.style.setProperty("--w-footer", normalizeHexColor(b.footerColor, "#102742"));
  root.style.setProperty("--w-content", normalizeHexColor(b.contentColor, "#ffffff"));
  root.style.setProperty("--w-title", normalizeHexColor(b.titleColor, "#173862"));
  root.style.setProperty("--w-text", normalizeHexColor(b.textColor, "#102742"));
  root.style.setProperty("--w-label", normalizeHexColor(b.fieldTextColor, "#102742"));
  root.style.setProperty(
    "--w-input-bg",
    normalizeHexColor(b.fieldInputBackgroundColor, "#ffffff")
  );
  root.style.setProperty(
    "--w-input-text",
    normalizeHexColor(b.fieldInputTextColor, "#102742")
  );
}

export function buildPublicViewerUrl(publicHex) {
  try {
    const u = new URL("./viewer.html", window.location.href);
    u.searchParams.set("h", publicHex);
    return u.href;
  } catch {
    return `./viewer.html?h=${encodeURIComponent(publicHex)}`;
  }
}

/**
 * @param {string | undefined} estado
 */
function webinarEstadoLabel(estado) {
  if (estado === "published") return "Publicado";
  if (estado === "closed") return "Cancelado";
  if (estado === "draft") return "Borrador";
  return String(estado || "—");
}

const ICON_OPEN = `<svg class="webinars-btn-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
const ICON_TRASH = `<svg class="webinars-btn-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;
const ICON_DOTS = `<svg class="webinars-btn-icon webinars-btn-icon--dots" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>`;

function closeAllDashboardRowMenus() {
  document.querySelectorAll(".webinars-actions-dropdown").forEach((el) => {
    el.hidden = true;
  });
}

/**
 * @param {Record<string, unknown>} row
 * @param {import("firebase/auth").User} actor
 */
async function showWebinarInfoModal(row, actor) {
  const id = String(row.id || "");
  let count = 0;
  try {
    const c = await getCountFromServer(collection(db, "webinars", id, "participantes"));
    count = c.data().count;
  } catch {
    count = -1;
  }

  const hex = String(row.publicHex || "—");
  const publicUrl =
    row.estado === "published" && row.publicHex
      ? buildPublicViewerUrl(String(row.publicHex))
      : "—";
  const created = row.createdAt?.toDate?.()?.toLocaleString?.() ?? "—";
  const updated = row.updatedAt?.toDate?.()?.toLocaleString?.() ?? "—";
  const owner = row.createdBy && typeof row.createdBy === "object"
    ? String(/** @type {{ email?: string }} */ (row.createdBy).email || actor.email || "—")
    : "—";
  const metrics = row.metrics && typeof row.metrics === "object"
    ? /** @type {Record<string, unknown>} */ (row.metrics)
    : {};
  const totalReg = typeof metrics.totalRegistrations === "number" ? metrics.totalRegistrations : "—";

  const overlay = document.createElement("div");
  overlay.className = "webinars-modal-overlay";
  overlay.innerHTML = `
    <div class="webinars-modal webinars-modal--info" role="dialog" aria-modal="true" aria-labelledby="webinar-info-title">
      <div class="webinars-modal__head">
        <h2 id="webinar-info-title">Información del formulario</h2>
        <button type="button" class="webinars-modal__close" aria-label="Cerrar">✕</button>
      </div>
      <dl class="webinars-info-dl">
        <dt>ID del formulario (Firestore)</dt><dd><code>${escapeHtml(id)}</code></dd>
        <dt>Hex público</dt><dd><code>${escapeHtml(hex)}</code></dd>
        <dt>URL pública</dt><dd>${publicUrl !== "—" ? `<a href="${escapeAttr(publicUrl)}" target="_blank" rel="noopener">${escapeHtml(publicUrl)}</a>` : escapeHtml(publicUrl)}</dd>
        <dt>Estado</dt><dd>${escapeHtml(webinarEstadoLabel(String(row.estado || "")))}</dd>
        <dt>Inscripciones (subcolección)</dt><dd>${count >= 0 ? String(count) : "No disponible"}</dd>
        <dt>Métrica totalRegistrations (doc)</dt><dd>${escapeHtml(String(totalReg))}</dd>
        <dt>Creado</dt><dd>${escapeHtml(created)}</dd>
        <dt>Actualizado</dt><dd>${escapeHtml(updated)}</dd>
        <dt>Correo del creador</dt><dd>${escapeHtml(owner)}</dd>
      </dl>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector(".webinars-modal__close")?.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
}

/**
 * Comprueba colisión de `publicHex` solo entre **tus** webinars.
 * Importante: una consulta solo por `publicHex` la rechaza Firestore si pudiera devolver
 * documentos de otros usuarios que no pasen `allow read` (borradores ajenos).
 *
 * @param {import("firebase/auth").User} actor
 */
async function ensureUniquePublicHex(actor) {
  if (!actor?.uid) {
    throw new Error("Sesión no iniciada: no se puede asignar publicHex.");
  }
  for (let attempt = 0; attempt < 16; attempt++) {
    const hex = generatePublicHexSlug();
    try {
      const q = query(
        collection(db, "webinars"),
        where("createdBy.uid", "==", actor.uid),
        where("publicHex", "==", hex),
        limit(1)
      );
      const snap = await getDocs(q);
      if (snap.empty) return hex;
    } catch (e) {
      const code =
        typeof e === "object" && e !== null && "code" in e
          ? String(/** @type {{ code?: string }} */ (e).code)
          : "";
      if (code === "failed-precondition" || code === "permission-denied") {
        console.warn(
          "[MAP webinars] Unicidad de publicHex omitida (%s). Crea el índice compuesto en webinars: createdBy.uid + publicHex (ver firestore.indexes.json) o revisa reglas.",
          code,
          e
        );
        return hex;
      }
      throw e;
    }
  }
  throw new Error("No se pudo generar un ID único.");
}

/**
 * @param {unknown} e
 */
function isFirestoreNotFound(e) {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    /** @type {{ code?: string }} */ (e).code === "not-found"
  );
}

/**
 * Primer escritura en Firestore: `setDoc` con `publicHex`, `createdBy`, `createdAt` y `updatedAt`.
 * Cumple reglas que exigen `createdBy.uid === request.auth.uid` y `publicHex` de 32 hex.
 *
 * @param {string} webinarDocId ID de documento ya generado (`doc(collection()).id`)
 * @param {import("firebase/auth").User} user
 */
async function writeNewWebinarDocAtId(webinarDocId, user) {
  const actor = await getActorForFirestore(user);
  if (!actor) {
    console.error("[MAP webinars] Sesión no iniciada: no se ejecuta setDoc.");
    throw new Error("Sesión no iniciada");
  }
  const hex = await ensureUniquePublicHex(actor);
  const data = buildInitialWebinarDoc({
    ownerUid: actor.uid,
    ownerEmail: actor.email || "",
  });
  data.publicHex = hex;
  data.createdBy = {
    uid: actor.uid,
    email: actor.email || "",
  };
  data.createdAt = serverTimestamp();
  data.updatedAt = serverTimestamp();
  data.publication = {
    ...data.publication,
    publicUrl: buildPublicViewerUrl(hex),
    isPublic: false,
    visibility: "private",
  };
  await setDoc(doc(db, "webinars", webinarDocId), data);
}

/**
 * Crea un webinar con ID conocido (`setDoc`) para que las reglas de seguridad apliquen desde el primer byte.
 *
 * @param {import("firebase/auth").User} user
 * @returns {Promise<string>} ID del documento (`webinars/{id}`)
 */
export async function createInitialWebinarDoc(user) {
  const id = doc(collection(db, "webinars")).id;
  await writeNewWebinarDocAtId(id, user);
  return id;
}

/**
 * @param {Record<string, unknown> | undefined} raw
 * @param {import("firebase/auth").User} user
 */
function isValidOwnedWebinarDoc(raw, user) {
  if (!raw || typeof raw !== "object") return false;
  const actor = resolveActorUser(user);
  const cb = raw.createdBy;
  if (!cb || typeof cb !== "object" || cb === null) return false;
  const uid = String(/** @type {{ uid?: string }} */ (cb).uid || "");
  const hex = typeof raw.publicHex === "string" ? raw.publicHex : "";
  return uid === actor.uid && hex.length === 32;
}

function replaceBuilderUrlWithDocId(webinarDocId) {
  try {
    const u = new URL(window.location.href);
    u.searchParams.set("id", webinarDocId);
    window.history.replaceState({}, "", u.toString());
  } catch {
    /* ignore */
  }
}

/**
 * @param {import("firebase/auth").User} user
 * @param {import("firebase/auth").User | null} [actorResolved] Si viene de `getActorForFirestore`, úsalo (evita carrera con `auth.currentUser`).
 */
function buildPayloadForFirestore(user, isNew, actorResolved) {
  if (!builderDraft) return null;
  readBuilderFormIntoDraft();
  const actor = actorResolved ?? resolveActorUser(user);
  if (!actor?.uid) return null;

  const publicUrl = builderDraft.publicHex
    ? buildPublicViewerUrl(builderDraft.publicHex)
    : "";

  return {
    titulo: builderDraft.titulo,
    slug: builderDraft.slug,
    descripcion: builderDraft.descripcion,
    estado: builderDraft.estado,
    publicHex: builderDraft.publicHex,
    schedule: builderDraft.schedule,
    branding: { ...builderDraft.branding },
    fields: deepClone(builderDraft.fields),
    drive: { ...builderDraft.drive },
    emails: deepClone(builderDraft.emails),
    metrics: { ...builderDraft.metrics },
    publication: {
      ...builderDraft.publication,
      publicUrl,
      isPublic: builderDraft.estado === "published",
      visibility: builderDraft.estado === "published" ? "public" : "private",
    },
    createdBy: {
      uid: actor.uid,
      email: actor.email || "",
    },
    updatedAt: serverTimestamp(),
    ...(isNew ? { createdAt: serverTimestamp() } : {}),
  };
}

/**
 * @param {import("firebase/auth").User} user
 */
async function saveWebinarToFirestore(user) {
  if (!builderDraft) return;

  const actor = await getActorForFirestore(user);
  if (!actor) {
    setBuilderStatus(
      "Sesión no iniciada. Espera a que cargue Firebase o vuelve a iniciar sesión.",
      true
    );
    return;
  }

  readBuilderFormIntoDraft();

  try {
    if (!builderFirestoreId) {
      const newId = doc(collection(db, "webinars")).id;
      if (!builderDraft.publicHex || builderDraft.publicHex.length !== 32) {
        builderDraft.publicHex = await ensureUniquePublicHex(actor);
      }
      const payload = buildPayloadForFirestore(user, true, actor);
      if (!payload) return;
      payload.publicHex = builderDraft.publicHex;
      await setDoc(doc(db, "webinars", newId), payload);
      builderFirestoreId = newId;
      replaceBuilderUrlWithDocId(newId);
      setBuilderStatus("Guardado. ID público asignado.");
      showBuilderToast("Formulario creado y guardado correctamente.");
    } else {
      const payload = buildPayloadForFirestore(user, false, actor);
      if (!payload) return;
      delete payload.createdAt;
      const ref = doc(db, "webinars", builderFirestoreId);
      try {
        await updateDoc(ref, payload);
      } catch (e) {
        if (isFirestoreNotFound(e)) {
          const full = buildPayloadForFirestore(user, true, actor);
          if (!full) return;
          full.publicHex =
            builderDraft.publicHex && builderDraft.publicHex.length === 32
              ? builderDraft.publicHex
              : await ensureUniquePublicHex(actor);
          builderDraft.publicHex = full.publicHex;
          full.publication = {
            ...full.publication,
            publicUrl: buildPublicViewerUrl(full.publicHex),
          };
          await setDoc(ref, full);
        } else {
          throw e;
        }
      }
      setBuilderStatus("Cambios guardados.");
      showBuilderToast("Cambios guardados correctamente.");
    }

    populateBuilderFormFromDraft();
    updatePublishUi();
    if (builderDraft.estado === "published" && builderDraft.publicHex) {
      showPublishedLink();
    }
  } catch (e) {
    console.error(e);
    setBuilderStatus(
      "Error al guardar. Revisa reglas de Firestore y la consola.",
      true
    );
  }
}

/**
 * @param {import("firebase/auth").User} user
 */
async function publishWebinar(user) {
  if (!builderFirestoreId || !builderDraft) {
    setBuilderStatus("Primero guarda el formulario (Guardar cambios).", true);
    return;
  }

  const actor = await getActorForFirestore(user);
  if (!actor) {
    setBuilderStatus(
      "Sesión no iniciada. Espera a que cargue Firebase o vuelve a iniciar sesión.",
      true
    );
    return;
  }

  readBuilderFormIntoDraft();
  builderDraft.estado = WEBINAR_STATUS.published;
  const stateEl = document.getElementById("builder-state");
  if (stateEl) stateEl.value = "published";

  try {
    const payload = buildPayloadForFirestore(user, false, actor);
    if (!payload) return;
    delete payload.createdAt;
    const ref = doc(db, "webinars", builderFirestoreId);
    try {
      await updateDoc(ref, payload);
    } catch (e) {
      if (isFirestoreNotFound(e)) {
        const full = buildPayloadForFirestore(user, true, actor);
        if (!full) return;
        if (!builderDraft.publicHex || builderDraft.publicHex.length !== 32) {
          builderDraft.publicHex = await ensureUniquePublicHex(actor);
        }
        full.publicHex = builderDraft.publicHex;
        full.publication = {
          ...full.publication,
          publicUrl: buildPublicViewerUrl(full.publicHex),
        };
        await setDoc(ref, full);
      } else {
        throw e;
      }
    }
    setBuilderStatus("Publicado. Ya puedes compartir el enlace.");
    populateBuilderFormFromDraft();
    syncBuilderPreview();
    updatePublishUi();
    showPublishedLink();
  } catch (e) {
    console.error(e);
    setBuilderStatus("No se pudo publicar.", true);
  }
}

function showPublishedLink() {
  if (!builderDraft?.publicHex) return;
  const box = document.getElementById("builder-published-box");
  const input = document.getElementById("builder-public-link");
  const url = buildPublicViewerUrl(builderDraft.publicHex);
  if (box) box.hidden = false;
  if (input) input.value = url;
}

function updatePublishUi() {
  const btn = document.getElementById("btn-builder-publish");
  if (btn) btn.disabled = !builderFirestoreId;
  if (builderDraft?.estado === "published" && builderDraft.publicHex) {
    showPublishedLink();
  }
}

function showBuilderToast(message) {
  const el = document.getElementById("builder-toast");
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  el.classList.add("webinars-toast--visible");
  if (builderToastTimer) clearTimeout(builderToastTimer);
  builderToastTimer = setTimeout(() => {
    el.hidden = true;
    el.classList.remove("webinars-toast--visible");
    el.textContent = "";
  }, 3200);
}

function setBuilderStatus(message, isError = false) {
  const el = document.getElementById("builder-action-status");
  if (!el) return;
  el.textContent = message;
  el.classList.toggle("webinars-builder-status--error", Boolean(isError));
}

/**
 * @param {string} type
 */
function fieldTypeLabel(type) {
  const map = {
    text: "Texto corto",
    email: "Email",
    phone: "Tel. internacional",
    paragraph: "Párrafo",
    file: "Archivo",
    title: "Título",
    static_text: "Texto estático",
    list: "Lista",
  };
  return map[/** @type {keyof typeof map} */ (type)] || type;
}

function normalizeFieldOrders() {
  if (!builderDraft) return;
  const sorted = [...builderDraft.fields].sort((a, b) => a.order - b.order);
  sorted.forEach((f, i) => {
    f.order = i + 1;
  });
}

/**
 * @param {string} fieldId
 * @param {"up" | "down"} direction
 */
function moveFieldInBuilder(fieldId, direction) {
  if (!builderDraft) return;
  const sorted = [...builderDraft.fields].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((f) => f.id === fieldId);
  if (idx < 0) return;
  const j = direction === "up" ? idx - 1 : idx + 1;
  if (j < 0 || j >= sorted.length) return;
  const tmp = sorted[idx].order;
  sorted[idx].order = sorted[j].order;
  sorted[j].order = tmp;
  normalizeFieldOrders();
}

function parkBuilderFieldInspector() {
  const panel = document.getElementById("builder-field-inspector");
  const park = document.getElementById("builder-field-inspector-park");
  if (panel && park) {
    park.appendChild(panel);
  }
}

/**
 * Inserta el inspector justo debajo de la fila del campo seleccionado (o lo deja en el park si no hay selección).
 */
function attachBuilderFieldInspectorUnderSelectedRow() {
  const panel = document.getElementById("builder-field-inspector");
  const park = document.getElementById("builder-field-inspector-park");
  if (!panel || !park) return;

  if (panel.hidden || !builderSelectedFieldId) {
    park.appendChild(panel);
    return;
  }

  const safeId =
    typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape(builderSelectedFieldId)
      : String(builderSelectedFieldId).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const item = document.querySelector(
    `li.builder-field-item[data-field-id="${safeId}"]`
  );
  if (item) {
    item.appendChild(panel);
  } else {
    park.appendChild(panel);
  }
}

function syncFieldInspectorFromDraft() {
  const panel = document.getElementById("builder-field-inspector");
  const field = builderDraft?.fields.find((f) => f.id === builderSelectedFieldId);
  if (!panel) return;
  if (!field) {
    panel.hidden = true;
    lastInspectorFieldId = null;
    parkBuilderFieldInspector();
    return;
  }
  panel.hidden = false;
  
  const lField = document.getElementById("inspector-label-field");
  const pField = document.getElementById("inspector-placeholder-field");
  const rField = document.getElementById("inspector-required-field");
  const cField = document.getElementById("inspector-content-field");
  const tField = document.getElementById("inspector-list-type-field");

  if (lastInspectorFieldId !== field.id) {
    lastInspectorFieldId = field.id;
    
    // Reset display
    if (lField) lField.style.display = "none";
    if (pField) pField.style.display = "none";
    if (rField) rField.style.display = "none";
    if (cField) cField.style.display = "none";
    if (tField) tField.style.display = "none";

    const isContentBlock = ["title", "static_text", "list"].includes(field.type);

    if (isContentBlock) {
      if (cField) cField.style.display = "block";
      const c = document.getElementById("inspector-content");
      if (c) c.value = field.content || "";
      
      if (field.type === "list" && tField) {
        tField.style.display = "block";
        const t = document.getElementById("inspector-list-type");
        if (t) t.value = field.listType || "bullets";
      }
    } else {
      if (lField) lField.style.display = "block";
      if (pField) pField.style.display = "block";
      if (rField) rField.style.display = "block";
      
      const l = document.getElementById("inspector-label");
      const p = document.getElementById("inspector-placeholder");
      const r = document.getElementById("inspector-required");
      if (l) l.value = field.label || "";
      if (p) p.value = field.placeholder || "";
      if (r) r.checked = !!field.required;
    }
  }
  attachBuilderFieldInspectorUnderSelectedRow();
}

function renderBuilderFieldList() {
  const ul = document.getElementById("builder-field-list");
  if (!ul || !builderDraft) return;

  parkBuilderFieldInspector();

  if (
    builderSelectedFieldId &&
    !builderDraft.fields.some((f) => f.id === builderSelectedFieldId)
  ) {
    builderSelectedFieldId = null;
    lastInspectorFieldId = null;
  }

  const fields = [...builderDraft.fields].sort((a, c) => a.order - c.order);

  ul.innerHTML = fields
    .map((field) => {
      const sel =
        builderSelectedFieldId === field.id ? " builder-field-row--selected" : "";
      const selItem =
        builderSelectedFieldId === field.id ? " builder-field-item--selected" : "";
      return `
    <li class="builder-field-item${selItem}" data-field-id="${escapeAttr(field.id)}">
      <div class="builder-field-row${sel}">
      <div
        class="builder-field-row__main"
        role="button"
        tabindex="0"
        data-builder-select-field="${escapeAttr(field.id)}"
        aria-pressed="${builderSelectedFieldId === field.id ? "true" : "false"}"
      >
        <span class="builder-field-row__type">${escapeHtml(fieldTypeLabel(field.type))}</span>
        <span class="builder-field-row__label">${escapeHtml(field.label || "Sin etiqueta")}</span>
      </div>
      <div class="builder-field-row__actions">
        <button type="button" class="btn-builder-move" data-field-move="${escapeAttr(field.id)}" data-direction="up" aria-label="Subir">↑</button>
        <button type="button" class="btn-builder-move" data-field-move="${escapeAttr(field.id)}" data-direction="down" aria-label="Bajar">↓</button>
        <button type="button" class="btn-builder-remove" data-remove-field="${escapeAttr(field.id)}">Quitar</button>
      </div>
      </div>
    </li>
  `;
    })
    .join("");

  syncFieldInspectorFromDraft();
}

function addBuilderFieldFromPicker() {
  if (!builderDraft) return;
  const sel = document.getElementById("builder-new-field-type");
  const raw = sel?.value || "text";
  const type =
    ["email", "phone", "paragraph", "text", "title", "static_text", "list"].includes(raw)
      ? raw
      : "text";

  const maxOrder = builderDraft.fields.reduce((m, f) => Math.max(m, f.order), 0);
  const id = `field_${Date.now()}`;

  const presets = {
    text: { label: "Texto corto", placeholder: "", required: false, maxLength: 200, pattern: null },
    email: {
      label: "Correo electrónico",
      placeholder: "nombre@correo.com",
      required: true,
      maxLength: 160,
      pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
    },
    phone: {
      label: "Teléfono internacional",
      placeholder: "+50688887777",
      required: false,
      maxLength: 16,
      pattern: "^\\+\\d{8,15}$",
    },
    paragraph: {
      label: "Párrafo",
      placeholder: "Escribe aquí…",
      required: false,
      maxLength: 2000,
      pattern: null,
    },
    title: {
      label: "Título",
      content: "Nuevo Título",
      required: false,
    },
    static_text: {
      label: "Texto estático",
      content: "Escribe tu párrafo aquí...",
      required: false,
    },
    list: {
      label: "Lista",
      content: "Elemento 1\nElemento 2\nElemento 3",
      listType: "bullets",
      required: false,
    }
  };
  const pr = presets[/** @type {keyof typeof presets} */ (type)] || presets.text;

  const newField = createField({
    id,
    type,
    label: pr.label,
    placeholder: pr.placeholder || "",
    helpText: "",
    required: pr.required,
    order: maxOrder + 1,
    width: "full",
    validation: {
      pattern: pr.pattern || null,
      minLength: null,
      maxLength: pr.maxLength || null,
    },
  });

  if (pr.content) newField.content = pr.content;
  if (pr.listType) newField.listType = pr.listType;

  builderDraft.fields.push(newField);

  builderSelectedFieldId = id;
  lastInspectorFieldId = null;
  normalizeFieldOrders();
  renderBuilderFieldList();
  syncBuilderPreview();
}

function bindBuilderTabs() {
  const root = document.getElementById("webinars-builder");
  if (!root || root.dataset.mapBuilderTabsBound === "1") return;
  root.dataset.mapBuilderTabsBound = "1";

  root.querySelectorAll("[data-builder-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const name = tab.getAttribute("data-builder-tab");
      if (!name) return;
      root.querySelectorAll("[data-builder-tab]").forEach((t) => {
        const active = t.getAttribute("data-builder-tab") === name;
        t.setAttribute("aria-selected", active ? "true" : "false");
        t.classList.toggle("webinars-builder-tab--active", active);
      });
      const campos = document.getElementById("builder-panel-campos");
      const diseno = document.getElementById("builder-panel-diseno");
      if (name === "campos") {
        campos?.removeAttribute("hidden");
        campos?.classList.remove("webinars-builder-tabpanel--hidden");
        diseno?.setAttribute("hidden", "");
        diseno?.classList.add("webinars-builder-tabpanel--hidden");
      } else {
        diseno?.removeAttribute("hidden");
        diseno?.classList.remove("webinars-builder-tabpanel--hidden");
        campos?.setAttribute("hidden", "");
        campos?.classList.add("webinars-builder-tabpanel--hidden");
      }
    });
  });
}

/**
 * @param {import("firebase/auth").User} user
 */
function bindBuilderPageEvents(user) {
  const shell = document.getElementById("webinars-builder");
  const addBtn = document.getElementById("btn-builder-add-field");
  const fieldList = document.getElementById("builder-field-list");
  const saveBtn = document.getElementById("btn-builder-save-changes");
  const publishBtn = document.getElementById("btn-builder-publish");
  const copyBtn = document.getElementById("btn-builder-copy-link");
  const inspector = document.getElementById("builder-field-inspector");

  bindBuilderTabs();

  if (shell?.dataset.mapBuilderBound === "1") return;
  if (shell) shell.dataset.mapBuilderBound = "1";

  shell?.addEventListener("input", () => {
    syncBuilderPreview();
  });
  shell?.addEventListener("change", (e) => {
    if (e.target && e.target.id === "builder-messaging-enabled") {
      const msgActionsEl = document.getElementById("builder-messaging-actions");
      if (msgActionsEl) {
        msgActionsEl.hidden = !e.target.checked;
      }
      if (e.target.checked && builderDraft) {
        // Ensure email field exists and is required
        let emailField = builderDraft.fields.find(f => f.type === "email");
        if (!emailField) {
          emailField = {
            id: crypto.randomUUID(),
            type: "email",
            label: "Correo electrónico",
            placeholder: "tu@email.com",
            required: true
          };
          builderDraft.fields.push(emailField);
          setBuilderStatus("Se ha añadido un campo de correo electrónico requerido para los mensajes.");
        } else {
          emailField.required = true;
          setBuilderStatus("El campo de correo electrónico ahora es requerido.");
        }
        renderBuilderFieldList();
      }
    }
    syncBuilderPreview();
  });

  addBtn?.addEventListener("click", () => {
    addBuilderFieldFromPicker();
  });

  saveBtn?.addEventListener("click", () => {
    void saveWebinarToFirestore(user);
  });

  publishBtn?.addEventListener("click", () => {
    void publishWebinar(user);
  });

  copyBtn?.addEventListener("click", async () => {
    const input = document.getElementById("builder-public-link");
    if (!input?.value) return;
    try {
      await navigator.clipboard.writeText(input.value);
      setBuilderStatus("Enlace copiado al portapapeles.");
    } catch {
      input.select();
      setBuilderStatus("Selecciona el enlace y copia manualmente (Ctrl+C).");
    }
  });

  inspector?.addEventListener("input", () => {
    const field = builderDraft?.fields.find((f) => f.id === builderSelectedFieldId);
    if (!field) return;
    
    const isContentBlock = ["title", "static_text", "list"].includes(field.type);
    
    if (isContentBlock) {
      const c = document.getElementById("inspector-content");
      if (c) field.content = c.value;
    } else {
      const l = document.getElementById("inspector-label");
      const p = document.getElementById("inspector-placeholder");
      if (l) field.label = l.value;
      if (p) field.placeholder = p.value;
    }
    
    syncBuilderPreview();
    renderBuilderFieldList();
  });

  inspector?.addEventListener("change", () => {
    const field = builderDraft?.fields.find((f) => f.id === builderSelectedFieldId);
    if (!field) return;
    
    const isContentBlock = ["title", "static_text", "list"].includes(field.type);
    
    if (isContentBlock) {
      if (field.type === "list") {
        const t = document.getElementById("inspector-list-type");
        if (t) field.listType = t.value;
      }
    } else {
      const r = document.getElementById("inspector-required");
      if (r) {
        if (field.type === "email" && builderDraft?.messaging?.enabled && !r.checked) {
          alert("El campo de correo electrónico debe ser obligatorio cuando los mensajes están habilitados.");
          r.checked = true;
        }
        field.required = r.checked;
      }
    }
    
    syncBuilderPreview();
    renderBuilderFieldList();
  });

  fieldList?.addEventListener("click", (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const selectEl = target.closest("[data-builder-select-field]");
    if (selectEl && builderDraft) {
      const id = selectEl.getAttribute("data-builder-select-field");
      if (id) {
        builderSelectedFieldId = id;
        lastInspectorFieldId = null;
        renderBuilderFieldList();
      }
      return;
    }

    const moveBtn = target.closest("[data-field-move]");
    if (moveBtn && builderDraft) {
      const id = moveBtn.getAttribute("data-field-move");
      const dir = moveBtn.getAttribute("data-direction");
      if (id && (dir === "up" || dir === "down")) {
        moveFieldInBuilder(id, dir);
        normalizeFieldOrders();
        renderBuilderFieldList();
        syncBuilderPreview();
      }
      return;
    }

    const rem = target.closest("[data-remove-field]");
    if (!rem || !builderDraft) return;
    const id = rem.getAttribute("data-remove-field");
    if (!id) return;

    const fieldToRemove = builderDraft.fields.find((f) => f.id === id);
    if (fieldToRemove && fieldToRemove.type === "email" && builderDraft.messaging?.enabled) {
      alert("No puedes eliminar el campo de correo electrónico mientras los mensajes estén habilitados.");
      return;
    }

    if (builderSelectedFieldId === id) {
      builderSelectedFieldId = null;
      lastInspectorFieldId = null;
    }
    builderDraft.fields = builderDraft.fields.filter((f) => f.id !== id);
    normalizeFieldOrders();
    renderBuilderFieldList();
    syncBuilderPreview();
  });

  fieldList?.addEventListener("keydown", (e) => {
    const t = /** @type {HTMLElement} */ (e.target);
    const main = t.closest("[data-builder-select-field]");
    if (!main || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    const id = main.getAttribute("data-builder-select-field");
    if (id && builderDraft) {
      builderSelectedFieldId = id;
      lastInspectorFieldId = null;
      renderBuilderFieldList();
    }
  });
}

function escapeAttr(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;");
}

function renderAdminSurface() {
  if (els.guard) els.guard.hidden = true;
  if (els.dashboard) els.dashboard.hidden = false;
  if (els.builder) els.builder.hidden = false;
}

function renderGuard(message) {
  setDashboardNewWebinarButtonsEnabled(false);
  if (els.guard) {
    els.guard.hidden = false;
    els.guard.innerHTML = `
      <h2>Acceso restringido</h2>
      <p>${escapeHtml(message)}</p>
      <p><a class="webapp-card__link" href="../../index.html">Volver al portal principal</a></p>
    `;
  }

  if (els.dashboard) els.dashboard.hidden = true;
  if (els.builder) els.builder.hidden = true;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

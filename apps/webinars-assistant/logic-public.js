import { auth, db } from "../../src/config/firebase-config.js";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { normalizeUserDoc } from "../../src/data/user-schema.js";
import {
  initWebinarsUserHeader,
  setWebinarsHeaderLoading,
  setWebinarsLoggedOutHeader,
} from "./webinars-header.js";
import {
  normalizeWebinarDocFromFirestore,
  renderWebinarFormShell,
} from "./webinar-form-ui.js";
import { getMessagingMessagesFromWebinar } from "./messaging-model.js";
import { fetchGmailPublicBackend } from "../../src/services/gmail-backend.js";

let loadedWebinarId = "";
let registrationSubmitting = false;

setWebinarsHeaderLoading("Verificando…");
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    setWebinarsLoggedOutHeader();
    return;
  }
  try {
    const userSnap = await getDoc(doc(db, "usuarios", user.uid));
    if (userSnap.exists()) {
      const profile = normalizeUserDoc(userSnap.data(), user.uid);
      await initWebinarsUserHeader(user, profile);
    }
  } catch {
    /* menú opcional en vista pública */
  }
});

bootstrapViewer();

function bootstrapViewer() {
  const mount = document.getElementById("viewer-mount");
  const topStatus = document.getElementById("viewer-top-status");
  const hex = resolvePublicHex(window.location.href);

  if (!hex) {
    setTopStatus(
      topStatus,
      "Falta el enlace del formulario. Usa la URL que te compartió el asesor (incluye ?h=…)."
    );
    return;
  }

  setTopStatus(topStatus, "Cargando formulario…");

  void loadPublishedWebinar(hex, mount, topStatus);
}

/**
 * @param {string} inputUrl
 */
export function resolvePublicHex(inputUrl) {
  try {
    const url = new URL(inputUrl);
    const h = url.searchParams.get("h")?.trim().toLowerCase() || "";
    if (/^[0-9a-f]{32}$/.test(h)) return h;
    const legacy = url.searchParams.get("slug")?.trim().toLowerCase() || "";
    if (/^[0-9a-f]{32}$/.test(legacy)) return legacy;
    return "";
  } catch {
    return "";
  }
}

/**
 * @param {HTMLElement | null} el
 * @param {string} message
 */
function setTopStatus(el, message) {
  if (el) el.textContent = message;
}

/**
 * @param {string} hex
 * @param {HTMLElement | null} mount
 * @param {HTMLElement | null} topStatus
 */
async function loadPublishedWebinar(hex, mount, topStatus) {
  try {
    const q = query(
      collection(db, "webinars"),
      where("publicHex", "==", hex),
      where("estado", "==", "published"),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      setTopStatus(
        topStatus,
        "Este formulario no existe o aún no está publicado. Verifica el enlace."
      );
      return;
    }

    const docSnap = snap.docs[0];
    loadedWebinarId = docSnap.id;
    const raw = /** @type {Record<string, unknown>} */ (docSnap.data());
    const normalized = normalizeWebinarDocFromFirestore(raw);

    if (!normalized || !mount) {
      setTopStatus(topStatus, "No se pudo leer la configuración del formulario.");
      return;
    }

    setTopStatus(topStatus, "");
    renderWebinarFormShell(mount, normalized, {
      previewMode: false,
      formId: "webinar-public-form",
    });

    const form = document.getElementById("webinar-public-form");
    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      void handleRegistrationSubmit(form, normalized, raw);
    });

    document.getElementById("webinar-public-again")?.addEventListener("click", () => {
      const thanks = document.getElementById("webinar-public-thanks");
      const f = document.getElementById("webinar-public-form");
      const st = document.getElementById("public-viewer-status");
      thanks?.setAttribute("hidden", "");
      f?.removeAttribute("hidden");
      f?.reset();
      if (st) st.textContent = "";
      registrationSubmitting = false;
      const btn = f?.querySelector('button[type="submit"]');
      if (btn instanceof HTMLButtonElement) btn.disabled = false;
    });
  } catch (e) {
    console.error(e);
    setTopStatus(
      topStatus,
      "Error de conexión o permisos. Si eres el administrador, revisa FIREBASE_WEBINARS.md (índices y reglas)."
    );
  }
}

/**
 * @param {Record<string, unknown>} webinarRaw
 */
function buildInitialEmailStatus(webinarRaw) {
  const messages = getMessagingMessagesFromWebinar(webinarRaw);
  /** @type {Record<string, string>} */
  const emailStatus = {};
  for (const msg of messages) {
    if (!msg.enabled) {
      emailStatus[msg.id] = "skipped";
      continue;
    }
    if (msg.sendFormat === "automatic") {
      emailStatus[msg.id] = "pending";
    } else {
      emailStatus[msg.id] = "skipped";
    }
  }
  return emailStatus;
}

/**
 * @param {HTMLFormElement} form
 * @param {NonNullable<ReturnType<typeof normalizeWebinarDocFromFirestore>>} webinar
 * @param {Record<string, unknown>} webinarRaw
 */
async function handleRegistrationSubmit(form, webinar, webinarRaw) {
  const statusEl = document.getElementById("public-viewer-status");
  const thanksEl = document.getElementById("webinar-public-thanks");
  const submitBtn = form.querySelector('button[type="submit"]');

  if (registrationSubmitting) return;

  const fd = new FormData(form);
  const answers = buildAnswersFromForm(fd, webinar.fields);
  const errors = validateAnswers(answers, webinar.fields);

  if (errors.length > 0) {
    if (statusEl) statusEl.textContent = errors.join(" ");
    return;
  }

  const email = extractParticipantEmail(answers, webinar.fields);
  if (!email) {
    if (statusEl) statusEl.textContent = "Se requiere un campo de correo electrónico.";
    return;
  }

  if (!loadedWebinarId) {
    if (statusEl) statusEl.textContent = "Sesión de formulario no válida.";
    return;
  }

  registrationSubmitting = true;
  if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = true;
  if (statusEl) statusEl.textContent = "Enviando…";

  try {
    const docRef = await addDoc(
      collection(db, "webinars", loadedWebinarId, "participantes"),
      {
        email,
        answers,
        emailStatus: buildInitialEmailStatus(webinarRaw),
        createdAt: serverTimestamp(),
      }
    );

    form.setAttribute("hidden", "");
    thanksEl?.removeAttribute("hidden");
    if (statusEl) statusEl.textContent = "";

    try {
      await fetchGmailPublicBackend("/api/gmail/public-trigger", {
        webinarId: loadedWebinarId,
        participantId: docRef.id,
      });
    } catch (triggerErr) {
      console.error("Error al disparar correos automáticos:", triggerErr);
    }
  } catch (e) {
    console.error(e);
    if (statusEl) {
      statusEl.textContent =
        "No se pudo enviar. Revisa tu conexión o inténtalo más tarde.";
    }
    registrationSubmitting = false;
    if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;
  }
}

/**
 * @param {FormData} fd
 * @param {Array<{ id: string; type: string }>} fields
 */
function buildAnswersFromForm(fd, fields) {
  /** @type {Record<string, string>} */
  const answers = {};
  for (const field of fields) {
    if (field.type === "file") {
      const file = fd.get(field.id);
      answers[field.id] =
        file instanceof File && file.name ? file.name : "";
    } else {
      answers[field.id] = String(fd.get(field.id) ?? "").trim();
    }
  }
  return answers;
}

/**
 * @param {Record<string, string>} answers
 * @param {Array<{ id: string; type: string; required: boolean; validation?: { pattern?: string | null } }>} fields
 */
function validateAnswers(answers, fields) {
  const errors = [];

  for (const field of fields) {
    const v = answers[field.id] ?? "";
    if (field.required && !v) {
      errors.push(`Completa: ${field.label}.`);
    }
    if (field.type === "email" && v && !isValidEmail(v)) {
      errors.push("El correo no es válido.");
    }
    if (field.type === "phone" && v && !isValidInternationalPhone(normalizePhoneInput(v))) {
      errors.push("El teléfono debe usar formato internacional (ej. +50688887777).");
    }
    const pat = field.validation && field.validation.pattern;
    if (typeof pat === "string" && pat && v) {
      try {
        const re = new RegExp(pat);
        if (!re.test(v)) {
          errors.push(`Formato no válido en: ${field.label}.`);
        }
      } catch {
        /* ignore bad pattern */
      }
    }
  }

  return errors;
}

/**
 * @param {Record<string, string>} answers
 * @param {Array<{ id: string; type: string }>} fields
 */
function extractParticipantEmail(answers, fields) {
  const emailField =
    fields.find((f) => f.type === "email") || fields.find((f) => f.id === "email");
  const key = emailField?.id || "email";
  return String(answers[key] || "")
    .trim()
    .toLowerCase();
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function normalizePhoneInput(phone) {
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
}

export function isValidInternationalPhone(phone) {
  return /^\+\d{8,15}$/.test(phone);
}

/** @deprecated use resolvePublicHex */
export function resolveViewerParams(inputUrl) {
  const hex = resolvePublicHex(inputUrl);
  return {
    webinarId: "",
    slug: hex,
  };
}

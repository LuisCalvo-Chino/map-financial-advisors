import { db } from "../../src/config/firebase-config.js";
import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getMessagingMessagesFromWebinar } from "./messaging-model.js";

/**
 * @param {import("firebase/auth").User} user
 * @param {import("../../src/data/user-schema.js").normalizeUserDoc} _profile
 */
export async function initFormMessagesPage(user, _profile) {
  const params = new URLSearchParams(window.location.search);
  const webinarId = params.get("id");
  const guard = document.getElementById("webinars-access-guard");
  const panel = document.getElementById("webinars-form-msg-panel");
  const mount = document.getElementById("form-msg-list-mount");
  const titleEl = document.getElementById("form-msg-title");
  const back = document.getElementById("form-msg-back-entries");
  const addBtn = document.getElementById("btn-form-msg-add");
  const statusEl = document.getElementById("form-msg-status");

  if (!webinarId || !mount || !panel) {
    if (guard) {
      guard.hidden = false;
      guard.innerHTML =
        "<h2>Falta el formulario</h2><p><a href=\"./index.html\">Volver</a></p>";
    }
    return;
  }

  if (back) back.href = `./entries.html?id=${encodeURIComponent(webinarId)}`;

  if (guard) guard.hidden = false;
  panel.hidden = true;

  async function loadAndRender() {
    const ref = doc(db, "webinars", webinarId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      if (guard) {
        guard.hidden = false;
        guard.innerHTML = "<h2>No encontrado</h2><p><a href=\"./index.html\">Volver</a></p>";
      }
      return;
    }
    const raw = snap.data();
    if (raw.createdBy?.uid !== user.uid) {
      if (guard) {
        guard.hidden = false;
        guard.innerHTML = "<h2>Sin permiso</h2><p><a href=\"./index.html\">Volver</a></p>";
      }
      return;
    }

    if (guard) guard.hidden = true;
    panel.hidden = false;

    if (titleEl) titleEl.textContent = String(raw.titulo || "Mensajes del formulario");

    const messages = getMessagingMessagesFromWebinar(raw);

    if (messages.length === 0) {
      mount.innerHTML =
        "<p class=\"dashboard-empty\">No hay mensajes. Crea uno con <strong>+ Nuevo mensaje</strong>.</p>";
    } else {
      mount.innerHTML = `<ul class="webinars-saved-list" role="list">${messages
        .map((m) => {
          const sub = subtitleForMessage(m);
          return `<li class="webinars-saved-item" data-msg-id="${escapeAttr(m.id)}">
            <div class="webinars-saved-item__info">
              <strong>${escapeHtml(m.name)}</strong>
              <span class="webinars-saved-meta">${escapeHtml(sub)}</span>
            </div>
            <div class="webinars-saved-item__actions">
              <a class="btn-map-secondary btn-map-secondary--small" href="./messages.html?id=${escapeAttr(webinarId)}&messageId=${escapeAttr(m.id)}">Abrir editor</a>
              <button type="button" class="btn-map-secondary btn-map-secondary--small btn-map-danger" data-delete-msg="${escapeAttr(m.id)}">Eliminar</button>
            </div>
          </li>`;
        })
        .join("")}</ul>`;

      mount.querySelectorAll("[data-delete-msg]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = /** @type {HTMLElement} */ (btn).dataset.deleteMsg;
          if (!id) return;
          if (
            !confirm(
              "¿Eliminar este mensaje? Esta acción no se puede deshacer."
            )
          )
            return;
          const next = messages.filter((x) => x.id !== id);
          try {
            await updateDoc(ref, {
              messaging: {
                ...normalizeMessaging(raw.messaging),
                messages: next,
              },
              updatedAt: serverTimestamp(),
            });
            await loadAndRender();
          } catch (e) {
            console.error(e);
            alert("No se pudo eliminar el mensaje.");
          }
        });
      });
    }
  }

  addBtn?.addEventListener("click", async () => {
    const ref = doc(db, "webinars", webinarId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const raw = snap.data();
    if (raw.createdBy?.uid !== user.uid) return;

    const messages = getMessagingMessagesFromWebinar(raw);
    const branding = raw.branding && typeof raw.branding === "object" ? raw.branding : {};
    const newId = crypto.randomUUID();
    const newMsg = {
      id: newId,
      name: "Nuevo mensaje",
      enabled: false,
      sendFormat: "manual",
      automaticTrigger: "registration",
      scheduledAt: null,
      subject: "",
      design: {
        logoUrl: "",
        headerColor: String(branding.headerColor || "#173862"),
        footerColor: String(branding.footerColor || "#102742"),
        backgroundColor: "#2A2C2C",
        contentColor: "#173862",
        btnColor: "#173862",
        btnTextColor: "#ffffff",
        titleColor: "#FFFFFF",
        textColor: "#F4F0ED",
      },
      blocks: [],
      bodyHtml: "",
    };
    const next = [...messages, newMsg];
    try {
      await updateDoc(ref, {
        messaging: {
          ...normalizeMessaging(raw.messaging),
          enabled: true,
          messages: next,
        },
        updatedAt: serverTimestamp(),
      });
      window.location.assign(
        `./messages.html?id=${encodeURIComponent(webinarId)}&messageId=${encodeURIComponent(newId)}`
      );
    } catch (e) {
      console.error(e);
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = "No se pudo crear el mensaje.";
        statusEl.classList.add("webinars-builder-status--error");
      }
    }
  });

  await loadAndRender();
}

/**
 * @param {unknown} m
 */
function normalizeMessaging(m) {
  if (!m || typeof m !== "object") return { enabled: true, templates: {}, messages: [] };
  const x = /** @type {Record<string, unknown>} */ (m);
  return {
    enabled: Boolean(x.enabled),
    templates: x.templates && typeof x.templates === "object" ? x.templates : {},
    messages: Array.isArray(x.messages) ? x.messages : [],
  };
}

/**
 * @param {import("./messaging-model.js").MessagingMessage} m
 */
function subtitleForMessage(m) {
  if (m.sendFormat === "manual") return "Envío manual · Puedes enviarlo a los inscritos desde el panel (próximamente en lote)";
  if (m.automaticTrigger === "registration") return "Automático · Al registrarse (nueva inscripción)";
  if (m.automaticTrigger === "scheduled") {
    const t = m.scheduledAt?.toDate?.();
    return t
      ? `Automático · Programado: ${t.toLocaleString("es")}`
      : "Automático · Fecha programada pendiente";
  }
  return "Automático";
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(text) {
  return escapeHtml(text).replace(/'/g, "&#39;");
}

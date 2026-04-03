import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../../src/config/firebase-config.js";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { normalizeWebinarDocFromFirestore } from "./webinar-form-ui.js";
import { fetchGmailBackend } from "../../src/services/gmail-backend.js";
import { sendPendingEmails } from "./email-engine.js";
import {
  formFieldKeysForAnswers,
  getMessagingMessagesFromWebinar,
} from "./messaging-model.js";

const ICON_TRASH = `<svg class="webinars-entries-trash-icon" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;

const ICON_RESEND = `<svg class="webinars-entries-trash-icon" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`;

/** @type {string | null} */
let sortCol = null;
/** @type {'asc' | 'desc'} */
let sortDir = "asc";

/**
 * @typedef {{ id: string; email: string; answers: Record<string, string>; emailStatus: Record<string, string>; createdAt: Date | null }} EntryRow
 */

/**
 * @param {EntryRow[]} source
 * @returns {EntryRow[]}
 */
function sortEntryRows(source) {
  const sorted = [...source];
  if (!sortCol) return sorted;
  sorted.sort((a, b) => {
    if (sortCol === "_fecha") {
      const va = a.createdAt ? a.createdAt.getTime() : 0;
      const vb = b.createdAt ? b.createdAt.getTime() : 0;
      const c = va - vb;
      return sortDir === "asc" ? c : -c;
    }
    let va = "";
    let vb = "";
    if (sortCol === "_email") {
      va = a.email;
      vb = b.email;
    } else if (sortCol?.startsWith("msg:")) {
      const mid = sortCol.slice(4);
      va = String(a.emailStatus[mid] || "");
      vb = String(b.emailStatus[mid] || "");
    } else {
      va = String(a.answers[sortCol] || "");
      vb = String(b.answers[sortCol] || "");
    }
    const c = va.localeCompare(vb, "es", { sensitivity: "base" });
    return sortDir === "asc" ? c : -c;
  });
  return sorted;
}

/**
 * @param {string | undefined} st
 */
function formatMsgStatusText(st) {
  if (st === "sent") return "Enviado";
  if (st === "failed") return "Error al enviar";
  if (st === "skipped") return "Omitido";
  if (st === "queued") return "En cola";
  return "Pendiente";
}

/**
 * @param {string} cell
 */
function csvEscapeCell(cell) {
  const s = String(cell ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * @param {import("firebase/auth").User} user
 * @param {import("../../src/data/user-schema.js").normalizeUserDoc} _profile
 */
export async function initEntriesPage(user, _profile) {
  const params = new URLSearchParams(window.location.search);
  const webinarId = params.get("id");
  const guard = document.getElementById("webinars-access-guard");
  const panel = document.getElementById("webinars-entries-panel");
  const wrap = document.getElementById("entries-table-wrap");
  const titleEl = document.getElementById("entries-form-title");
  const statusEl = document.getElementById("entries-status");
  const btnEdit = document.getElementById("entries-btn-edit");
  const btnMsg = document.getElementById("entries-btn-messages");
  const btnCsv = document.getElementById("entries-btn-csv");

  if (!webinarId || !wrap || !panel) {
    if (guard) {
      guard.hidden = false;
      guard.innerHTML =
        "<h2>Formulario no especificado</h2><p>Falta el parámetro <code>id</code> en la URL.</p><p><a href=\"./index.html\">Volver</a></p>";
    }
    return;
  }

  if (guard) guard.hidden = false;
  panel.hidden = true;

  try {
    const ref = doc(db, "webinars", webinarId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      if (guard) {
        guard.innerHTML =
          "<h2>No encontrado</h2><p><a href=\"./index.html\">Volver</a></p>";
      }
      return;
    }

    const raw = snap.data();
    if (raw.createdBy?.uid !== user.uid) {
      if (guard) {
        guard.innerHTML =
          "<h2>Sin permiso</h2><p><a href=\"./index.html\">Volver</a></p>";
      }
      return;
    }

    const webinar = normalizeWebinarDocFromFirestore({ id: snap.id, ...raw });
    if (!webinar) return;

    if (guard) guard.hidden = true;
    panel.hidden = false;

    if (titleEl) titleEl.textContent = webinar.titulo || "Inscripciones";

    if (btnEdit) btnEdit.href = `./builder.html?id=${encodeURIComponent(webinarId)}`;

    const hasEmailField = webinar.fields.some((f) => f.type === "email");
    if (btnMsg) {
      btnMsg.href = `./form-messages.html?id=${encodeURIComponent(webinarId)}`;
      if (!hasEmailField) {
        btnMsg.classList.add("webinars-btn-disabled");
        btnMsg.setAttribute("aria-disabled", "true");
        btnMsg.addEventListener("click", (e) => {
          e.preventDefault();
          alert("Añade un campo de correo electrónico al formulario para usar mensajes.");
        });
      }
    }

    const cols = formFieldKeysForAnswers(webinar.fields);
    const messages = getMessagingMessagesFromWebinar(raw);

    const partSnap = await getDocs(
      collection(db, "webinars", webinarId, "participantes")
    );
    /** @type {EntryRow[]} */
    let rows = partSnap.docs.map((d) => {
      const p = d.data();
      const createdAt = p.createdAt?.toDate?.() ?? null;
      return {
        id: d.id,
        email: String(p.email || ""),
        answers:
          p.answers && typeof p.answers === "object"
            ? /** @type {Record<string, string>} */ (p.answers)
            : {},
        emailStatus:
          p.emailStatus && typeof p.emailStatus === "object"
            ? /** @type {Record<string, string>} */ (p.emailStatus)
            : {},
        createdAt,
      };
    });

    const colCount = 3 + cols.length + messages.length;

    function setStatus(msg, isError) {
      if (!statusEl) return;
      if (!msg) {
        statusEl.hidden = true;
        statusEl.textContent = "";
        statusEl.classList.remove("webinars-builder-status--error");
        return;
      }
      statusEl.hidden = false;
      statusEl.textContent = msg;
      statusEl.classList.toggle("webinars-builder-status--error", Boolean(isError));
    }

    function downloadCsv() {
      const sorted = sortEntryRows(rows);
      const header = [
        "Correo",
        ...cols.map((c) => c.label),
        "Fecha de registro",
        ...messages.map((m) => m.name),
      ].map(csvEscapeCell);

      const lines = [header.join(",")];
      for (const r of sorted) {
        const fecha = r.createdAt ? r.createdAt.toLocaleString("es") : "";
        const row = [
          r.email,
          ...cols.map((c) => String(r.answers[c.id] ?? "")),
          fecha,
          ...messages.map((m) => formatMsgStatusText(r.emailStatus[m.id])),
        ].map(csvEscapeCell);
        lines.push(row.join(","));
      }

      const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
        type: "text/csv;charset=utf-8",
      });
      const safeName = (webinar.titulo || "inscripciones")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "_")
        .slice(0, 80);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${safeName || "inscripciones"}_${webinarId.slice(0, 8)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      setStatus("");
    }

    if (btnCsv) {
      btnCsv.addEventListener("click", () => {
        if (rows.length === 0) {
          setStatus("No hay inscripciones para exportar.", true);
          return;
        }
        downloadCsv();
      });
    }

    async function refreshParticipantsFromFirestore() {
      const snap = await getDocs(collection(db, "webinars", webinarId, "participantes"));
      rows = snap.docs.map((d) => {
        const p = d.data();
        const createdAt = p.createdAt?.toDate?.() ?? null;
        return {
          id: d.id,
          email: String(p.email || ""),
          answers:
            p.answers && typeof p.answers === "object"
              ? /** @type {Record<string, string>} */ (p.answers)
              : {},
          emailStatus:
            p.emailStatus && typeof p.emailStatus === "object"
              ? /** @type {Record<string, string>} */ (p.emailStatus)
              : {},
          createdAt,
        };
      });
      renderTable();
    }

    function renderTable() {
      const sorted = sortEntryRows(rows);

      const thFields = cols
        .map(
          (c) => `
        <th scope="col">
          <button type="button" class="webinars-entries-th" data-sort="field:${escapeAttr(c.id)}">
            ${escapeHtml(c.label)}${sortCol === c.id ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
          </button>
        </th>`
        )
        .join("");

      const thMsgs = messages
        .map(
          (m) => `
        <th scope="col">
          <button type="button" class="webinars-entries-th" data-sort="msg:${escapeAttr(m.id)}">
            ${escapeHtml(m.name)}${sortCol === `msg:${m.id}` ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
          </button>
        </th>`
        )
        .join("");

      const body = sorted
        .map((r) => {
          const tds = cols
            .map(
              (c) =>
                `<td>${escapeHtml(String(r.answers[c.id] ?? ""))}</td>`
            )
            .join("");
          const msgCells = messages
            .map((m) => {
              const statusHtml = formatMsgStatus(r.emailStatus[m.id]);
              const canSend =
                Boolean(m.enabled) && hasEmailField && Boolean(String(r.email || "").trim());
              const sendBtn = canSend
                ? `<button type="button" class="webinars-entries-resend webinars-entries-resend--inline" data-resend-msg="${escapeAttr(m.id)}" data-resend-participant="${escapeAttr(r.id)}" data-msg-label="${escapeAttr(m.name)}" data-participant-email="${escapeAttr(r.email)}" title="${escapeAttr(`Enviar «${m.name}» a ${r.email}`)}" aria-label="${escapeAttr(`Enviar mensaje: ${m.name}`)}">
              ${ICON_RESEND}
            </button>`
                : "";
              return `<td class="webinars-entries-msg-cell"><div class="webinars-entries-msg-cell__inner"><span class="webinars-entries-msg-cell__status">${statusHtml}</span>${sendBtn}</div></td>`;
            })
            .join("");
          const fecha = r.createdAt ? r.createdAt.toLocaleString("es") : "—";
          return `<tr data-participant-id="${escapeAttr(r.id)}">
          <td>${escapeHtml(r.email)}</td>
          ${tds}
          <td>${escapeHtml(fecha)}</td>
          ${msgCells}
          <td class="webinars-entries-actions-cell">
            <button type="button" class="webinars-entries-trash" data-delete-entry="${escapeAttr(r.id)}" aria-label="Eliminar inscripción" title="Eliminar inscripción">
              ${ICON_TRASH}
            </button>
          </td>
        </tr>`;
        })
        .join("");

      wrap.innerHTML = `
        <div class="webinars-entries-scroll">
          <table class="webinars-entries-table">
            <thead>
              <tr>
                <th scope="col">
                  <button type="button" class="webinars-entries-th" data-sort="col:_email">
                    Correo${sortCol === "_email" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                  </button>
                </th>
                ${thFields}
                <th scope="col">
                  <button type="button" class="webinars-entries-th" data-sort="col:_fecha">
                    Fecha de registro${sortCol === "_fecha" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                  </button>
                </th>
                ${thMsgs}
                <th scope="col" class="webinars-entries-th--action" aria-label="Acciones"></th>
              </tr>
            </thead>
            <tbody>${body || `<tr><td colspan="${colCount}">Sin inscripciones todavía.</td></tr>`}</tbody>
          </table>
        </div>
      `;

      wrap.querySelectorAll(".webinars-entries-th").forEach((btn) => {
        btn.addEventListener("click", () => {
          const rawKey = /** @type {HTMLElement} */ (btn).dataset.sort || "";
          const colon = rawKey.indexOf(":");
          const kind = colon >= 0 ? rawKey.slice(0, colon) : "";
          const key = colon >= 0 ? rawKey.slice(colon + 1) : "";
          const colKey =
            kind === "field" ? key : kind === "col" ? key : kind === "msg" ? `msg:${key}` : null;
          if (!colKey) return;
          if (sortCol === colKey) sortDir = sortDir === "asc" ? "desc" : "asc";
          else {
            sortCol = colKey;
            sortDir = "asc";
          }
          renderTable();
        });
      });

      wrap.querySelectorAll("[data-resend-msg]").forEach((btn) => {
        btn.addEventListener("click", async (ev) => {
          ev.stopPropagation();
          const el = /** @type {HTMLButtonElement} */ (btn);
          const templateKey = el.dataset.resendMsg;
          const participantId = el.dataset.resendParticipant;
          const label = el.dataset.msgLabel || "este mensaje";
          const email = el.dataset.participantEmail || "";
          if (!templateKey || !participantId) return;
          if (
            !confirm(
              `¿Encolar el envío de «${label}» a ${email || "este participante"}? Se usará tu cuenta Gmail conectada (MAP).`
            )
          ) {
            return;
          }
          el.disabled = true;
          try {
            setStatus("Enviando correo...");
            const result = await fetchGmailBackend("/api/gmail/resend", {
              webinarId,
              participantId,
              templateKey,
            });
            const n = Number(result?.queued ?? 0);
            if (n > 0) {
              try {
                await sendPendingEmails({ limit: 1 });
                setStatus("Correo enviado con éxito.");
              } catch (sendErr) {
                console.error("Error procesando la cola:", sendErr);
                setStatus("Correo encolado. Se enviará en breve en segundo plano.");
              }
            } else {
              setStatus("Solicitud enviada.");
            }
            window.setTimeout(() => setStatus(""), 5000);
            await refreshParticipantsFromFirestore();
          } catch (err) {
            console.error(err);
            const msg =
              err && typeof err === "object" && "message" in err
                ? String(/** @type {{ message?: string }} */ (err).message)
                : "No se pudo encolar el envío.";
            setStatus(msg, true);
          } finally {
            el.disabled = false;
          }
        });
      });

      wrap.querySelectorAll("[data-delete-entry]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = /** @type {HTMLButtonElement} */ (btn).dataset.deleteEntry;
          if (!id) return;
          if (
            !confirm(
              "¿Eliminar esta inscripción? No se puede deshacer."
            )
          ) {
            return;
          }
          /** @type {HTMLButtonElement} */ (btn).disabled = true;
          try {
            await deleteDoc(doc(db, "webinars", webinarId, "participantes", id));
            rows = rows.filter((x) => x.id !== id);
            setStatus("Inscripción eliminada.");
            window.setTimeout(() => setStatus(""), 3500);
            renderTable();
          } catch (err) {
            console.error(err);
            const code =
              err && typeof err === "object" && "code" in err
                ? String(/** @type {{ code?: string }} */ (err).code)
                : "";
            if (code === "permission-denied") {
              setStatus(
                "No se pudo eliminar (permisos de Firebase). Despliega las reglas de Firestore del repositorio y, si puedes, las Cloud Functions para que las nuevas inscripciones incluyan el campo de dueño. Si ya desplegaste, recarga la página.",
                true
              );
            } else {
              setStatus("No se pudo eliminar la inscripción. Revisa tu conexión o inténtalo de nuevo.", true);
            }
            /** @type {HTMLButtonElement} */ (btn).disabled = false;
          }
        });
      });
    }

    renderTable();
  } catch (e) {
    console.error(e);
    if (guard) {
      guard.hidden = false;
      guard.innerHTML =
        "<h2>Error</h2><p>No se pudieron cargar las inscripciones.</p>";
    }
  }
}

/**
 * @param {string | undefined} st
 */
function formatMsgStatus(st) {
  if (st === "sent") return '<span class="webinars-msg-ok" title="Enviado">✓</span>';
  if (st === "failed")
    return '<span class="webinars-msg-fail" title="Error al enviar">✗</span>';
  if (st === "skipped")
    return '<span class="webinars-msg-skip" title="Omitido">—</span>';
  if (st === "queued") return '<span class="webinars-msg-pending" title="En cola">…</span>';
  return '<span class="webinars-msg-pending" title="Pendiente">○</span>';
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

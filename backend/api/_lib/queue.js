import admin from "firebase-admin";
import { getAdminDb } from "./firebase-admin.js";
import {
  getMessagingMessagesFromWebinar,
  shouldSendAutomaticRegistration,
  shouldSendAutomaticScheduled,
} from "./webinar-messaging.js";

function queueDocId({ uid, webinarId, participantId, templateKey }) {
  return [uid, webinarId, participantId, templateKey].join("__").replace(/[^a-zA-Z0-9_-]/g, "_");
}

function resolvePlaceholders(text, webinar, participant, isHtml = false) {
  if (!text) return "";
  let result = text;
  
  const answers = participant.answers || {};
  const fields = webinar.fields || [];
  
  let nombre = "";
  const nameField = fields.find(f => String(f.label || "").toLowerCase().includes("nombre"));
  if (nameField && answers[nameField.id]) {
    nombre = answers[nameField.id];
  }
  
  const safeNombre = isHtml ? escapeHtml(nombre) : nombre;
  const safeEmail = isHtml ? escapeHtml(participant.email || "") : (participant.email || "");
  
  result = result.replace(/\{\{\s*nombre\s*\}\}/gi, safeNombre);
  result = result.replace(/\{\{\s*email\s*\}\}/gi, safeEmail);
  
  return result;
}

export function defaultSubject(webinar, msg, participant) {
  const base = String(msg.subject || "").trim() || `Mensaje: ${String(webinar.titulo || "MAP")}`;
  return resolvePlaceholders(base, webinar, participant, false);
}

function defaultWelcomeHtml({ participantEmail, webinar, publicLink }) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
      <h2 style="margin:0 0 16px">Tu registro fue recibido</h2>
      <p>Hola ${escapeHtml(participantEmail)}.</p>
      <p>Quedaste registrado en <strong>${escapeHtml(String(webinar.titulo || "Webinar MAP"))}</strong>.</p>
      ${
        publicLink
          ? `<p>Puedes volver a abrir tu formulario aqui: <a href="${escapeAttr(publicLink)}">${escapeHtml(publicLink)}</a></p>`
          : ""
      }
      <p>Pronto recibirás mas novedades.</p>
    </div>
  `.trim();
}

/**
 * @param {Record<string, unknown>} webinar
 * @param {import("./webinar-messaging.js").normalizeMessage extends Function ? never : any} msg
 * @param {Record<string, unknown>} participant
 */
export function resolveMessageHtml(webinar, msg, participant) {
  let body = String(msg.bodyHtml || "").trim();
  if (!body) {
    const publicLink = webinar.publicHex
      ? `${String(webinar.publicBaseUrl || "").replace(/\/$/, "")}/viewer.html?h=${String(webinar.publicHex)}`
      : "";
    body = defaultWelcomeHtml({
      participantEmail: participant.email || "",
      webinar,
      publicLink,
    });
  }
  return resolvePlaceholders(body, webinar, participant, true);
}

export async function enqueueParticipantEmails(uid, webinarId, participantId) {
  const db = getAdminDb();
  let created = 0;
  const nowMs = Date.now();

  const webinarDoc = await db.collection("webinars").doc(webinarId).get();
  if (!webinarDoc.exists) return 0;
  
  const webinar = webinarDoc.data() || {};
  if (webinar.messaging?.enabled !== true) return 0;

  const participantDoc = await webinarDoc.ref.collection("participantes").doc(participantId).get();
  if (!participantDoc.exists) return 0;

  const participant = participantDoc.data() || {};
  const targetEmail = String(participant.email || "").trim();
  if (!targetEmail) return 0;

  const emailStatus = participant.emailStatus && typeof participant.emailStatus === "object"
    ? participant.emailStatus
    : {};

  const messages = getMessagingMessagesFromWebinar(webinar);
  
  // Buscar si ya existen correos encolados para este participante
  const existingSnap = await db.collection("email_queue")
    .where("participantId", "==", participantDoc.id)
    .get();
  const existingQueuedKeys = new Set(existingSnap.docs.map(d => d.data().templateKey));

  for (const msg of messages) {
    if (!msg.id) continue;

    const reg = shouldSendAutomaticRegistration(msg, nowMs);
    const sched = shouldSendAutomaticScheduled(msg, nowMs);
    if (!reg && !sched) continue;

    if (emailStatus[msg.id] !== "pending") continue;

    const docId = queueDocId({
      uid,
      webinarId: webinarDoc.id,
      participantId: participantDoc.id,
      templateKey: msg.id,
    });
    
    if (existingQueuedKeys.has(msg.id)) {
      // Ya existe, solo actualizamos el estado si es necesario
      if (emailStatus[msg.id] === "pending") {
        await participantDoc.ref.set(
          { emailStatus: { ...emailStatus, [msg.id]: "queued" } },
          { merge: true }
        );
      }
      continue;
    }

    const queueRef = db.collection("email_queue").doc(docId);
    const queueSnap = await queueRef.get();
    if (queueSnap.exists) continue;

    const html = resolveMessageHtml(webinar, msg, participant);
    const subject = defaultSubject(webinar, msg, participant);

    await queueRef.set({
      uid,
      webinarId: webinarDoc.id,
      participantId: participantDoc.id,
      templateKey: msg.id,
      targetEmail,
      subject,
      html,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await participantDoc.ref.set(
      {
        emailStatus: {
          ...emailStatus,
          [msg.id]: "queued",
        },
      },
      { merge: true }
    );

    created++;
  }

  return created;
}

export async function enqueuePendingParticipantEmails(uid, limit = 10) {
  const db = getAdminDb();
  const webinarsSnap = await db.collection("webinars").where("createdBy.uid", "==", uid).get();
  let created = 0;
  const nowMs = Date.now();

  for (const webinarDoc of webinarsSnap.docs) {
    if (created >= limit) break;

    const webinar = webinarDoc.data() || {};
    const messagingEnabled = webinar.messaging?.enabled === true;
    if (!messagingEnabled) continue;

    const messages = getMessagingMessagesFromWebinar(webinar);
    const remaining = Math.max(0, limit - created);

    const participantsSnap = await webinarDoc.ref.collection("participantes").limit(50).get();

    for (const participantDoc of participantsSnap.docs) {
      if (created >= limit) break;
      const participant = participantDoc.data() || {};
      const targetEmail = String(participant.email || "").trim();
      if (!targetEmail) continue;
      const emailStatus = participant.emailStatus && typeof participant.emailStatus === "object"
        ? participant.emailStatus
        : {};

      for (const msg of messages) {
        if (created >= limit) break;
        if (!msg.id) continue;

        const reg = shouldSendAutomaticRegistration(msg, nowMs);
        const sched = shouldSendAutomaticScheduled(msg, nowMs);
        if (!reg && !sched) continue;

        if (emailStatus[msg.id] !== "pending") continue;

        const docId = queueDocId({
          uid,
          webinarId: webinarDoc.id,
          participantId: participantDoc.id,
          templateKey: msg.id,
        });
        const queueRef = db.collection("email_queue").doc(docId);
        const queueSnap = await queueRef.get();
        if (queueSnap.exists) continue;

        const html = resolveMessageHtml(webinar, msg, participant);
        const subject = defaultSubject(webinar, msg, participant);

        await queueRef.set({
          uid,
          webinarId: webinarDoc.id,
          participantId: participantDoc.id,
          templateKey: msg.id,
          targetEmail,
          subject,
          html,
          status: "pending",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await participantDoc.ref.set(
          {
            emailStatus: {
              ...emailStatus,
              [msg.id]: "queued",
            },
          },
          { merge: true }
        );

        created += 1;
      }
    }
  }

  return created;
}

export async function processQueuedEmails(uid, { limit = 10, sendMessage, redirectUri }) {
  const db = getAdminDb();
  const queueSnap = await db
    .collection("email_queue")
    .where("uid", "==", uid)
    .where("status", "==", "pending")
    .limit(limit)
    .get();

  const results = [];
  for (const queueDoc of queueSnap.docs) {
    const item = queueDoc.data() || {};
    const templateKey = String(item.templateKey || "welcome");
    try {
      const sendResult = await sendMessage({
        targetEmail: String(item.targetEmail || ""),
        subject: String(item.subject || ""),
        html: String(item.html || ""),
        redirectUri,
      });

      await queueDoc.ref.set(
        {
          status: "sent",
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          gmailMessageId: sendResult.gmailMessageId || "",
          threadId: sendResult.threadId || "",
          errorMessage: "",
        },
        { merge: true }
      );

      await db
        .collection("webinars")
        .doc(String(item.webinarId || ""))
        .collection("participantes")
        .doc(String(item.participantId || ""))
        .set(
          {
            emailStatus: {
              [templateKey]: "sent",
            },
          },
          { merge: true }
        );

      results.push({
        queueId: queueDoc.id,
        status: "sent",
        targetEmail: item.targetEmail || "",
      });
    } catch (error) {
      await queueDoc.ref.set(
        {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "No se pudo enviar el correo.",
          failedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      await db
        .collection("webinars")
        .doc(String(item.webinarId || ""))
        .collection("participantes")
        .doc(String(item.participantId || ""))
        .set(
          {
            emailStatus: {
              [templateKey]: "failed",
            },
          },
          { merge: true }
        );

      results.push({
        queueId: queueDoc.id,
        status: "failed",
        targetEmail: item.targetEmail || "",
        error: error instanceof Error ? error.message : "No se pudo enviar el correo.",
      });
    }
  }

  return results;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

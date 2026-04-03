import admin from "firebase-admin";
import { requireUser } from "../_lib/auth.js";
import { getAdminDb } from "../_lib/firebase-admin.js";
import { handleOptions, parseJsonBody, sendJson, setCors } from "../_lib/http.js";
import { getMessagingMessagesFromWebinar } from "../_lib/webinar-messaging.js";
import { resolveMessageHtml, defaultSubject } from "../_lib/queue.js";

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(req, res);

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  try {
    const user = await requireUser(req);
    const body = parseJsonBody(req);
    const webinarId = String(body.webinarId || "").trim();
    const participantId = String(body.participantId || "").trim();
    const templateKey = String(body.templateKey || "").trim();

    if (!webinarId || !participantId || !templateKey) {
      return sendJson(res, 400, { error: "webinarId, participantId y templateKey son obligatorios." });
    }

    const db = getAdminDb();
    const webinarSnap = await db.collection("webinars").doc(webinarId).get();
    if (!webinarSnap.exists) {
      return sendJson(res, 404, { error: "Formulario no encontrado." });
    }
    
    const webinar = webinarSnap.data() || {};
    if (String(webinar?.createdBy?.uid || "") !== user.uid) {
      return sendJson(res, 403, { error: "No eres el dueño de este formulario." });
    }

    if (webinar.messaging?.enabled !== true) {
      return sendJson(res, 400, { error: "La mensajería del formulario no está activa." });
    }

    const participantSnap = await db
      .collection("webinars")
      .doc(webinarId)
      .collection("participantes")
      .doc(participantId)
      .get();
      
    if (!participantSnap.exists) {
      return sendJson(res, 404, { error: "Inscripción no encontrada." });
    }
    
    const participant = participantSnap.data() || {};
    const targetEmail = String(participant.email || "").trim();
    if (!targetEmail) {
      return sendJson(res, 400, { error: "El participante no tiene correo electrónico." });
    }

    const messages = getMessagingMessagesFromWebinar(webinar);
    const msg = messages.find((m) => m.id === templateKey);
    if (!msg || !msg.enabled) {
      return sendJson(res, 400, { error: "El mensaje no existe o está deshabilitado." });
    }

    const html = resolveMessageHtml(webinar, msg, participant);
    const subject = defaultSubject(webinar, msg, participant);

    const queueRef = db.collection("email_queue").doc();
    await queueRef.set({
      uid: user.uid,
      webinarId,
      participantId,
      targetEmail,
      templateKey: msg.id,
      subject,
      html,
      context: {
        webinarTitle: String(webinar.titulo || ""),
      },
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      sentAt: null,
      errorMessage: "",
    });

    return sendJson(res, 200, { ok: true, queued: 1 });
  } catch (error) {
    console.error("[gmail/resend] Error:", error);
    return sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Error interno al encolar el mensaje.",
    });
  }
}

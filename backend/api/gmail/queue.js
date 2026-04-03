import admin from "firebase-admin";
import { requireUser } from "../_lib/auth.js";
import { getAdminDb } from "../_lib/firebase-admin.js";
import { handleOptions, parseJsonBody, sendJson, setCors } from "../_lib/http.js";

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
    const templateKey = String(body.templateKey || "manual").trim();
    const targetEmail = String(body.targetEmail || "").trim();
    const subject = String(body.subject || "").trim();
    const html = String(body.html || "");

    if (!webinarId || !targetEmail || !subject) {
      return sendJson(res, 400, { error: "webinarId, targetEmail and subject are required." });
    }

    const queueRef = getAdminDb().collection("email_queue").doc();
    await queueRef.set({
      uid: user.uid,
      webinarId,
      participantId,
      templateKey,
      targetEmail,
      subject,
      html,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return sendJson(res, 200, {
      ok: true,
      queueId: queueRef.id,
    });
  } catch (error) {
    return sendJson(res, 400, {
      ok: false,
      error: error instanceof Error ? error.message : "No se pudo encolar el correo.",
    });
  }
}

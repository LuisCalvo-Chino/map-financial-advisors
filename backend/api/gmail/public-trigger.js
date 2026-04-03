import { enqueueParticipantEmails, processQueuedEmails } from "../_lib/queue.js";
import { sendGmailMessage } from "../_lib/gmail.js";
import { handleOptions, parseJsonBody, sendJson, setCors } from "../_lib/http.js";
import { readUserTokens, upsertGmailTokens } from "../_lib/tokens.js";
import { getAdminDb } from "../_lib/firebase-admin.js";

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(req, res);

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  try {
    const body = parseJsonBody(req);
    const webinarId = String(body.webinarId || "").trim();
    const participantId = String(body.participantId || "").trim();

    if (!webinarId || !participantId) {
      return sendJson(res, 400, { error: "webinarId and participantId are required." });
    }

    const db = getAdminDb();
    const webinarSnap = await db.collection("webinars").doc(webinarId).get();
    if (!webinarSnap.exists) {
      return sendJson(res, 404, { error: "Webinar no encontrado." });
    }

    const webinar = webinarSnap.data() || {};
    const adminUid = String(webinar?.createdBy?.uid || "").trim();

    if (!adminUid) {
      return sendJson(res, 400, { error: "El webinar no tiene un dueño asignado." });
    }

    const tokens = await readUserTokens(adminUid);
    const refreshToken = String(tokens?.gmail?.refreshToken || "").trim();
    const fromEmail = String(tokens?.gmail?.email || "");

    if (!refreshToken) {
      // El dueño no tiene Gmail configurado, no podemos enviar correos
      return sendJson(res, 200, { ok: true, queuedCount: 0, processedCount: 0, note: "Admin sin Gmail configurado." });
    }

    // Encolar correos automáticos pendientes para este admin
    const queuedCount = await enqueueParticipantEmails(adminUid, webinarId, participantId);

    // Procesar la cola
    const sentResults = await processQueuedEmails(adminUid, {
      limit: 5,
      redirectUri: "http://localhost:5173/gmail-oauth-callback.html", // Dummy redirect URI para refresh token
      sendMessage: async ({ targetEmail, subject, html, redirectUri: localRedirectUri }) => {
        const result = await sendGmailMessage({
          refreshToken,
          redirectUri: localRedirectUri,
          targetEmail,
          subject,
          html,
          fromEmail,
        });
        await upsertGmailTokens({
          uid: adminUid,
          googleEmail: fromEmail,
          refreshToken,
          accessToken: result.accessToken || "",
          accessTokenExpiresAt: result.accessTokenExpiresAt || null,
        });
        return result;
      },
    });

    return sendJson(res, 200, {
      ok: true,
      queuedCount,
      processedCount: sentResults.length,
      results: sentResults,
    });
  } catch (error) {
    console.error("[gmail/public-trigger] Error:", error);
    return sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Error interno al procesar correos públicos.",
    });
  }
}

import { requireUser } from "../_lib/auth.js";
import { enqueuePendingParticipantEmails, processQueuedEmails } from "../_lib/queue.js";
import { sendGmailMessage } from "../_lib/gmail.js";
import { handleOptions, parseJsonBody, sendJson, setCors } from "../_lib/http.js";
import { readUserTokens, upsertGmailTokens } from "../_lib/tokens.js";

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(req, res);

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  try {
    const user = await requireUser(req);
    const body = parseJsonBody(req);
    const limit = Number(body.limit || 10);
    const redirectUri = String(body.redirectUri || "").trim();

    if (!redirectUri) {
      return sendJson(res, 400, { error: "redirectUri is required." });
    }

    const tokens = await readUserTokens(user.uid);
    const refreshToken = String(tokens?.gmail?.refreshToken || "").trim();
    const fromEmail = String(tokens?.gmail?.email || user.email || "");
    if (!refreshToken) {
      return sendJson(res, 400, { error: "Por favor configura Gmail en tu cuenta." });
    }

    const queuedCount = await enqueuePendingParticipantEmails(user.uid, limit);
    const sentResults = await processQueuedEmails(user.uid, {
      limit,
      redirectUri,
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
          uid: user.uid,
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
    return sendJson(res, 400, {
      ok: false,
      error: error instanceof Error ? error.message : "No se pudo procesar la cola.",
    });
  }
}

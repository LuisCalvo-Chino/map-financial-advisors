import { requireUser } from "../_lib/auth.js";
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
    const targetEmail = String(body.targetEmail || "").trim();
    const subject = String(body.subject || "").trim();
    const html = String(body.html || "");
    const redirectUri = String(body.redirectUri || "").trim();

    if (!targetEmail || !subject || !redirectUri) {
      return sendJson(res, 400, { error: "targetEmail, subject and redirectUri are required." });
    }

    const tokens = await readUserTokens(user.uid);
    const refreshToken = String(tokens?.gmail?.refreshToken || "").trim();
    const fromEmail = String(tokens?.gmail?.email || user.email || "");

    if (!refreshToken) {
      return sendJson(res, 400, { error: "Por favor configura Gmail en tu cuenta." });
    }

    const result = await sendGmailMessage({
      refreshToken,
      redirectUri,
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

    return sendJson(res, 200, {
      ok: true,
      gmailMessageId: result.gmailMessageId || "",
      threadId: result.threadId || "",
    });
  } catch (error) {
    return sendJson(res, 400, {
      ok: false,
      error: error instanceof Error ? error.message : "No se pudo enviar el correo.",
    });
  }
}

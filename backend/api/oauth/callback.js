import { requireUser } from "../_lib/auth.js";
import { exchangeCodeForTokens, fetchGoogleUserInfo } from "../_lib/gmail.js";
import { handleOptions, parseJsonBody, sendJson, setCors } from "../_lib/http.js";
import { deleteOAuthSession, readOAuthSession, upsertGmailTokens } from "../_lib/tokens.js";

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(req, res);

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  try {
    const user = await requireUser(req);
    const body = parseJsonBody(req);
    const code = String(body.code || "").trim();
    const state = String(body.state || "").trim();
    const redirectUri = String(body.redirectUri || "").trim();

    if (!code || !state || !redirectUri) {
      return sendJson(res, 400, { error: "code, state and redirectUri are required." });
    }

    const saved = await readOAuthSession({ uid: user.uid, state });
    if (!saved || String(saved.redirectUri || "") !== redirectUri) {
      return sendJson(res, 400, { error: "OAuth session expired or does not match." });
    }

    const tokens = await exchangeCodeForTokens({ code, redirectUri });
    const userInfo = await fetchGoogleUserInfo({
      accessToken: tokens.access_token || "",
      refreshToken: tokens.refresh_token || "",
      redirectUri,
    });

    await upsertGmailTokens({
      uid: user.uid,
      googleEmail: String(userInfo.email || user.email || ""),
      refreshToken: tokens.refresh_token || "",
      accessToken: tokens.access_token || "",
      accessTokenExpiresAt: tokens.expiry_date || null,
    });
    await deleteOAuthSession({ uid: user.uid, state });

    return sendJson(res, 200, {
      ok: true,
      email: String(userInfo.email || user.email || ""),
      scopes: [String(tokens.scope || "https://www.googleapis.com/auth/gmail.send")],
    });
  } catch (error) {
    return sendJson(res, 400, {
      ok: false,
      error: error instanceof Error ? error.message : "No se pudo completar OAuth.",
    });
  }
}

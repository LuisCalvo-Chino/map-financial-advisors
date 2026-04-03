import { requireUser } from "../_lib/auth.js";
import { buildOAuthUrl } from "../_lib/gmail.js";
import { handleOptions, parseJsonBody, sendJson, setCors } from "../_lib/http.js";
import { saveOAuthSession } from "../_lib/tokens.js";

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(req, res);

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  try {
    const user = await requireUser(req);
    const body = parseJsonBody(req);
    const state = String(body.state || "").trim();
    const redirectUri = String(body.redirectUri || "").trim();

    if (!state || !redirectUri) {
      return sendJson(res, 400, { error: "state and redirectUri are required." });
    }

    await saveOAuthSession({ uid: user.uid, state, redirectUri });
    const authUrl = buildOAuthUrl({ state, redirectUri });
    return sendJson(res, 200, { ok: true, authUrl });
  } catch (error) {
    return sendJson(res, 400, {
      ok: false,
      error: error instanceof Error ? error.message : "No se pudo iniciar OAuth.",
    });
  }
}

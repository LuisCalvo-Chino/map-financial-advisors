import { google } from "googleapis";
import { GMAIL_SEND_SCOPE, OAUTH_SCOPES, requiredEnv } from "./config.js";

function buildOauthClient(redirectUri) {
  return new google.auth.OAuth2(
    requiredEnv("GOOGLE_GMAIL_CLIENT_ID"),
    requiredEnv("GOOGLE_GMAIL_CLIENT_SECRET"),
    redirectUri
  );
}

export function buildOAuthUrl({ state, redirectUri }) {
  const client = buildOauthClient(redirectUri);
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: OAUTH_SCOPES,
    include_granted_scopes: true,
    state,
  });
}

export async function exchangeCodeForTokens({ code, redirectUri }) {
  const client = buildOauthClient(redirectUri);
  const { tokens } = await client.getToken(code);
  return tokens;
}

export async function refreshAccessToken({ refreshToken, redirectUri }) {
  const client = buildOauthClient(redirectUri);
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  return credentials;
}

export async function fetchGoogleUserInfo({ accessToken, refreshToken, redirectUri }) {
  const client = buildOauthClient(redirectUri);
  client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  const oauth2 = google.oauth2({ auth: client, version: "v2" });
  const { data } = await oauth2.userinfo.get();
  return data || {};
}

export async function sendGmailMessage({
  refreshToken,
  redirectUri,
  targetEmail,
  subject,
  html,
  fromEmail,
}) {
  const refreshed = await refreshAccessToken({ refreshToken, redirectUri });
  const client = buildOauthClient(redirectUri);
  client.setCredentials({
    refresh_token: refreshToken,
    access_token: refreshed.access_token || "",
    expiry_date: refreshed.expiry_date || null,
  });

  const gmail = google.gmail({ auth: client, version: "v1" });
  const raw = prepareMimeMessage({
    to: targetEmail,
    subject,
    html,
    fromEmail,
  });

  const { data } = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });

  return {
    gmailMessageId: data.id || "",
    threadId: data.threadId || "",
    accessToken: refreshed.access_token || "",
    accessTokenExpiresAt: refreshed.expiry_date || null,
  };
}

export function prepareMimeMessage({ to = "", subject = "", html = "", fromEmail = "" } = {}) {
  const boundary = `map_boundary_${Date.now()}`;
  const plain = stripHtml(html) || "Mensaje MAP";
  const headers = [
    fromEmail ? `From: MAP <${fromEmail}>` : "",
    `To: ${String(to).trim()}`,
    `Subject: ${String(subject).trim()}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].filter(Boolean);

  const mime = [
    headers.join("\r\n"),
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    plain,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    String(html || ""),
    "",
    `--${boundary}--`,
    "",
  ].join("\r\n");

  return Buffer.from(mime, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export { GMAIL_SEND_SCOPE };

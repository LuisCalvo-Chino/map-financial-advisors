import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../src/config/firebase-config.js";
import {
  fetchGmailBackend,
  getGmailOAuthRedirectUri,
} from "../../src/services/gmail-backend.js";

export const GMAIL_OAUTH_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_GMAIL_CLIENT_ID ||
  "531856004565-ggjdofm82emhbrqpg8qdk4v2285qcfb7.apps.googleusercontent.com";

export const EMAIL_TEMPLATE_KEYS = {
  welcome: "welcome",
  reminder: "reminder",
  thankYou: "thankYou",
};

export const GMAIL_ACCESS_REQUIRED_MESSAGE =
  "Por favor configura Gmail en tu cuenta.";

export function createEmailTemplateConfig(type) {
  return {
    type,
    enabled: true,
    subject: "",
    htmlRef: null,
    lastEditedAt: null,
  };
}

export function buildEmailContext({
  participantName = "",
  webinarTitle = "",
  webinarDateLabel = "",
  accessLink = "",
} = {}) {
  return {
    participantName,
    webinarTitle,
    webinarDateLabel,
    accessLink,
  };
}

export function buildEmailQueueItem({
  webinarId = "",
  participantId = "",
  templateKey = EMAIL_TEMPLATE_KEYS.welcome,
  context = {},
  targetEmail = "",
  subject = "",
  html = "",
} = {}) {
  return {
    webinarId,
    participantId,
    templateKey,
    context,
    targetEmail,
    subject,
    html,
    status: "pending",
    createdAt: null,
    sentAt: null,
    errorMessage: "",
  };
}

export async function queueEmailSend(queueItem) {
  const uid = auth.currentUser?.uid || "";
  const access = await requireGmailAccess(uid);
  if (!access.ok) return access;

  const result = await fetchGmailBackend("/api/gmail/queue", queueItem);
  return {
    ok: true,
    queueItem,
    result,
  };
}

export async function sendPendingEmails({ limit = 10 } = {}) {
  const uid = auth.currentUser?.uid || "";
  const access = await requireGmailAccess(uid);
  if (!access.ok) return access;

  const result = await fetchGmailBackend("/api/gmail/process-queue", {
    limit,
    redirectUri: getGmailOAuthRedirectUri(),
  });
  return {
    ok: true,
    result,
  };
}

export function getGmailOAuthClientConfig() {
  return {
    clientId: GMAIL_OAUTH_CLIENT_ID,
    scope: "https://www.googleapis.com/auth/gmail.send",
  };
}

export async function getGmailAccessState(uid) {
  if (!uid) {
    return { connected: false, email: "", scopes: [] };
  }

  const snap = await getDoc(doc(db, "usuarios", uid, "private", "gmail_access"));
  if (!snap.exists()) {
    return { connected: false, email: "", scopes: [] };
  }

  const data = snap.data();
  return {
    connected: Boolean(data.connected),
    email: typeof data.email === "string" ? data.email : "",
    scopes: Array.isArray(data.scopes) ? data.scopes.map((item) => String(item)) : [],
  };
}

export async function requireGmailAccess(uid) {
  const state = await getGmailAccessState(uid);
  if (!state.connected) {
    return {
      ok: false,
      reason: "gmail-access-required",
      message: GMAIL_ACCESS_REQUIRED_MESSAGE,
      state,
    };
  }

  return {
    ok: true,
    state,
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

  return BufferLikeBase64Url(mime);
}

export async function sendWebinarEmailNow({ targetEmail = "", subject = "", html = "" } = {}) {
  const uid = auth.currentUser?.uid || "";
  const access = await requireGmailAccess(uid);
  if (!access.ok) return access;

  const result = await fetchGmailBackend("/api/gmail/send", {
    targetEmail,
    subject,
    html,
    redirectUri: getGmailOAuthRedirectUri(),
  });
  return {
    ok: true,
    result,
  };
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function BufferLikeBase64Url(value) {
  const encoded = btoa(unescape(encodeURIComponent(String(value || ""))));
  return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

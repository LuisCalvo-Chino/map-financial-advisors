"use strict";

const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");

admin.initializeApp();

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const GOOGLE_GMAIL_CLIENT_SECRET = defineSecret("GOOGLE_GMAIL_CLIENT_SECRET");

const FALLBACK_GMAIL_CLIENT_ID =
  "531856004565-ggjdofm82emhbrqpg8qdk4v2285qcfb7.apps.googleusercontent.com";
const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
const GMAIL_USERINFO_SCOPE = "https://www.googleapis.com/auth/userinfo.email";
const OAUTH_SCOPES = [GMAIL_SEND_SCOPE, GMAIL_USERINFO_SCOPE, "openid", "email"];

function getGoogleClientId() {
  return FALLBACK_GMAIL_CLIENT_ID;
}

function getGoogleClientSecret() {
  return GOOGLE_GMAIL_CLIENT_SECRET.value() || "";
}

function requireGoogleOAuthSecrets() {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  if (!clientId || !clientSecret) {
    throw new HttpsError(
      "failed-precondition",
      "Faltan GOOGLE_GMAIL_CLIENT_ID o GOOGLE_GMAIL_CLIENT_SECRET en Firebase Functions."
    );
  }
  return { clientId, clientSecret };
}

function assertSignedIn(request) {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión para usar Gmail Access.");
  }
  return request.auth.uid;
}

function privateDoc(uid, docId) {
  return db.collection("usuarios").doc(uid).collection("private").doc(docId);
}

function queueCollection() {
  return db.collection("email_queue");
}

function sanitizeRedirectUri(redirectUri, originHeader = "") {
  if (typeof redirectUri !== "string" || !redirectUri.trim()) {
    throw new HttpsError("invalid-argument", "redirectUri es obligatorio.");
  }
  let parsed;
  try {
    parsed = new URL(redirectUri);
  } catch {
    throw new HttpsError("invalid-argument", "redirectUri no tiene formato válido.");
  }

  if (!/^https?:$/.test(parsed.protocol)) {
    throw new HttpsError("invalid-argument", "redirectUri debe usar http o https.");
  }

  if (originHeader) {
    try {
      const origin = new URL(originHeader);
      if (origin.origin !== parsed.origin) {
        throw new HttpsError(
          "permission-denied",
          "El redirectUri no coincide con el origen actual de la app."
        );
      }
    } catch {
      /* ignore malformed origin header */
    }
  }

  return parsed.toString();
}

function ensureState(value) {
  const state = typeof value === "string" ? value.trim() : "";
  if (!state || state.length < 16 || state.length > 256) {
    throw new HttpsError("invalid-argument", "El estado OAuth no es válido.");
  }
  return state;
}

async function exchangeCodeForTokens({ code, redirectUri }) {
  const { clientId, clientSecret } = requireGoogleOAuthSecrets();
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const json = await response.json();
  if (!response.ok) {
    throw new HttpsError(
      "internal",
      `Google rechazó el intercambio OAuth: ${json.error_description || json.error || response.status}`
    );
  }

  return json;
}

async function refreshGoogleAccessToken(refreshToken) {
  const { clientId, clientSecret } = requireGoogleOAuthSecrets();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error_description || json.error || "No se pudo renovar el token de Gmail.");
  }

  return json;
}

async function fetchGoogleUserInfo(accessToken) {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error_description || json.error || "No se pudo leer el perfil de Google.");
  }
  return json;
}

async function upsertGmailTokens(uid, tokenResponse, grantedEmail = "") {
  const tokenRef = privateDoc(uid, "tokens");
  const existingSnap = await tokenRef.get();
  const existing = existingSnap.exists ? existingSnap.data() : {};
  const nextRefreshToken =
    tokenResponse.refresh_token ||
    (typeof existing.refreshToken === "string" ? existing.refreshToken : "");

  if (!nextRefreshToken) {
    throw new HttpsError(
      "failed-precondition",
      "Google no devolvió refresh_token. Revoca el acceso previo de la app y autoriza de nuevo con prompt=consent."
    );
  }

  const expiresIn = Number(tokenResponse.expires_in || 0);
  const expiryDate = expiresIn > 0 ? Date.now() + expiresIn * 1000 : Date.now() + 3500 * 1000;

  await tokenRef.set(
    {
      provider: "google-gmail",
      email: grantedEmail,
      scopes: Array.from(
        new Set(
          String(tokenResponse.scope || "")
            .split(/\s+/)
            .map((scope) => scope.trim())
            .filter(Boolean)
        )
      ),
      accessToken: String(tokenResponse.access_token || ""),
      refreshToken: nextRefreshToken,
      tokenType: String(tokenResponse.token_type || "Bearer"),
      expiryDate,
      grantedAt: existing.grantedAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await privateDoc(uid, "gmail_access").set(
    {
      connected: true,
      email: grantedEmail,
      providerLinked: true,
      scopes: Array.from(
        new Set([GMAIL_SEND_SCOPE, GMAIL_USERINFO_SCOPE].concat(
          String(tokenResponse.scope || "")
            .split(/\s+/)
            .map((scope) => scope.trim())
            .filter(Boolean)
        ))
      ),
      grantedAt: existing.grantedAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

async function getValidAccessToken(uid) {
  const tokenSnap = await privateDoc(uid, "tokens").get();
  if (!tokenSnap.exists()) {
    throw new Error("Por favor configura Gmail en tu cuenta.");
  }

  const token = tokenSnap.data() || {};
  const accessToken = typeof token.accessToken === "string" ? token.accessToken : "";
  const refreshToken = typeof token.refreshToken === "string" ? token.refreshToken : "";
  const expiryDate = Number(token.expiryDate || 0);
  const isStillValid = accessToken && expiryDate && expiryDate > Date.now() + 60 * 1000;

  if (isStillValid) {
    return accessToken;
  }

  if (!refreshToken) {
    throw new Error("No existe refresh token de Gmail para este usuario.");
  }

  const refreshed = await refreshGoogleAccessToken(refreshToken);
  const nextExpiryDate = Date.now() + Number(refreshed.expires_in || 3500) * 1000;

  await privateDoc(uid, "tokens").set(
    {
      accessToken: String(refreshed.access_token || ""),
      expiryDate: nextExpiryDate,
      tokenType: String(refreshed.token_type || "Bearer"),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return String(refreshed.access_token || "");
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function encodeBase64Url(value) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function prepareMimeMessage({ to, subject, html, fromEmail = "" }) {
  const safeTo = String(to || "").trim();
  const safeSubject = String(subject || "").trim();
  const safeHtml = String(html || "").trim();
  const plainText = stripHtml(safeHtml) || "Mensaje MAP";
  const boundary = `map_boundary_${Date.now()}`;
  const headers = [
    fromEmail ? `From: MAP <${fromEmail}>` : "",
    `To: ${safeTo}`,
    `Subject: ${safeSubject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].filter(Boolean);

  const mime = [
    headers.join("\r\n"),
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    plainText,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    safeHtml,
    "",
    `--${boundary}--`,
    "",
  ].join("\r\n");

  return encodeBase64Url(mime);
}

async function sendViaGmail(uid, { to, subject, html }) {
  const accessToken = await getValidAccessToken(uid);
  const accessSnap = await privateDoc(uid, "gmail_access").get();
  const access = accessSnap.exists ? accessSnap.data() : {};
  const raw = prepareMimeMessage({
    to,
    subject,
    html,
    fromEmail: typeof access.email === "string" ? access.email : "",
  });

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error?.message || "Gmail API rechazó el envío.");
  }

  return json;
}

function buildWelcomeEmailHtml(webinar, participant) {
  const title = String(webinar?.titulo || "Webinar MAP");
  const participantName =
    String(participant?.answers?.full_name || participant?.answers?.name || "").trim() || "participante";
  const subtitle = String(webinar?.descripcion || webinar?.branding?.subtitle || "").trim();

  return `
    <div style="font-family: Arial, sans-serif; color: #102742; line-height: 1.5;">
      <h1 style="margin-bottom: 8px;">${title}</h1>
      <p>Hola ${participantName},</p>
      <p>Tu registro para este webinar ha sido recibido correctamente.</p>
      ${subtitle ? `<p>${subtitle}</p>` : ""}
      <p>Pronto recibirás más detalles por este mismo correo.</p>
      <hr />
      <p style="font-size: 12px; color: #526b7e;">MAP</p>
    </div>
  `.trim();
}

function getMessagingMessagesFromWebinarDoc(webinar) {
  const m = webinar.messaging;
  if (m && Array.isArray(m.messages) && m.messages.length > 0) {
    return m.messages
      .filter((x) => x && typeof x === "object")
      .map((x, i) => normalizeMsgNode(x, i));
  }
  const templates = m && typeof m.templates === "object" ? m.templates : {};
  const ids = ["welcome", "reminder", "thankYou"];
  return ids.map((id) => {
    const t = templates[id] || {};
    const mode = String(t.mode || "automatic");
    return normalizeMsgNode({
      id,
      enabled: Boolean(t.enabled),
      sendFormat: mode === "manual" ? "manual" : "automatic",
      automaticTrigger: t.automaticTrigger === "scheduled" ? "scheduled" : "registration",
      scheduledAt: t.scheduledAt ?? null,
      subject: String(t.subject || ""),
      bodyHtml: String(t.bodyHtml || ""),
    });
  });
}

function normalizeMsgNode(raw, index = 0) {
  let id = String(raw.id || "").trim();
  if (!id) {
    id = `msg_${index}`;
  }
  const sendFormat = raw.sendFormat === "manual" ? "manual" : "automatic";
  const automaticTrigger = raw.automaticTrigger === "scheduled" ? "scheduled" : "registration";
  return {
    id,
    enabled: Boolean(raw.enabled),
    sendFormat,
    automaticTrigger,
    scheduledAt: raw.scheduledAt ?? null,
    subject: String(raw.subject || ""),
    bodyHtml: String(raw.bodyHtml || ""),
  };
}

function scheduledMessageReady(msg, nowMs) {
  if (!msg.enabled || msg.sendFormat !== "automatic" || msg.automaticTrigger !== "scheduled") {
    return false;
  }
  const ts = msg.scheduledAt;
  const ms =
    ts && typeof ts.toMillis === "function"
      ? ts.toMillis()
      : ts && typeof ts._seconds === "number"
        ? ts._seconds * 1000
        : ts && typeof ts.seconds === "number"
          ? ts.seconds * 1000
          : 0;
  return ms > 0 && ms <= nowMs;
}

/**
 * Encola correos de mensajes automáticos con disparador "al inscribirse".
 * @param {{ skipEmailStatusCheck?: boolean, templateKeyFilter?: string | null }} [opts]
 */
async function enqueueRegistrationEmailsForParticipant(
  webinar,
  webinarId,
  participantId,
  participant,
  opts = {}
) {
  const skipEmailStatusCheck = Boolean(opts.skipEmailStatusCheck);
  const templateKeyFilter =
    typeof opts.templateKeyFilter === "string" && opts.templateKeyFilter.trim()
      ? opts.templateKeyFilter.trim()
      : null;

  const ownerUid = String(webinar?.createdBy?.uid || "").trim();
  const targetEmail = String(participant.email || "").trim();
  if (!targetEmail || !ownerUid) return 0;
  if (webinar.messaging?.enabled !== true) return 0;

  const messages = getMessagingMessagesFromWebinarDoc(webinar);
  let queued = 0;

  for (const msg of messages) {
    if (!msg.id) continue;
    if (templateKeyFilter && msg.id !== templateKeyFilter) continue;
    if (!msg.enabled || msg.sendFormat !== "automatic" || msg.automaticTrigger !== "registration") {
      continue;
    }
    if (!skipEmailStatusCheck) {
      const st = (participant.emailStatus || {})[msg.id];
      if (st && st !== "pending") continue;
    }

    const subject =
      String(msg.subject || "").trim() ||
      `Confirmación: ${String(webinar.titulo || "MAP")}`;
    const html =
      String(msg.bodyHtml || "").trim() || buildWelcomeEmailHtml(webinar, participant);

    await queueCollection().add({
      uid: ownerUid,
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
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      sentAt: null,
      errorMessage: "",
    });
    queued += 1;
  }

  return queued;
}

/**
 * Encola un único mensaje (manual o automático) para un participante.
 * Solo mensajes habilitados en la configuración del formulario.
 */
async function enqueueSingleMessageForParticipant(
  webinar,
  webinarId,
  participantId,
  participant,
  templateKey
) {
  const key = String(templateKey || "").trim();
  const ownerUid = String(webinar?.createdBy?.uid || "").trim();
  const targetEmail = String(participant.email || "").trim();
  if (!key || !targetEmail || !ownerUid) return 0;
  if (webinar.messaging?.enabled !== true) return 0;

  const messages = getMessagingMessagesFromWebinarDoc(webinar);
  const msg = messages.find((m) => m.id === key);
  if (!msg || !msg.enabled) return 0;

  const subject =
    String(msg.subject || "").trim() ||
    `Mensaje: ${String(webinar.titulo || "MAP")}`;
  const html =
    String(msg.bodyHtml || "").trim() || buildWelcomeEmailHtml(webinar, participant);

  await queueCollection().add({
    uid: ownerUid,
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
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    sentAt: null,
    errorMessage: "",
  });
  return 1;
}

async function processQueueItem(queueRef, queueData) {
  const uid = String(queueData.ownerUid || queueData.uid || "").trim();
  if (!uid) {
    await queueRef.set(
      {
        status: "failed",
        errorMessage: "uid faltante en la cola.",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return { ok: false, reason: "missing-owner" };
  }

  try {
    const result = await sendViaGmail(uid, {
      to: String(queueData.targetEmail || ""),
      subject: String(queueData.subject || "Mensaje MAP"),
      html: String(queueData.html || "<p>Mensaje MAP</p>"),
    });

    await queueRef.set(
      {
        status: "sent",
        sentAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        errorMessage: "",
        gmailMessageId: String(result.id || ""),
      },
      { merge: true }
    );

    if (queueData.webinarId && queueData.participantId && queueData.templateKey) {
      await db
        .collection("webinars")
        .doc(String(queueData.webinarId))
        .collection("participantes")
        .doc(String(queueData.participantId))
        .set(
          {
            emailStatus: {
              [String(queueData.templateKey)]: "sent",
            },
          },
          { merge: true }
        );
    }

    return { ok: true, gmailMessageId: result.id || "" };
  } catch (error) {
    await queueRef.set(
      {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : String(error),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    if (queueData.webinarId && queueData.participantId && queueData.templateKey) {
      await db
        .collection("webinars")
        .doc(String(queueData.webinarId))
        .collection("participantes")
        .doc(String(queueData.participantId))
        .set(
          {
            emailStatus: {
              [String(queueData.templateKey)]: "failed",
            },
          },
          { merge: true }
        );
    }

    return {
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

exports.createGmailOAuthSession = onCall(
  {
    secrets: [],
  },
  async (request) => {
    const uid = assertSignedIn(request);
    const state = ensureState(request.data?.state);
    const redirectUri = sanitizeRedirectUri(
      request.data?.redirectUri,
      request.rawRequest.headers.origin || ""
    );

    await privateDoc(uid, "gmail_oauth_session").set({
      state,
      redirectUri,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const params = new URLSearchParams({
      client_id: getGoogleClientId(),
      redirect_uri: redirectUri,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      scope: OAUTH_SCOPES.join(" "),
      state,
    });

    return {
      authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      state,
      redirectUri,
    };
  }
);

exports.completeGmailOAuth = onCall(
  {
    secrets: [GOOGLE_GMAIL_CLIENT_SECRET],
  },
  async (request) => {
    const uid = assertSignedIn(request);
    const state = ensureState(request.data?.state);
    const code = typeof request.data?.code === "string" ? request.data.code.trim() : "";
    const redirectUri = sanitizeRedirectUri(
      request.data?.redirectUri,
      request.rawRequest.headers.origin || ""
    );

    if (!code) {
      throw new HttpsError("invalid-argument", "El código OAuth es obligatorio.");
    }

    const sessionRef = privateDoc(uid, "gmail_oauth_session");
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists()) {
      throw new HttpsError("failed-precondition", "No existe una sesión OAuth activa.");
    }

    const session = sessionSnap.data() || {};
    if (String(session.state || "") !== state) {
      throw new HttpsError("permission-denied", "El estado OAuth no coincide.");
    }
    if (String(session.redirectUri || "") !== redirectUri) {
      throw new HttpsError("permission-denied", "El redirectUri de OAuth no coincide.");
    }

    const tokens = await exchangeCodeForTokens({ code, redirectUri });
    const userInfo = await fetchGoogleUserInfo(String(tokens.access_token || ""));
    await upsertGmailTokens(uid, tokens, String(userInfo.email || ""));
    await sessionRef.delete();

    return {
      connected: true,
      email: String(userInfo.email || ""),
      scopes: String(tokens.scope || "")
        .split(/\s+/)
        .map((scope) => scope.trim())
        .filter(Boolean),
    };
  }
);

exports.sendWebinarEmail = onCall(
  {
    secrets: [GOOGLE_GMAIL_CLIENT_SECRET],
  },
  async (request) => {
    const uid = assertSignedIn(request);
    const to = typeof request.data?.targetEmail === "string" ? request.data.targetEmail.trim() : "";
    const subject = typeof request.data?.subject === "string" ? request.data.subject.trim() : "";
    const html = typeof request.data?.html === "string" ? request.data.html.trim() : "";

    if (!to || !subject || !html) {
      throw new HttpsError("invalid-argument", "targetEmail, subject y html son obligatorios.");
    }

    const result = await sendViaGmail(uid, { to, subject, html });
    return { ok: true, gmailMessageId: result.id || "" };
  }
);

exports.resendParticipantEmails = onCall(async (request) => {
  const callerUid = assertSignedIn(request);
  const webinarId =
    typeof request.data?.webinarId === "string" ? request.data.webinarId.trim() : "";
  const participantId =
    typeof request.data?.participantId === "string" ? request.data.participantId.trim() : "";
  const templateKey =
    typeof request.data?.templateKey === "string" ? request.data.templateKey.trim() : "";

  if (!webinarId || !participantId) {
    throw new HttpsError("invalid-argument", "webinarId y participantId son obligatorios.");
  }
  if (!templateKey) {
    throw new HttpsError(
      "invalid-argument",
      "templateKey es obligatorio (identificador del mensaje a enviar)."
    );
  }

  const webinarSnap = await db.collection("webinars").doc(webinarId).get();
  if (!webinarSnap.exists) {
    throw new HttpsError("not-found", "Formulario no encontrado.");
  }
  const webinar = webinarSnap.data() || {};
  if (String(webinar?.createdBy?.uid || "") !== callerUid) {
    throw new HttpsError("permission-denied", "No eres el dueño de este formulario.");
  }

  const participantSnap = await db
    .collection("webinars")
    .doc(webinarId)
    .collection("participantes")
    .doc(participantId)
    .get();
  if (!participantSnap.exists) {
    throw new HttpsError("not-found", "Inscripción no encontrada.");
  }
  const participant = participantSnap.data() || {};

  const queued = await enqueueSingleMessageForParticipant(
    webinar,
    webinarId,
    participantId,
    participant,
    templateKey
  );

  if (queued === 0) {
    throw new HttpsError(
      "failed-precondition",
      "No se pudo encolar el mensaje. Comprueba que exista, esté habilitado y que la mensajería del formulario esté activa."
    );
  }

  return { ok: true, queued: 1 };
});

exports.queueWebinarEmail = onCall(async (request) => {
  const uid = assertSignedIn(request);
  const webinarId = typeof request.data?.webinarId === "string" ? request.data.webinarId.trim() : "";
  const participantId =
    typeof request.data?.participantId === "string" ? request.data.participantId.trim() : "";
  const targetEmail =
    typeof request.data?.targetEmail === "string" ? request.data.targetEmail.trim() : "";
  const templateKey =
    typeof request.data?.templateKey === "string" ? request.data.templateKey.trim() : "welcome";
  const subject = typeof request.data?.subject === "string" ? request.data.subject.trim() : "";
  const html = typeof request.data?.html === "string" ? request.data.html.trim() : "";
  const context =
    request.data?.context && typeof request.data.context === "object" ? request.data.context : {};

  if (!webinarId || !targetEmail || !subject || !html) {
    throw new HttpsError(
      "invalid-argument",
      "webinarId, targetEmail, subject y html son obligatorios para la cola."
    );
  }

  const ref = queueCollection().doc();
  await ref.set({
    uid,
    webinarId,
    participantId,
    targetEmail,
    templateKey,
    subject,
    html,
    context,
    status: "pending",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    sentAt: null,
    errorMessage: "",
  });

  return { ok: true, queueId: ref.id };
});

exports.processQueuedWebinarEmails = onCall(
  {
    secrets: [GOOGLE_GMAIL_CLIENT_SECRET],
  },
  async (request) => {
    const uid = assertSignedIn(request);
    const maxItems = Math.min(Math.max(Number(request.data?.limit || 10), 1), 25);
    const snap = await queueCollection()
      .where("uid", "==", uid)
      .where("status", "==", "pending")
      .limit(maxItems)
      .get();

    const results = [];
    for (const docSnap of snap.docs) {
      const result = await processQueueItem(docSnap.ref, docSnap.data());
      results.push({ queueId: docSnap.id, ...result });
    }

    return {
      ok: true,
      processed: results.length,
      results,
    };
  }
);

exports.handleEmailQueueCreated = onDocumentCreated(
  {
    document: "email_queue/{queueId}",
    secrets: [GOOGLE_GMAIL_CLIENT_SECRET],
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;
    const data = snapshot.data();
    if (!data || data.status !== "pending") return;
    await processQueueItem(snapshot.ref, data);
  }
);

exports.handleParticipantCreated = onDocumentCreated(
  "webinars/{webinarId}/participantes/{participantId}",
  async (event) => {
    const participantSnap = event.data;
    if (!participantSnap) return;

    const { webinarId, participantId } = event.params;
    const participant = participantSnap.data() || {};
    const webinarSnap = await db.collection("webinars").doc(webinarId).get();
    if (!webinarSnap.exists) return;

    const webinar = webinarSnap.data() || {};
    const ownerUid = String(webinar?.createdBy?.uid || "").trim();

    // Denormalización del dueño del formulario: las reglas de Firestore pueden autorizar
    // lectura/borrado del participante con este campo sin depender solo de get() al padre.
    if (ownerUid) {
      try {
        await participantSnap.ref.update({ webinarCreatedByUid: ownerUid });
      } catch (e) {
        console.error("[handleParticipantCreated] webinarCreatedByUid", e);
      }
    }

    await enqueueRegistrationEmailsForParticipant(
      webinar,
      webinarId,
      participantId,
      participant,
      { skipEmailStatusCheck: false }
    );
  }
);

exports.processScheduledWebinarMessages = onSchedule(
  {
    schedule: "every 5 minutes",
    timeZone: "America/Costa_Rica",
  },
  async () => {
    const nowMs = Date.now();
    const webinarsSnap = await db.collection("webinars").limit(400).get();

    for (const webinarDoc of webinarsSnap.docs) {
      const webinar = webinarDoc.data() || {};
      if (webinar.messaging?.enabled !== true) continue;
      const ownerUid = String(webinar?.createdBy?.uid || "").trim();
      if (!ownerUid) continue;

      const messages = getMessagingMessagesFromWebinarDoc(webinar).filter((m) =>
        scheduledMessageReady(m, nowMs)
      );
      if (messages.length === 0) continue;

      const participantsSnap = await webinarDoc.ref.collection("participantes").limit(200).get();

      for (const pDoc of participantsSnap.docs) {
        const participant = pDoc.data() || {};
        const targetEmail = String(participant.email || "").trim();
        if (!targetEmail) continue;
        /** @type {Record<string, string>} */
        let st = { ...(participant.emailStatus || {}) };

        for (const msg of messages) {
          if (st[msg.id] !== "pending") continue;

          const subject =
            String(msg.subject || "").trim() ||
            `Mensaje programado: ${String(webinar.titulo || "MAP")}`;
          const html =
            String(msg.bodyHtml || "").trim() || buildWelcomeEmailHtml(webinar, participant);

          const queueRef = queueCollection().doc(
            `${ownerUid}__${webinarDoc.id}__${pDoc.id}__${msg.id}`.replace(/[^a-zA-Z0-9_-]/g, "_")
          );
          const existing = await queueRef.get();
          if (existing.exists) continue;

          await queueRef.set({
            uid: ownerUid,
            webinarId: webinarDoc.id,
            participantId: pDoc.id,
            targetEmail,
            templateKey: msg.id,
            subject,
            html,
            status: "pending",
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            sentAt: null,
            errorMessage: "",
          });

          st = { ...st, [msg.id]: "queued" };
          await pDoc.ref.set({ emailStatus: st }, { merge: true });
        }
      }
    }

    return null;
  }
);

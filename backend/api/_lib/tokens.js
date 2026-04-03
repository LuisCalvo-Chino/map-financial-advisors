import admin from "firebase-admin";
import { getAdminDb } from "./firebase-admin.js";
import { GMAIL_SEND_SCOPE } from "./gmail.js";

function privateDoc(uid, docId) {
  return getAdminDb().collection("usuarios").doc(uid).collection("private").doc(docId);
}

export async function saveOAuthSession({ uid, state, redirectUri }) {
  await privateDoc(uid, `oauth_session_${state}`).set({
    uid,
    state,
    redirectUri,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export async function readOAuthSession({ uid, state }) {
  const snap = await privateDoc(uid, `oauth_session_${state}`).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  if (data.uid !== uid || data.state !== state) return null;
  return data;
}

export async function deleteOAuthSession({ uid, state }) {
  await privateDoc(uid, `oauth_session_${state}`).delete().catch(() => {});
}

export async function readUserTokens(uid) {
  const snap = await privateDoc(uid, "tokens").get();
  return snap.exists ? snap.data() || {} : null;
}

export async function upsertGmailTokens({
  uid,
  googleEmail,
  refreshToken,
  accessToken = "",
  accessTokenExpiresAt = null,
}) {
  const db = getAdminDb();
  const tokensRef = privateDoc(uid, "tokens");
  const gmailAccessRef = privateDoc(uid, "gmail_access");
  const existing = await tokensRef.get();
  const previous = existing.exists ? existing.data() || {} : {};

  const nextRefreshToken =
    typeof refreshToken === "string" && refreshToken.trim()
      ? refreshToken.trim()
      : String(previous.refreshToken || "");

  if (!nextRefreshToken) {
    throw new Error("Google no devolvió refresh_token. Usa prompt=consent y vuelve a autorizar.");
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  await db.runTransaction(async (tx) => {
    tx.set(
      tokensRef,
      {
        provider: "google",
        gmail: {
          connected: true,
          email: googleEmail || "",
          refreshToken: nextRefreshToken,
          accessToken: accessToken || "",
          accessTokenExpiresAt: accessTokenExpiresAt || null,
          scope: GMAIL_SEND_SCOPE,
          updatedAt: now,
          grantedAt: previous.gmail?.grantedAt || now,
        },
      },
      { merge: true }
    );

    tx.set(
      gmailAccessRef,
      {
        connected: true,
        email: googleEmail || "",
        providerLinked: true,
        scopes: [GMAIL_SEND_SCOPE],
        updatedAt: now,
        grantedAt: previous.gmail?.grantedAt || now,
      },
      { merge: true }
    );
  });
}

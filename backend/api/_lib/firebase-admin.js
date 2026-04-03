import admin from "firebase-admin";
import { requiredEnv } from "./config.js";

let appInstance = null;

function normalizePrivateKey(value) {
  return String(value || "").replace(/\\n/g, "\n");
}

export function getAdminApp() {
  if (appInstance) return appInstance;

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: requiredEnv("FIREBASE_PROJECT_ID"),
        clientEmail: requiredEnv("FIREBASE_CLIENT_EMAIL"),
        privateKey: normalizePrivateKey(requiredEnv("FIREBASE_PRIVATE_KEY")),
      }),
    });
  }

  appInstance = admin.app();
  return appInstance;
}

export function getAdminAuth() {
  return getAdminApp().auth();
}

export function getAdminDb() {
  return getAdminApp().firestore();
}

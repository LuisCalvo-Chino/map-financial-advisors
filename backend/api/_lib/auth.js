import { getAdminAuth } from "./firebase-admin.js";

function getBearerToken(req) {
  const header = String(req.headers.authorization || "");
  if (!header.startsWith("Bearer ")) return "";
  return header.slice("Bearer ".length).trim();
}

export async function requireUser(req) {
  const idToken = getBearerToken(req);
  if (!idToken) {
    throw new Error("Missing Firebase ID token.");
  }
  const decoded = await getAdminAuth().verifyIdToken(idToken);
  if (!decoded?.uid) {
    throw new Error("Invalid Firebase session.");
  }
  return decoded;
}

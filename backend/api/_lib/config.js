import dotenv from "dotenv";

// Carga variables locales para `vercel dev` y ejecuciones Node fuera del dashboard.
dotenv.config({ path: ".env.local" });
dotenv.config();

export const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
export const GMAIL_USERINFO_SCOPE = "https://www.googleapis.com/auth/userinfo.email";
export const OAUTH_SCOPES = [GMAIL_SEND_SCOPE, GMAIL_USERINFO_SCOPE, "openid", "email"];

export function requiredEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return String(value);
}

export function optionalEnv(name, fallback = "") {
  const value = process.env[name];
  return value && String(value).trim() ? String(value) : fallback;
}

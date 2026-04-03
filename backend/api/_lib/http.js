import { optionalEnv } from "./config.js";

function normalizeOrigins() {
  const raw = optionalEnv("ALLOWED_ORIGINS", "");
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function setCors(req, res) {
  const allowedOrigins = normalizeOrigins();
  const requestOrigin = String(req.headers.origin || "");
  const allowOrigin =
    requestOrigin && (allowedOrigins.length === 0 || allowedOrigins.includes(requestOrigin))
      ? requestOrigin
      : allowedOrigins[0] || "*";

  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Vary", "Origin");
}

export function handleOptions(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}

export function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

export function parseJsonBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  if (typeof req.body === "object") {
    return req.body;
  }
  return {};
}

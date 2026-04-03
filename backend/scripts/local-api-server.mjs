/**
 * Servidor HTTP local para Gmail/OAuth sin `vercel dev` (evita recursión y problemas de CLI).
 * Uso: `npm run dev` desde la carpeta backend (o `node scripts/local-api-server.mjs`).
 */
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, "..");
process.chdir(backendRoot);
dotenv.config({ path: path.join(backendRoot, ".env.local") });
dotenv.config({ path: path.join(backendRoot, ".env") });

const [
  { default: oauthStart },
  { default: oauthCallback },
  { default: gmailSend },
  { default: gmailQueue },
  { default: gmailProcess },
  { default: gmailResend },
  { default: gmailPublicTrigger },
] = await Promise.all([
  import("../api/oauth/start.js"),
  import("../api/oauth/callback.js"),
  import("../api/gmail/send.js"),
  import("../api/gmail/queue.js"),
  import("../api/gmail/process-queue.js"),
  import("../api/gmail/resend.js"),
  import("../api/gmail/public-trigger.js"),
]);

/** @param {import('node:http').ServerResponse} res */
function patchRes(res) {
  res.status = (code) => {
    res.statusCode = code;
    return {
      json: (payload) => {
        if (!res.writableEnded) {
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(payload));
        }
      },
      end: (chunk) => {
        if (!res.writableEnded) res.end(chunk);
      },
    };
  };
}

/**
 * @param {import('node:http').IncomingMessage} req
 * @returns {Promise<Record<string, unknown>>}
 */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      if (!text.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(text));
      } catch {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

const routes = [
  { method: "POST", path: "/api/oauth/start", handler: oauthStart },
  { method: "POST", path: "/api/oauth/callback", handler: oauthCallback },
  { method: "POST", path: "/api/gmail/send", handler: gmailSend },
  { method: "POST", path: "/api/gmail/queue", handler: gmailQueue },
  { method: "POST", path: "/api/gmail/process-queue", handler: gmailProcess },
  { method: "POST", path: "/api/gmail/resend", handler: gmailResend },
  { method: "POST", path: "/api/gmail/public-trigger", handler: gmailPublicTrigger },
];

const PORT = Number(process.env.PORT || 3000);

const server = http.createServer(async (req, res) => {
  patchRes(res);
  const url = new URL(req.url || "/", "http://127.0.0.1");
  const pathname = url.pathname;

  const route = routes.find((r) => r.method === req.method && r.path === pathname);

  if (!route) {
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
      res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.end();
      return;
    }
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: "Not found" }));
    return;
  }

  try {
    const body = await readJsonBody(req);
    Object.assign(req, { body });
    console.log(`[map-gmail-backend] ${req.method} ${pathname}`);
    await route.handler(req, res);
  } catch (err) {
    if (!res.writableEnded) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(
        JSON.stringify({
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        })
      );
    }
  }
});

server.listen(PORT, () => {
  console.log(`[map-gmail-backend] Local API http://localhost:${PORT}`);
  console.log(`[map-gmail-backend] Rutas: ${routes.map((r) => r.path).join(", ")}`);
});

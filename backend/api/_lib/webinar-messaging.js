/**
 * Alineado con apps/webinars-assistant/messaging-model.js (servidor).
 * @param {Record<string, unknown>} webinar
 */
export function getMessagingMessagesFromWebinar(webinar) {
  const m = webinar.messaging;
  if (m && typeof m === "object" && Array.isArray(m.messages) && m.messages.length > 0) {
    return m.messages
      .filter((x) => x && typeof x === "object")
      .map((raw, index) => normalizeMessage(raw, index));
  }

  const templates =
    m && typeof m === "object" && m.templates && typeof m.templates === "object" ? m.templates : {};
  const ids = ["welcome", "reminder", "thankYou"];
  const LEGACY_NAMES = { welcome: "Bienvenida", reminder: "Recordatorio", thankYou: "Agradecimiento" };
  return ids.map((id) => {
    const t = templates[id] || {};
    const mode = String(t.mode || "automatic");
    return normalizeMessage({
      id,
      name: LEGACY_NAMES[id] || id,
      enabled: Boolean(t.enabled),
      sendFormat: mode === "manual" ? "manual" : "automatic",
      automaticTrigger: t.automaticTrigger === "scheduled" ? "scheduled" : "registration",
      scheduledAt: t.scheduledAt ?? null,
      subject: String(t.subject || ""),
      bodyHtml: String(t.bodyHtml || ""),
    });
  });
}

function normalizeMessage(raw, index = 0) {
  let id = String(raw.id || "").trim();
  if (!id) {
    id = `msg_${index}`;
  }
  const sendFormat = raw.sendFormat === "manual" ? "manual" : "automatic";
  const automaticTrigger = raw.automaticTrigger === "scheduled" ? "scheduled" : "registration";
  return {
    id,
    name: String(raw.name || "Mensaje"),
    enabled: Boolean(raw.enabled),
    sendFormat,
    automaticTrigger,
    scheduledAt: raw.scheduledAt ?? null,
    subject: String(raw.subject || ""),
    bodyHtml: String(raw.bodyHtml || ""),
  };
}

/**
 * @param {ReturnType<typeof normalizeMessage>} msg
 * @param {number} nowMs
 */
export function shouldSendAutomaticRegistration(msg, nowMs) {
  void nowMs;
  return msg.enabled && msg.sendFormat === "automatic" && msg.automaticTrigger === "registration";
}

/**
 * @param {ReturnType<typeof normalizeMessage>} msg
 * @param {number} nowMs
 */
export function shouldSendAutomaticScheduled(msg, nowMs) {
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

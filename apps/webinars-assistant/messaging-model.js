/** @typedef {{ id: string; name: string; enabled: boolean; sendFormat: 'manual' | 'automatic'; automaticTrigger: 'registration' | 'scheduled'; scheduledAt?: import('firebase/firestore').Timestamp | null; subject: string; design: Record<string, unknown>; blocks: unknown[]; bodyHtml?: string }} MessagingMessage */

const LEGACY_NAMES = {
  welcome: "Bienvenida (Registro)",
  reminder: "Recordatorio",
  thankYou: "Agradecimiento",
};

/**
 * @param {Record<string, unknown>} data webinar doc data
 * @returns {MessagingMessage[]}
 */
export function getMessagingMessagesFromWebinar(data) {
  const m = data?.messaging;
  if (m && typeof m === "object" && Array.isArray(m.messages) && m.messages.length > 0) {
    return m.messages
      .filter((x) => x && typeof x === "object")
      .map((raw, index) =>
        normalizeMessage(/** @type {Record<string, unknown>} */ (raw), index)
      );
  }

  const templates =
    m && typeof m === "object" && m.templates && typeof m.templates === "object"
      ? /** @type {Record<string, Record<string, unknown>>} */ (m.templates)
      : {};
  const ids = ["welcome", "reminder", "thankYou"];
  return ids.map((id) => {
    const t = templates[id] || {};
    const mode = String(t.mode || "automatic");
    return normalizeMessage({
      id,
      name: LEGACY_NAMES[/** @type {keyof typeof LEGACY_NAMES} */ (id)] || id,
      enabled: Boolean(t.enabled),
      sendFormat: mode === "manual" ? "manual" : "automatic",
      automaticTrigger: t.automaticTrigger === "scheduled" ? "scheduled" : "registration",
      scheduledAt: t.scheduledAt ?? null,
      subject: String(t.subject || ""),
      design: t.design && typeof t.design === "object" ? t.design : {},
      blocks: Array.isArray(t.blocks) ? t.blocks : [],
      bodyHtml: String(t.bodyHtml || ""),
    });
  });
}

/**
 * @param {Record<string, unknown>} raw
 * @param {number} [index] índice estable en `messaging.messages` si falta `id` (debe coincidir con Cloud Functions).
 * @returns {MessagingMessage}
 */
function normalizeMessage(raw, index = 0) {
  let id = String(raw.id || "").trim();
  if (!id) {
    id = `msg_${index}`;
  }
  const sendFormat = raw.sendFormat === "manual" ? "manual" : "automatic";
  const automaticTrigger =
    raw.automaticTrigger === "scheduled" ? "scheduled" : "registration";
  return {
    id,
    name: String(raw.name || "Mensaje").trim() || "Mensaje",
    enabled: Boolean(raw.enabled),
    sendFormat,
    automaticTrigger,
    scheduledAt: raw.scheduledAt ?? null,
    subject: String(raw.subject || ""),
    design: raw.design && typeof raw.design === "object" ? /** @type {Record<string, unknown>} */ (raw.design) : {},
    blocks: Array.isArray(raw.blocks) ? raw.blocks : [],
    bodyHtml: String(raw.bodyHtml || ""),
  };
}

/**
 * @param {MessagingMessage[]} messages
 * @param {MessagingMessage} next
 * @returns {MessagingMessage[]}
 */
export function upsertMessagingMessage(messages, next) {
  const idx = messages.findIndex((m) => m.id === next.id);
  const copy = [...messages];
  if (idx >= 0) copy[idx] = next;
  else copy.push(next);
  return copy;
}

/**
 * @param {Array<{ id: string; label?: string; type: string }>} fields
 */
export function formFieldKeysForAnswers(fields) {
  if (!Array.isArray(fields)) return [];
  const skip = new Set(["title", "static_text", "list"]);
  return fields
    .filter((f) => f && typeof f === "object" && !skip.has(String(f.type)))
    .map((f) => ({ id: String(f.id), label: String(f.label || f.id), type: String(f.type) }));
}

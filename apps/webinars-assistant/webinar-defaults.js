/** Ruta al logo MAP blanco desde páginas en apps/webinars-assistant/ */
export const DEFAULT_WEBINAR_LOGO_PATH = "../../img/MAP Logo.png";

/**
 * @param {string | null | undefined} logoUrl
 */
export function resolveWebinarLogoUrl(logoUrl) {
  const t = String(logoUrl || "").trim();
  return t || DEFAULT_WEBINAR_LOGO_PATH;
}

/** 16 bytes → 32 caracteres hex (único para URL pública). */
export function generatePublicHexSlug() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * @param {string} titulo
 */
export function slugifyInternal(titulo) {
  return String(titulo || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "webinar";
}

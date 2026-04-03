/**
 * Identificador Firestore recomendado para la app interna de webinars.
 * Crear documento `webapps/webinars-assistant` en la consola Firebase (la colección
 * `webapps` no admite escritura desde el cliente con las reglas actuales).
 */
export const WEBINARS_ASSISTANT_APP_ID = "webinars-assistant";

/** Ids de webapps que ya no deben mostrarse en el dashboard (pruebas / retiradas). */
const DEPRECATED_WEBAPP_IDS = new Set(["inicio"]);

/**
 * Documento sugerido para `webapps/webinars-assistant` (copiar campos en Firebase Console).
 * @type {Record<string, unknown>}
 */
export const WEBAPP_WEBINARS_ASSISTANT_SEED = {
  titulo: "Asistente de Formularios",
  url: "./apps/webinars-assistant/index.html",
  icono: "form",
  es_gratuita: false,
  planes_incluidos: ["basico", "profesional", "vitalicio"],
};

/**
 * @param {string} appId
 */
export function isDeprecatedWebappId(appId) {
  return DEPRECATED_WEBAPP_IDS.has(String(appId || "").toLowerCase().trim());
}

/**
 * Oculta tarjetas retiradas o la entrada decorativa "Inicio" aunque el id en Firestore sea otro.
 * @param {{ appId: string; missing: boolean; titulo?: string }} tile
 */
export function isDashboardWebappHidden(tile) {
  if (isDeprecatedWebappId(tile.appId)) return true;
  if (!tile.missing) {
    const titulo = String(tile.titulo || "")
      .trim()
      .toLowerCase();
    if (titulo === "inicio") return true;
  }
  return false;
}

/**
 * URLs válidas para abrir desde el portal: absolutas http(s) o rutas relativas al sitio.
 * @param {string} url
 */
export function isPortalAppUrl(url) {
  const u = String(url || "").trim();
  if (!u) return false;
  if (/^https?:\/\//i.test(u)) return true;
  if (u.startsWith("./") || u.startsWith("../")) return true;
  if (u.startsWith("apps/")) return true;
  if (u.startsWith("/")) return true;
  return false;
}

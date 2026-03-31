import { Timestamp } from "firebase/firestore";

export const USER_ROLE = {
  admin: "admin",
  usuario: "usuario",
};

export const USER_STATUS = {
  active: "active",
  suspended: "suspended",
};

export const PLAN_TYPE = {
  free: "free",
  basico: "basico",
  profesional: "profesional",
  vitalicio: "vitalicio",
};

export const PLAN_LABELS = {
  [PLAN_TYPE.free]: "Free",
  [PLAN_TYPE.basico]: "Básico",
  [PLAN_TYPE.profesional]: "Profesional",
  [PLAN_TYPE.vitalicio]: "Vitalicio",
};

/**
 * @param {{ nombre: string; email: string; fechaInicio?: unknown; appsActivas?: string[] }} params
 */
export function buildInitialUserProfile(params) {
  const { nombre, email, fechaInicio = null, appsActivas = [] } = params;
  return {
    nombre,
    email,
    rol: USER_ROLE.usuario,
    status: USER_STATUS.active,
    plan: {
      tipo: PLAN_TYPE.free,
      fecha_inicio: fechaInicio,
      fecha_vencimiento: null,
    },
    apps_activas: appsActivas,
  };
}

/**
 * @param {unknown} value
 * @returns {Date | null}
 */
export function toDateOrNull(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === "object" && value !== null && "toDate" in value) {
    try {
      return /** @type {{ toDate: () => Date }} */ (value).toDate();
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * @param {Record<string, unknown> | null | undefined} raw
 * @param {string} uid
 */
export function normalizeUserDoc(raw, uid = "") {
  const source = raw ?? {};
  const plan =
    typeof source.plan === "object" && source.plan !== null
      ? /** @type {Record<string, unknown>} */ (source.plan)
      : {};
  const rol =
    source.rol === USER_ROLE.admin ? USER_ROLE.admin : USER_ROLE.usuario;
  const status =
    source.status === USER_STATUS.suspended
      ? USER_STATUS.suspended
      : USER_STATUS.active;
  const tipo =
    typeof plan.tipo === "string" && plan.tipo in PLAN_LABELS
      ? plan.tipo
      : PLAN_TYPE.free;

  return {
    uid,
    nombre:
      typeof source.nombre === "string" && source.nombre.trim()
        ? source.nombre.trim()
        : typeof source.name === "string" && source.name.trim()
          ? source.name.trim()
          : "Usuario MAP",
    email: typeof source.email === "string" ? source.email.trim() : "",
    rol,
    status,
    plan: {
      tipo,
      fecha_inicio: toDateOrNull(plan.fecha_inicio),
      fecha_vencimiento: toDateOrNull(plan.fecha_vencimiento),
    },
    apps_activas: Array.isArray(source.apps_activas)
      ? source.apps_activas.map((item) => String(item))
      : [],
  };
}

/**
 * @param {{ plan: { tipo: string; fecha_vencimiento: Date | null } }} profile
 * @param {Date} [now]
 */
export function isPlanExpired(profile, now = new Date()) {
  if (profile.plan.tipo === PLAN_TYPE.vitalicio) return false;
  if (!profile.plan.fecha_vencimiento) return false;
  return profile.plan.fecha_vencimiento.getTime() < now.getTime();
}

/**
 * @param {{ status: string; plan: { tipo: string; fecha_vencimiento: Date | null } }} profile
 * @param {{ es_gratuita?: boolean }} app
 */
export function canAccessWebapp(profile, app) {
  if (app.es_gratuita) return true;
  if (profile.status === USER_STATUS.suspended) return false;
  return !isPlanExpired(profile);
}

/**
 * @param {Date | null} base
 * @param {number} months
 */
export function addMonths(base, months) {
  const seed = base ? new Date(base) : new Date();
  seed.setMonth(seed.getMonth() + months);
  return seed;
}

/**
 * @param {Date | null} base
 * @param {number} years
 */
export function addYears(base, years) {
  const seed = base ? new Date(base) : new Date();
  seed.setFullYear(seed.getFullYear() + years);
  return seed;
}

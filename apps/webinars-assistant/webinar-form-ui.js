import {
  DEFAULT_WEBINAR_LOGO_PATH,
  resolveWebinarLogoUrl,
} from "./webinar-defaults.js";

const LOGO_HEIGHT_MIN = 100;
const LOGO_HEIGHT_MAX = 400;
const LOGO_HEIGHT_DEFAULT = 180;

/**
 * @param {unknown} value
 */
function normalizeLogoHeightPx(value) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return LOGO_HEIGHT_DEFAULT;
  return Math.min(LOGO_HEIGHT_MAX, Math.max(LOGO_HEIGHT_MIN, Math.round(n)));
}

/**
 * @param {string} text
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * @param {Record<string, unknown>} raw
 */
export function normalizeWebinarDocFromFirestore(raw) {
  if (!raw || typeof raw !== "object") return null;
  const branding =
    typeof raw.branding === "object" && raw.branding !== null
      ? /** @type {Record<string, unknown>} */ (raw.branding)
      : {};
  const fields = Array.isArray(raw.fields) ? raw.fields : [];
  return {
    titulo: typeof raw.titulo === "string" ? raw.titulo : "",
    slug: typeof raw.slug === "string" ? raw.slug : "",
    descripcion: typeof raw.descripcion === "string" ? raw.descripcion : "",
    estado: raw.estado === "published" || raw.estado === "closed" || raw.estado === "draft"
      ? raw.estado
      : "draft",
    publicHex: typeof raw.publicHex === "string" ? raw.publicHex : "",
    branding: {
      logoUrl: typeof branding.logoUrl === "string" ? branding.logoUrl : "",
      headerColor:
        typeof branding.headerColor === "string" ? branding.headerColor : "#173862",
      footerColor:
        typeof branding.footerColor === "string" ? branding.footerColor : "#102742",
      backgroundColor:
        typeof branding.backgroundColor === "string"
          ? branding.backgroundColor
          : "#f4f0ed",
      contentColor:
        typeof branding.contentColor === "string"
          ? branding.contentColor
          : "#ffffff",
      titleColor:
        typeof branding.titleColor === "string"
          ? branding.titleColor
          : "#173862",
      textColor:
        typeof branding.textColor === "string"
          ? branding.textColor
          : "#102742",
      fieldTextColor:
        typeof branding.fieldTextColor === "string"
          ? branding.fieldTextColor
          : "#102742",
      fieldInputBackgroundColor:
        typeof branding.fieldInputBackgroundColor === "string"
          ? branding.fieldInputBackgroundColor
          : "#ffffff",
      fieldInputTextColor:
        typeof branding.fieldInputTextColor === "string"
          ? branding.fieldInputTextColor
          : "#102742",
      logoMaxHeightPx: normalizeLogoHeightPx(branding.logoMaxHeightPx),
      accentColor:
        typeof branding.accentColor === "string" ? branding.accentColor : "#A89F8F",
      title: typeof branding.title === "string" ? branding.title : "",
      subtitle: typeof branding.subtitle === "string" ? branding.subtitle : "",
      footerText:
        typeof branding.footerText === "string" ? branding.footerText : "",
    },
    fields: fields
      .filter((f) => f && typeof f === "object")
      .map((f) => {
        const x = /** @type {Record<string, unknown>} */ (f);
        return {
          id: String(x.id || ""),
          type: ["text", "email", "phone", "file", "paragraph", "title", "static_text", "list"].includes(String(x.type))
            ? String(x.type)
            : "text",
          label: String(x.label || "Campo"),
          placeholder: String(x.placeholder || ""),
          content: String(x.content || ""),
          listType: String(x.listType || "bullets"),
          helpText: String(x.helpText || ""),
          required: Boolean(x.required),
          order: typeof x.order === "number" ? x.order : 0,
          width: x.width === "half" ? "half" : "full",
          validation:
            typeof x.validation === "object" && x.validation !== null
              ? x.validation
              : {},
        };
      }),
  };
}

/**
 * @param {HTMLElement | null} container
 * @param {ReturnType<typeof normalizeWebinarDocFromFirestore>} doc
 * @param {{ previewMode?: boolean; formId?: string }} [opts]
 */
export function renderWebinarFormShell(container, doc, opts = {}) {
  if (!container || !doc) return;

  const { previewMode = false, formId = "webinar-public-form" } = opts;
  const b = doc.branding;
  const logoSrc = resolveWebinarLogoUrl(b.logoUrl);
  const logoHeightPx = normalizeLogoHeightPx(b.logoMaxHeightPx);

  const fields = [...doc.fields].sort((a, c) => a.order - c.order);

  const fieldsHtml = fields
    .map((field) => {
      const safeId = `fld_${String(field.id).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
      const req = field.required ? "required" : "";
      const ro = previewMode ? "readonly tabindex=\"-1\"" : "";
      const dis = previewMode ? "disabled" : "";
      let inputHtml = "";
      const inputStyle =
        "color: var(--w-input-text); background-color: var(--w-input-bg);";

      const common = `id="${safeId}" name="${escapeHtml(field.id)}" class="webinars-public-input" placeholder="${escapeHtml(field.placeholder)}" ${req} ${ro} ${dis} style="${inputStyle}"`;

      if (field.type === "title") {
        return `
          <div class="webinars-public-field webinars-public-field--full">
            <h3 style="color: var(--w-title); font-family: var(--font-titles); margin: 1rem 0 0.5rem;">${escapeHtml(field.content || field.label)}</h3>
          </div>
        `;
      } else if (field.type === "static_text") {
        return `
          <div class="webinars-public-field webinars-public-field--full">
            <div style="color: var(--w-text); font-family: var(--font-body); white-space: pre-wrap; margin-bottom: 0.5rem;">${escapeHtml(field.content || field.label)}</div>
          </div>
        `;
      } else if (field.type === "list") {
        const items = (field.content || '').split('\n').filter(line => line.trim() !== '');
        const listTag = field.listType === 'numbers' ? 'ol' : 'ul';
        const lis = items.map(item => `<li style="margin-bottom: 0.25rem;">${escapeHtml(item)}</li>`).join('');
        return `
          <div class="webinars-public-field webinars-public-field--full">
            <${listTag} style="color: var(--w-text); font-family: var(--font-body); margin-bottom: 0.5rem; padding-left: 1.5rem;">${lis}</${listTag}>
          </div>
        `;
      }

      if (field.type === "email") {
        inputHtml = `<input type="email" ${common} autocomplete="email" />`;
      } else if (field.type === "phone") {
        inputHtml = `<input type="tel" ${common} autocomplete="tel" />`;
      } else if (field.type === "file") {
        inputHtml = previewMode
          ? `<input type="text" readonly class="webinars-public-input" value="[Archivo — vista previa]" style="${inputStyle}" />`
          : `<input type="file" id="${safeId}" name="${escapeHtml(field.id)}" class="webinars-public-input" ${req} style="${inputStyle}" />`;
      } else if (field.type === "paragraph") {
        const taCommon = `id="${safeId}" name="${escapeHtml(field.id)}" class="webinars-public-input webinars-public-textarea" rows="4" placeholder="${escapeHtml(field.placeholder)}" ${req} ${ro} ${dis} style="${inputStyle}"`;
        inputHtml = `<textarea ${taCommon}></textarea>`;
      } else {
        inputHtml = `<input type="text" ${common} autocomplete="off" />`;
      }

      const help = field.helpText
        ? `<p class="webinars-public-help" style="color: var(--w-text);">${escapeHtml(field.helpText)}</p>`
        : "";

      const widthClass =
        field.type === "paragraph"
          ? "webinars-public-field--full"
          : field.width === "half"
            ? "webinars-public-field--half"
            : "webinars-public-field--full";

      return `
        <div class="webinars-public-field ${widthClass}">
          <label class="webinars-public-label" for="${safeId}" style="color: var(--w-label);">${escapeHtml(field.label)}${field.required ? " *" : ""}</label>
          ${inputHtml}
          ${help}
        </div>
      `;
    })
    .join("");

  const previewBanner = previewMode
    ? `<p class="webinars-preview-banner">Vista previa — así verá el formulario quien abra el enlace público.</p>`
    : "";

  const vars = [
    `--w-header:${escapeHtml(b.headerColor)}`,
    `--w-footer:${escapeHtml(b.footerColor)}`,
    `--w-content:${escapeHtml(b.contentColor)}`,
    `--w-bg:${escapeHtml(b.backgroundColor)}`,
    `--w-title:${escapeHtml(b.titleColor || "#173862")}`,
    `--w-text:${escapeHtml(b.textColor || "#102742")}`,
    `--w-label:${escapeHtml(b.fieldTextColor || "#102742")}`,
    `--w-input-bg:${escapeHtml(b.fieldInputBackgroundColor || "#ffffff")}`,
    `--w-input-text:${escapeHtml(b.fieldInputTextColor || "#102742")}`,
  ].join(";");

  container.style.setProperty("--w-preview-bg", b.backgroundColor);

  container.innerHTML = `
    <section class="webinars-public-shell webinars-public-shell--embedded" style="${vars}">
      <header class="webinars-public-shell__header webinars-public-shell__header--logo-only">
        <div class="webinars-public-logo-row">
          <img
            class="webinars-public-logo"
            src="${escapeHtml(logoSrc)}"
            alt=""
            height="${logoHeightPx}"
            style="height: ${logoHeightPx}px; width: auto; max-width: 100%; object-fit: contain;"
          />
        </div>
      </header>
      <div class="webinars-public-shell__content">
        ${previewBanner}
        <form id="${escapeHtml(formId)}" class="webinars-public-form webinars-public-form--grid" novalidate>
          ${fieldsHtml || "<p class=\"webinars-public-help\">Sin campos todavía.</p>"}
          <div class="webinars-form-actions webinars-public-actions">
            <button type="submit" class="btn-map-primary" ${previewMode ? "disabled" : ""}>
              ${previewMode ? "Enviar (solo en publicado)" : "Enviar inscripción"}
            </button>
          </div>
          <p id="public-viewer-status" class="webinars-status webinars-public-form-status" aria-live="polite"></p>
        </form>
      </div>
      <footer class="webinars-public-shell__footer">
        <p>${escapeHtml(b.footerText || "MAP")}</p>
      </footer>
    </section>
  `;
  const shell = container.querySelector(".webinars-public-shell");
  if (shell) {
    shell.style.boxShadow = previewMode ? "0 8px 28px rgba(0,0,0,0.15)" : undefined;
  }

  const img = container.querySelector(".webinars-public-logo");
  if (img instanceof HTMLImageElement) {
    img.addEventListener("error", () => {
      img.onerror = null;
      img.src = DEFAULT_WEBINAR_LOGO_PATH;
    });
  }
}

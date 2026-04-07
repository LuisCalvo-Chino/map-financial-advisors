import DOMPurify from "dompurify";

/** @type {boolean} */
let purifyHooksInstalled = false;

/**
 * Estilos inline permitidos (alineación + formato que genera styleWithCSS en algunos navegadores).
 * @param {string} styleValue
 */
function isAllowedSanitizedStyle(styleValue) {
  const raw = String(styleValue || "").trim();
  if (!raw) return false;
  const chunks = raw
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  if (chunks.length === 0) return false;
  for (const chunk of chunks) {
    if (/url\s*\(|expression\s*\(|javascript:|@import/i.test(chunk))
      return false;
    const lower = chunk.toLowerCase();
    if (/^text-decoration(-line)?\s*:/.test(lower)) {
      continue;
    }
    const ok =
      /^text-align:\s*(left|center|right|justify)\s*$/.test(lower) ||
      /^font-weight:\s*(normal|bold|bolder|lighter|[1-9]00)\s*$/.test(lower) ||
      /^font-style:\s*(normal|italic|oblique)\s*$/.test(lower);
    if (!ok) return false;
  }
  return true;
}

function installPurifyHooks() {
  if (purifyHooksInstalled) return;
  purifyHooksInstalled = true;
  DOMPurify.addHook("uponSanitizeAttribute", (node, data) => {
    if (data.attrName !== "style") return;
    const v = String(data.attrValue || "").trim();
    if (!isAllowedSanitizedStyle(v)) {
      data.keepAttr = false;
    }
  });
}

installPurifyHooks();

const SANITIZE = {
  ALLOWED_TAGS: ["b", "strong", "i", "em", "u", "br", "p", "div", "span"],
  ALLOWED_ATTR: ["style"],
  KEEP_CONTENT: true,
};

/**
 * HTML seguro para vista previa y correo (negrita, cursiva, subrayado, alineación).
 * @param {string} dirty
 */
export function sanitizeWebinarHtml(dirty) {
  const raw = String(dirty ?? "").trim();
  if (!raw) return "";
  return DOMPurify.sanitize(raw, SANITIZE);
}

/**
 * @param {string} text
 */
export function escapeHtmlPlain(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Si no parece HTML, envuelve el texto en párrafo escapado.
 * @param {string} s
 */
export function htmlFromPlainOrSanitized(s) {
  const raw = String(s ?? "");
  if (!raw.trim()) return "";
  if (/<[a-z][\s\S]*>/i.test(raw)) {
    return sanitizeWebinarHtml(raw);
  }
  return raw
    .split(/\n\n+/)
    .map((para) => `<p>${escapeHtmlPlain(para).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

/**
 * Texto plano para etiquetas de lista (sin etiquetas HTML).
 * @param {string} html
 */
export function stripHtmlToPlain(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = String(html ?? "");
  return (tmp.textContent || tmp.innerText || "").replace(/\s+/g, " ").trim();
}

/**
 * @param {HTMLElement} toolbarHost
 * @param {HTMLElement} editorEl
 * @param {{ onChange?: () => void }} [opts]
 */
export function bindRichToolbar(toolbarHost, editorEl, opts = {}) {
  const { onChange } = opts;
  toolbarHost.innerHTML = "";
  toolbarHost.classList.add("webinars-rich-toolbar");

  const mkBtn = (label, title, cmd, val = null) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "webinars-rich-toolbar__btn";
    b.textContent = label;
    b.title = title;
    b.addEventListener("mousedown", (e) => e.preventDefault());
    b.addEventListener("click", () => {
      editorEl.focus();
      try {
        // false => <b>, <i>, <u> en lugar de <span style="...">, compatible con sanitize y correo
        document.execCommand("styleWithCSS", false, "false");
      } catch {
        /* ignore */
      }
      if (val != null) {
        document.execCommand(cmd, false, val);
      } else {
        document.execCommand(cmd, false);
      }
      onChange?.();
    });
    return b;
  };

  toolbarHost.append(
    mkBtn("B", "Negrita", "bold"),
    mkBtn("I", "Cursiva", "italic"),
    mkBtn("U", "Subrayado", "underline"),
    mkBtn("◧", "Alinear izquierda", "justifyLeft"),
    mkBtn("▣", "Centrar", "justifyCenter"),
    mkBtn("◨", "Alinear derecha", "justifyRight"),
    mkBtn("≡", "Justificar", "justifyFull")
  );
}

/**
 * @param {HTMLElement} editorEl
 * @param {{ onInput: (html: string) => void }} opts
 */
export function bindRichEditorInput(editorEl, opts) {
  const run = () => {
    opts.onInput(sanitizeWebinarHtml(editorEl.innerHTML));
  };
  editorEl.addEventListener("input", run);
  editorEl.addEventListener("blur", run);
  return () => {
    editorEl.removeEventListener("input", run);
    editorEl.removeEventListener("blur", run);
  };
}

/**
 * Texto del botón CTA en correo: evita párrafos o divs a ancho completo que
 * empujan el icono a su propia línea. Mantiene negrita/cursiva/subrayado en línea con el logo.
 * Requiere DOM (navegador); el HTML de entrada debe estar ya sanitizado.
 * @param {string} sanitizedHtml
 */
export function emailCtaButtonLabelInline(sanitizedHtml) {
  const raw = String(sanitizedHtml ?? "").trim();
  if (!raw) return "";
  if (typeof document === "undefined") return raw;
  const tmp = document.createElement("div");
  tmp.innerHTML = raw;
  tmp.querySelectorAll("br").forEach((br) => {
    br.replaceWith(document.createTextNode(" "));
  });
  tmp.querySelectorAll("p, div").forEach((el) => {
    const span = document.createElement("span");
    span.setAttribute("style", "display:inline;margin:0;padding:0;");
    while (el.firstChild) span.appendChild(el.firstChild);
    el.replaceWith(span);
  });
  return sanitizeWebinarHtml(tmp.innerHTML);
}

/**
 * Inserta HTML sanitizado en el correo (título / párrafo con estilos base).
 * @param {string} innerHtml
 * @param {string} wrapperStyle
 */
export function emailSanitizedBlock(innerHtml, wrapperStyle) {
  const clean = sanitizeWebinarHtml(htmlFromPlainOrSanitized(String(innerHtml ?? "")));
  if (!clean) return "";
  return `<div style="${wrapperStyle}">${clean}</div>`;
}

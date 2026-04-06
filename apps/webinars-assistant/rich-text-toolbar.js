import DOMPurify from "dompurify";

/** @type {boolean} */
let purifyHooksInstalled = false;

function installPurifyHooks() {
  if (purifyHooksInstalled) return;
  purifyHooksInstalled = true;
  DOMPurify.addHook("uponSanitizeAttribute", (node, data) => {
    if (data.attrName !== "style") return;
    const v = String(data.attrValue || "").trim();
    const ok = /^\s*text-align:\s*(left|center|right|justify)\s*;?\s*$/i.test(v);
    if (!ok) {
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
        document.execCommand("styleWithCSS", false, "true");
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
 * Inserta HTML sanitizado en el correo (título / párrafo con estilos base).
 * @param {string} innerHtml
 * @param {string} wrapperStyle
 */
export function emailSanitizedBlock(innerHtml, wrapperStyle) {
  const clean = sanitizeWebinarHtml(htmlFromPlainOrSanitized(String(innerHtml ?? "")));
  if (!clean) return "";
  return `<div style="${wrapperStyle}">${clean}</div>`;
}

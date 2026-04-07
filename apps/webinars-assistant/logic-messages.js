import { auth, db } from "../../src/config/firebase-config.js";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import {
  getMessagingMessagesFromWebinar,
  upsertMessagingMessage,
} from "./messaging-model.js";
import { normalizeUserDoc } from "../../src/data/user-schema.js";
import {
  initWebinarsUserHeader,
  setWebinarsHeaderLoading,
  setWebinarsLoggedOutHeader,
} from "./webinars-header.js";
import {
  bindRichEditorInput,
  bindRichToolbar,
  emailSanitizedBlock,
  htmlFromPlainOrSanitized,
  sanitizeWebinarHtml,
  stripHtmlToPlain,
} from "./rich-text-toolbar.js";

let currentWebinarId = null;
let currentWebinarDoc = null;
let initialMessageIdFromUrl = null;
/** @type {string} */
let currentTemplateId = "welcome";
let currentTemplateData = null;
let selectedCtaId = null;
/** Evita resetear el inspector en cada tecla cuando el bloque seleccionado no cambia. */
let lastMsgInspectorBlockId = null;

const LOGO_HEIGHT_MIN = 80;
const LOGO_HEIGHT_MAX = 400;

/**
 * @param {unknown} value
 */
function clampMsgLogoHeightPx(value) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 80;
  return Math.min(LOGO_HEIGHT_MAX, Math.max(LOGO_HEIGHT_MIN, Math.round(n)));
}

/**
 * @param {number} v
 */
function syncMsgLogoHeightControls(v) {
  const range = document.getElementById("msg-logo-height");
  const num = document.getElementById("msg-logo-height-num");
  const out = document.getElementById("msg-logo-height-value");
  const clamped = clampMsgLogoHeightPx(v);
  if (range) range.value = String(clamped);
  if (num) num.value = String(clamped);
  if (out) out.textContent = String(clamped);
  return clamped;
}

const CTA_BLOCK_TYPES = new Set([
  "zoom",
  "youtube",
  "instagram",
  "facebook",
  "whatsapp",
  "linkedin",
  "generic",
]);

/**
 * @param {string} [type]
 * @returns {boolean}
 */
function isCtaBlockType(type) {
  return CTA_BLOCK_TYPES.has(String(type || ""));
}

/**
 * @param {unknown} c
 * @param {string} fallback
 */
function sanitizeHexColor(c, fallback) {
  const s = String(c ?? "").trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(s)) return s;
  if (/^#[0-9A-Fa-f]{3}$/.test(s)) {
    return (
      "#" + s[1] + s[1] + s[2] + s[2] + s[3] + s[3]
    ).toLowerCase();
  }
  return fallback;
}

/**
 * @param {string} [key]
 */
function ctaFontFamilyCss(key) {
  const map = {
    montserrat: "'Montserrat', 'Trebuchet MS', Arial, sans-serif",
    poppins: "'Poppins', Arial, Helvetica, sans-serif",
    georgia: "Georgia, 'Times New Roman', serif",
    arial: "Arial, Helvetica, sans-serif",
  };
  const k = map[key] ? key : "montserrat";
  return map[k];
}

/**
 * @param {Record<string, unknown>} block
 */
function getCtaBlockStyle(block) {
  const fontKey = ["montserrat", "poppins", "georgia", "arial"].includes(
    /** @type {string} */ (block.ctaFontFamily)
  )
    ? /** @type {"montserrat"|"poppins"|"georgia"|"arial"} */ (block.ctaFontFamily)
    : "montserrat";
  return {
    caption: typeof block.ctaCaption === "string" ? block.ctaCaption : "",
    captionColor: sanitizeHexColor(block.ctaCaptionColor, "#F4F0ED"),
    zoomMetaColor: sanitizeHexColor(block.ctaZoomMetaColor, "#FFFFFF"),
    boxBg: sanitizeHexColor(block.ctaBoxBg, "#2A2C2C"),
    boxBorder: sanitizeHexColor(block.ctaBoxBorderColor, "#A89F8F"),
    fontKey,
    fontCss: ctaFontFamilyCss(fontKey),
  };
}

const els = {
  guard: document.getElementById("webinars-access-guard"),
  builder: document.getElementById("webinars-messages-builder"),
  toast: document.getElementById("msg-toast"),

  msgName: document.getElementById("msg-name"),
  enabled: document.getElementById("msg-template-enabled"),
  sendFormat: document.getElementById("msg-send-format"),
  autoTrigger: document.getElementById("msg-auto-trigger"),
  scheduledAt: document.getElementById("msg-scheduled-at"),
  autoWrap: document.getElementById("msg-auto-wrap"),
  scheduledWrap: document.getElementById("msg-scheduled-wrap"),
  subject: document.getElementById("msg-subject"),
  
  logoUrl: document.getElementById("msg-logo-url"),
  logoHeight: document.getElementById("msg-logo-height"),
  logoHeightOut: document.getElementById("msg-logo-height-value"),
  headerColor: document.getElementById("msg-header-color"),
  footerColor: document.getElementById("msg-footer-color"),
  bgColor: document.getElementById("msg-bg-color"),
  contentColor: document.getElementById("msg-content-color"),
  btnColor: document.getElementById("msg-btn-color"),
  btnTextColor: document.getElementById("msg-btn-text-color"),
  titleColor: document.getElementById("msg-title-color"),
  textColor: document.getElementById("msg-text-color"),
  
  blockList: document.getElementById("msg-block-list"),
  blockInspector: document.getElementById("msg-block-inspector"),
  blockInspectorPark: document.getElementById("msg-block-inspector-park"),
  
  blockContentField: document.getElementById("msg-block-content-field"),
  blockContentLabel: document.getElementById("msg-block-content-label"),
  blockContent: document.getElementById("msg-block-content"),
  
  blockListTypeField: document.getElementById("msg-block-list-type-field"),
  blockListType: document.getElementById("msg-block-list-type"),
  
  blockUrlField: document.getElementById("msg-block-url-field"),
  blockUrl: document.getElementById("msg-block-url"),
  
  blockZoomFields: document.getElementById("msg-block-zoom-fields"),
  blockZoomId: document.getElementById("msg-block-zoom-id"),
  blockZoomPwd: document.getElementById("msg-block-zoom-pwd"),

  blockCtaCaptionField: document.getElementById("msg-block-cta-caption-field"),
  blockCtaStyleHint: document.getElementById("msg-block-cta-style-hint"),
  blockCtaRowBox: document.getElementById("msg-block-cta-row-box"),
  blockCtaRowColors: document.getElementById("msg-block-cta-row-colors"),
  blockCtaMetaColorField: document.getElementById("msg-block-cta-meta-color-field"),
  blockCtaZoomMetaColor: document.getElementById("msg-block-cta-zoom-meta-color"),
  blockCtaFontField: document.getElementById("msg-block-cta-font-field"),
  blockCtaCaptionColor: document.getElementById("msg-block-cta-caption-color"),
  blockCtaFont: document.getElementById("msg-block-cta-font"),
  blockCtaBoxBg: document.getElementById("msg-block-cta-box-bg"),
  blockCtaBoxBorder: document.getElementById("msg-block-cta-box-border"),

  previewRoot: document.getElementById("msg-final-preview-root"),
};

function init() {
  const params = new URLSearchParams(window.location.search);
  currentWebinarId = params.get("id");
  initialMessageIdFromUrl = params.get("messageId");

  if (!currentWebinarId) {
    renderGuard("No se especificó un formulario. Vuelve al dashboard.");
    return;
  }

  setWebinarsHeaderLoading("Verificando…");

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      setWebinarsLoggedOutHeader();
      renderGuard("Debes iniciar sesión para ver esta página.");
      return;
    }
    try {
      const userSnap = await getDoc(doc(db, "usuarios", user.uid));
      if (userSnap.exists()) {
        const profile = normalizeUserDoc(userSnap.data(), user.uid);
        await initWebinarsUserHeader(user, profile);
      }
    } catch {
      /* header opcional */
    }
    await loadWebinarData(user);
    bindEvents();
  });
}

async function loadWebinarData(user) {
  try {
    const docRef = doc(db, "webinars", currentWebinarId);
    const snap = await getDoc(docRef);
    
    if (!snap.exists()) {
      renderGuard("El formulario no existe.");
      return;
    }
    
    const data = snap.data();
    if (data.createdBy?.uid !== user.uid) {
      renderGuard("No tienes permiso para editar este formulario.");
      return;
    }
    
    currentWebinarDoc = data;

    if (!currentWebinarDoc.messaging) {
      currentWebinarDoc.messaging = { enabled: false, templates: {}, messages: [] };
    }
    if (!currentWebinarDoc.messaging.templates) {
      currentWebinarDoc.messaging.templates = {};
    }

    const list = getMessagingMessagesFromWebinar(currentWebinarDoc);
    const fromUrl = initialMessageIdFromUrl;
    currentTemplateId =
      (typeof fromUrl === "string" && list.some((m) => m.id === fromUrl) && fromUrl) ||
      list[0]?.id ||
      "welcome";

    const back = document.getElementById("btn-msg-back-builder");
    if (back && currentWebinarId) {
      back.href = `./form-messages.html?id=${encodeURIComponent(currentWebinarId)}`;
    }
    const entriesLink = document.getElementById("msg-link-entries");
    if (entriesLink && currentWebinarId) {
      entriesLink.href = `./entries.html?id=${encodeURIComponent(currentWebinarId)}`;
      entriesLink.hidden = false;
    }

    els.guard.hidden = true;
    els.builder.hidden = false;

    loadTemplate(currentTemplateId);
  } catch (error) {
    console.error("Error loading webinar:", error);
    renderGuard("Error al cargar los datos del formulario.");
  }
}

function toDatetimeLocalValue(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function syncSendFormatUi() {
  if (!els.autoWrap || !els.scheduledWrap || !els.sendFormat || !els.autoTrigger) return;
  const manual = els.sendFormat.value === "manual";
  els.autoWrap.hidden = manual;
  els.scheduledWrap.hidden = manual || els.autoTrigger.value !== "scheduled";
}

function loadTemplate(templateId) {
  currentTemplateId = templateId;

  const list = getMessagingMessagesFromWebinar(currentWebinarDoc);
  const src = list.find((m) => m.id === templateId);

  const defaultTemplate = {
    id: templateId,
    name: "Mensaje",
    enabled: false,
    sendFormat: "automatic",
    automaticTrigger: "registration",
    scheduledAt: null,
    subject: "",
    design: {
      logoUrl: "",
      logoHeight: currentWebinarDoc.branding?.logoHeight || 80,
      headerColor: currentWebinarDoc.branding?.headerColor || "#173862",
      footerColor: currentWebinarDoc.branding?.footerColor || "#102742",
      backgroundColor: "#2A2C2C",
      contentColor: "#173862",
      btnColor: "#173862",
      btnTextColor: "#ffffff",
      titleColor: "#FFFFFF",
      textColor: "#F4F0ED",
    },
    blocks: [],
    bodyHtml: "",
  };

  currentTemplateData = src
    ? /** @type {Record<string, unknown>} */ (structuredClone(src))
    : { ...defaultTemplate };

  if (!currentTemplateData.blocks) {
    currentTemplateData.blocks = [];
    if (currentTemplateData.bodyHtml) {
      currentTemplateData.blocks.push({
        id: "blk_" + Date.now() + "_text",
        type: "text",
        content: currentTemplateData.bodyHtml,
      });
    }
    if (currentTemplateData.ctaLinks && currentTemplateData.ctaLinks.length > 0) {
      currentTemplateData.ctaLinks.forEach((cta) => {
        currentTemplateData.blocks.push({
          id: cta.id,
          type: cta.type,
          content: cta.label,
          url: cta.url,
          meetingId: cta.meetingId,
          meetingPassword: cta.meetingPassword,
        });
      });
    }
  }

  if (els.msgName) els.msgName.value = String(currentTemplateData.name || "");
  els.enabled.checked = Boolean(currentTemplateData.enabled);
  if (els.sendFormat) {
    els.sendFormat.value =
      currentTemplateData.sendFormat === "manual" ? "manual" : "automatic";
  }
  if (els.autoTrigger) {
    els.autoTrigger.value =
      currentTemplateData.automaticTrigger === "scheduled" ? "scheduled" : "registration";
  }
  if (els.scheduledAt) {
    const ts = currentTemplateData.scheduledAt;
    const date =
      ts && typeof ts.toDate === "function"
        ? ts.toDate()
        : ts && typeof ts.seconds === "number"
          ? new Date(ts.seconds * 1000)
          : null;
    els.scheduledAt.value = date ? toDatetimeLocalValue(date) : "";
  }

  els.subject.value = currentTemplateData.subject || "";

  els.logoUrl.value = currentTemplateData.design?.logoUrl || "";
  
  const lh = clampMsgLogoHeightPx(
    currentTemplateData.design?.logoHeight ||
      currentWebinarDoc.branding?.logoHeight ||
      currentWebinarDoc.branding?.logoMaxHeightPx ||
      80
  );
  syncMsgLogoHeightControls(lh);

  const footerEd = document.getElementById("msg-footer-editable");
  if (footerEd && currentWebinarDoc?.branding) {
    const b = /** @type {Record<string, unknown>} */ (currentWebinarDoc.branding);
    const fh = String(b.footerHtml || "").trim();
    const ft = String(b.footerText || "").trim();
    footerEd.innerHTML = fh
      ? sanitizeWebinarHtml(fh)
      : htmlFromPlainOrSanitized(ft || "© MAP");
  }

  els.headerColor.value = currentTemplateData.design?.headerColor || "#173862";
  els.footerColor.value = currentTemplateData.design?.footerColor || "#102742";
  els.bgColor.value = currentTemplateData.design?.backgroundColor || "#2A2C2C";
  els.contentColor.value = currentTemplateData.design?.contentColor || "#173862";
  els.btnColor.value = currentTemplateData.design?.btnColor || "#173862";
  els.btnTextColor.value = currentTemplateData.design?.btnTextColor || "#ffffff";
  els.titleColor.value = currentTemplateData.design?.titleColor || "#FFFFFF";
  els.textColor.value = currentTemplateData.design?.textColor || "#F4F0ED";

  syncSendFormatUi();
  selectedCtaId = null;
  lastMsgInspectorBlockId = null;
  renderBlockList();
  updatePreview();
}

function readFormIntoTemplate() {
  if (!currentTemplateData) return;

  if (els.msgName) {
    currentTemplateData.name = els.msgName.value.trim() || currentTemplateData.name || "Mensaje";
  }
  currentTemplateData.enabled = els.enabled.checked;
  currentTemplateData.sendFormat =
    els.sendFormat?.value === "manual" ? "manual" : "automatic";
  currentTemplateData.automaticTrigger =
    els.autoTrigger?.value === "scheduled" ? "scheduled" : "registration";
  const dt = els.scheduledAt?.value;
  if (dt && currentTemplateData.automaticTrigger === "scheduled") {
    currentTemplateData.scheduledAt = Timestamp.fromDate(new Date(dt));
  } else {
    currentTemplateData.scheduledAt = null;
  }
  currentTemplateData.subject = els.subject.value;
  currentTemplateData.mode =
    currentTemplateData.sendFormat === "manual" ? "manual" : "automatic";

  const logoRange = document.getElementById("msg-logo-height");
  const logoNum = document.getElementById("msg-logo-height-num");
  const logoSrc =
    logoNum && document.activeElement === logoNum ? logoNum.value : logoRange?.value;
  const logoH = clampMsgLogoHeightPx(logoSrc);

  const footerEd = document.getElementById("msg-footer-editable");
  if (footerEd && currentWebinarDoc) {
    const html = sanitizeWebinarHtml(footerEd.innerHTML);
    if (!currentWebinarDoc.branding) currentWebinarDoc.branding = {};
    /** @type {Record<string, unknown>} */
    const br = currentWebinarDoc.branding;
    br.footerHtml = html;
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    br.footerText = (tmp.textContent || "").trim() || "© MAP";
  }

  currentTemplateData.design = {
    logoUrl: els.logoUrl.value,
    logoHeight: logoH,
    headerColor: els.headerColor.value,
    footerColor: els.footerColor.value,
    backgroundColor: els.bgColor.value,
    contentColor: els.contentColor.value,
    btnColor: els.btnColor.value,
    btnTextColor: els.btnTextColor.value,
    titleColor: els.titleColor.value,
    textColor: els.textColor.value,
  };

  if (selectedCtaId && currentTemplateData.blocks) {
    const block = currentTemplateData.blocks.find((b) => b.id === selectedCtaId);
    const msgEd = document.getElementById("msg-block-content-editable");
    const richStack = document.getElementById("msg-block-rich-stack");
    const msgCapEd = document.getElementById("msg-block-cta-caption-editable");
    if (block && msgEd && richStack && !richStack.hidden) {
      if (["title", "text"].includes(block.type) || isCtaBlockType(block.type)) {
        block.content = sanitizeWebinarHtml(msgEd.innerHTML);
      }
    }
    if (block && msgCapEd && isCtaBlockType(block.type)) {
      block.ctaCaption = sanitizeWebinarHtml(msgCapEd.innerHTML);
    }
  }
}

function parkMsgBlockInspector() {
  if (els.blockInspector && els.blockInspectorPark) {
    els.blockInspectorPark.appendChild(els.blockInspector);
  }
}

function attachMsgBlockInspectorUnderSelectedRow() {
  if (!els.blockInspector || !els.blockInspectorPark) return;

  if (els.blockInspector.hidden || !selectedCtaId) {
    parkMsgBlockInspector();
    return;
  }

  const safeId =
    typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape(selectedCtaId)
      : String(selectedCtaId).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const item = document.querySelector(
    `li.builder-field-item.msg-block-item[data-block-id="${safeId}"]`
  );
  if (item) {
    item.appendChild(els.blockInspector);
  } else {
    parkMsgBlockInspector();
  }
}

/**
 * @param {{ id: string, type: string, content?: string, url?: string, listType?: string, meetingId?: string, meetingPassword?: string, ctaCaption?: string, ctaCaptionColor?: string, ctaZoomMetaColor?: string, ctaBoxBg?: string, ctaBoxBorderColor?: string, ctaFontFamily?: string }} block
 */
function fillMsgBlockInspectorForm(block) {
  els.blockContentField.style.display = "none";
  els.blockListTypeField.style.display = "none";
  els.blockUrlField.style.display = "none";
  els.blockZoomFields.style.display = "none";

  if (els.blockCtaCaptionField) els.blockCtaCaptionField.style.display = "none";
  if (els.blockCtaStyleHint) els.blockCtaStyleHint.style.display = "none";
  if (els.blockCtaRowBox) els.blockCtaRowBox.style.display = "none";
  if (els.blockCtaRowColors) els.blockCtaRowColors.style.display = "none";
  if (els.blockCtaFontField) els.blockCtaFontField.style.display = "none";
  if (els.blockCtaMetaColorField) els.blockCtaMetaColorField.style.display = "none";

  const richStack = document.getElementById("msg-block-rich-stack");
  const ed = document.getElementById("msg-block-content-editable");
  const ta = els.blockContent;
  const capEd = document.getElementById("msg-block-cta-caption-editable");

  if (["title", "text", "list"].includes(block.type)) {
    els.blockContentField.style.display = "block";

    if (block.type === "list") {
      if (richStack) richStack.hidden = true;
      if (ta) {
        ta.style.display = "block";
        ta.value = block.content || "";
      }
      els.blockContentLabel.textContent = "Contenido";
      els.blockListTypeField.style.display = "block";
      els.blockListType.value = block.listType || "bullets";
    } else {
      if (richStack) richStack.hidden = false;
      if (ta) ta.style.display = "none";
      els.blockContentLabel.textContent =
        block.type === "title" ? "Texto del título" : "Contenido";
      if (ed) ed.innerHTML = htmlFromPlainOrSanitized(block.content || "");
    }
  } else {
    if (richStack) richStack.hidden = false;
    if (ta) ta.style.display = "none";
    els.blockContentField.style.display = "block";
    els.blockContentLabel.textContent = "Texto del botón";
    if (ed) ed.innerHTML = htmlFromPlainOrSanitized(block.content || "");

    els.blockUrlField.style.display = "block";
    els.blockUrl.value = block.url || "";

    if (block.type === "zoom") {
      els.blockZoomFields.style.display = "grid";
      els.blockZoomId.value = block.meetingId || "";
      els.blockZoomPwd.value = block.meetingPassword || "";
    }

    if (isCtaBlockType(block.type)) {
      const st = getCtaBlockStyle(/** @type {Record<string, unknown>} */ (block));
      if (els.blockCtaCaptionField) els.blockCtaCaptionField.style.display = "block";
      if (els.blockCtaStyleHint) els.blockCtaStyleHint.style.display = "block";
      if (els.blockCtaRowBox) els.blockCtaRowBox.style.display = "grid";
      if (els.blockCtaRowColors) {
        els.blockCtaRowColors.style.display = "grid";
        els.blockCtaRowColors.style.gridTemplateColumns =
          block.type === "zoom" ? "1fr 1fr" : "1fr";
      }
      if (els.blockCtaFontField) els.blockCtaFontField.style.display = "block";
      if (els.blockCtaMetaColorField) {
        els.blockCtaMetaColorField.style.display =
          block.type === "zoom" ? "block" : "none";
      }
      if (capEd) capEd.innerHTML = htmlFromPlainOrSanitized(st.caption);
      if (els.blockCtaCaptionColor) els.blockCtaCaptionColor.value = st.captionColor;
      if (els.blockCtaZoomMetaColor) els.blockCtaZoomMetaColor.value = st.zoomMetaColor;
      if (els.blockCtaFont) els.blockCtaFont.value = st.fontKey;
      if (els.blockCtaBoxBg) els.blockCtaBoxBg.value = st.boxBg;
      if (els.blockCtaBoxBorder) els.blockCtaBoxBorder.value = st.boxBorder;
    }
  }
}

function syncMsgBlockInspector() {
  if (!els.blockInspector) return;

  const block = selectedCtaId
    ? currentTemplateData.blocks.find((c) => c.id === selectedCtaId)
    : null;

  if (!block) {
    els.blockInspector.hidden = true;
    lastMsgInspectorBlockId = null;
    parkMsgBlockInspector();
    return;
  }

  els.blockInspector.hidden = false;

  if (lastMsgInspectorBlockId !== block.id) {
    lastMsgInspectorBlockId = block.id;
    fillMsgBlockInspectorForm(block);
  }

  attachMsgBlockInspectorUnderSelectedRow();
}

function renderBlockList() {
  if (!currentTemplateData?.blocks) return;

  parkMsgBlockInspector();

  if (
    selectedCtaId &&
    !currentTemplateData.blocks.some((b) => b.id === selectedCtaId)
  ) {
    selectedCtaId = null;
    lastMsgInspectorBlockId = null;
  }

  els.blockList.innerHTML = currentTemplateData.blocks
    .map((block) => {
      let label = stripHtmlToPlain(block.content || "") || "Sin texto";
      if (label.length > 30) label = label.substring(0, 30) + "...";
      const selRow =
        selectedCtaId === block.id ? " builder-field-row--selected" : "";
      const selItem =
        selectedCtaId === block.id ? " builder-field-item--selected" : "";
      return `
    <li class="builder-field-item msg-block-item${selItem}" data-block-id="${escapeAttr(block.id)}">
      <div class="builder-field-row${selRow}">
      <div
        class="builder-field-row__main"
        role="button"
        tabindex="0"
        data-select-block="${escapeAttr(block.id)}"
        aria-pressed="${selectedCtaId === block.id ? "true" : "false"}"
      >
        <span class="builder-field-row__type">${escapeHtml(block.type)}</span>
        <span class="builder-field-row__label">${escapeHtml(label)}</span>
      </div>
      <div class="builder-field-row__actions">
        <button type="button" class="btn-builder-move" data-move-block="${escapeAttr(block.id)}" data-dir="up" aria-label="Subir">↑</button>
        <button type="button" class="btn-builder-move" data-move-block="${escapeAttr(block.id)}" data-dir="down" aria-label="Bajar">↓</button>
        <button type="button" class="btn-builder-remove" data-remove-block="${escapeAttr(block.id)}">Quitar</button>
      </div>
      </div>
    </li>
  `;
    })
    .join("");

  syncMsgBlockInspector();
}

function buildEmailHtmlString() {
  const d = currentTemplateData.design;
  let logo = d.logoUrl || currentWebinarDoc.branding?.logoUrl || "https://luiscalvo-chino.github.io/Chino-PC-Master/imagenes/MAP%20Logo.png";
  
  if (logo.startsWith("../../") || logo.startsWith("/")) {
    try {
      logo = new URL(logo, window.location.origin).href;
    } catch (e) {
      logo = "https://luiscalvo-chino.github.io/Chino-PC-Master/imagenes/MAP%20Logo.png";
    }
  }

  let blocksHtml = "";
  if (currentTemplateData.blocks && currentTemplateData.blocks.length > 0) {
    blocksHtml = currentTemplateData.blocks.map(block => {
      if (block.type === 'title') {
        return emailSanitizedBlock(
          block.content || "Nuevo Título",
          `color: ${d.titleColor || "#FFFFFF"}; font-family: 'Montserrat', 'Trebuchet MS', Arial, sans-serif; font-weight: 700; font-size: 1.25rem; margin-top: 25px; margin-bottom: 15px;`
        );
      } else if (block.type === 'text') {
        return emailSanitizedBlock(
          block.content || "Texto del párrafo...",
          `color: ${d.textColor || "#F4F0ED"}; font-family: 'Poppins', Arial, sans-serif; font-size: 16px; line-height: 1.6; margin-bottom: 15px;`
        );
      } else if (block.type === 'list') {
        const items = (block.content || '').split('\n').filter(line => line.trim() !== '');
        const listTag = block.listType === 'numbers' ? 'ol' : 'ul';
        const lis = items.map(item => `<li style="margin-bottom: 8px;">${escapeHtml(item)}</li>`).join('');
        return `<${listTag} style="color: ${d.textColor || '#F4F0ED'}; font-family: 'Poppins', Arial, sans-serif; font-size: 16px; line-height: 1.6; margin-bottom: 15px; padding-left: 20px;">${lis}</${listTag}>`;
      } else {
        // Es un botón
        const st = getCtaBlockStyle(/** @type {Record<string, unknown>} */ (block));
        const captionInner = sanitizeWebinarHtml(
          htmlFromPlainOrSanitized(st.caption)
        );
        const captionHtml = stripHtmlToPlain(captionInner)
          ? `<div style="margin:0 0 14px 0;font-size:14px;line-height:1.45;color:${st.captionColor};font-family:${st.fontCss};text-align:center;">${captionInner}</div>`
          : "";

        let bgColor = d.btnColor;
        let textColor = d.btnTextColor;
        let iconUrl = "";
        let extraHtml = "";
        
        // Configuración por marca
        if (block.type === "zoom") {
          bgColor = "#2D8CFF";
          textColor = "#FFFFFF";
          iconUrl = "https://luiscalvo-chino.github.io/Chino-PC-Master/imagenes/Icono%20Zoom.png";
          
          if (block.meetingId || block.meetingPassword) {
            const mc = st.zoomMetaColor;
            extraHtml = `<span style="font-size: 12px; color: ${mc}; display: block; text-align: center; margin-top: 15px;">`;
            if (block.meetingId) extraHtml += `ID: ${escapeHtml(block.meetingId)}`;
            if (block.meetingId && block.meetingPassword) extraHtml += ` | `;
            if (block.meetingPassword) extraHtml += `Código: ${escapeHtml(block.meetingPassword)}`;
            extraHtml += `</span>`;
          }
        } else if (block.type === "instagram") {
          bgColor = "#dc2743"; 
          textColor = "#FFFFFF";
          iconUrl = "https://luiscalvo-chino.github.io/Chino-PC-Master/imagenes/Icono%20Instagram.png";
        } else if (block.type === "facebook") {
          bgColor = "#1877F2";
          textColor = "#FFFFFF";
          iconUrl = "https://luiscalvo-chino.github.io/Chino-PC-Master/imagenes/Icono%20Facebook.png";
        } else if (block.type === "whatsapp") {
          bgColor = "#25D366";
          textColor = "#FFFFFF";
          iconUrl = "https://luiscalvo-chino.github.io/Chino-PC-Master/imagenes/Icono%20WhatsApp.png";
        } else if (block.type === "linkedin") {
          bgColor = "#0A66C2";
          textColor = "#FFFFFF";
          iconUrl = "https://luiscalvo-chino.github.io/Chino-PC-Master/imagenes/Icono%20LinkedIn.png";
        } else if (block.type === "youtube") {
          bgColor = "#FF0000";
          textColor = "#FFFFFF";
        }
        
        let btnStyle = `display:inline-block;padding:15px 25px;background-color:transparent;color:${textColor};text-decoration:none;font-family:${st.fontCss};font-weight:bold;font-size:16px;`;
        
        if (block.type === "instagram") {
          btnStyle = `display:inline-block;padding:15px 25px;background-color:transparent;color:${textColor};text-decoration:none;font-family:${st.fontCss};font-weight:bold;font-size:16px;`;
        }

        let iconHtml = iconUrl ? `<img src="${iconUrl}" width="30" style="vertical-align: middle; margin-right: 10px; border: 0;" alt="Icono">` : "";

        const btnLabelHtml = sanitizeWebinarHtml(
          htmlFromPlainOrSanitized(String(block.content || block.type))
        );

        return `
          <table width="100%" border="0" cellpadding="0" cellspacing="0" class="info-box" style="background-color: ${st.boxBg}; border-left: 4px solid ${st.boxBorder}; padding: 20px; margin: 25px 0;">
            <tr>
              <td style="padding: 10px; text-align: center;">
                ${captionHtml}
                <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto; background-color: ${bgColor}; border-radius: 8px; ${block.type === 'instagram' ? 'background: linear-gradient(45deg, #f09433, #dc2743, #bc1888);' : ''}">
                  <tr>
                    <td align="center" style="border-bottom: 4px solid ${block.type === 'instagram' ? '#a11575' : block.type === 'zoom' ? '#173862' : 'rgba(0,0,0,0.2)'}; border-radius: 8px;">
                      <a href="${escapeAttr(block.url || '#')}" target="_blank" style="${btnStyle}">
                        ${iconHtml}${btnLabelHtml || escapeHtml(String(block.content || block.type))}
                      </a>
                    </td>
                  </tr>
                </table>
                ${extraHtml}
              </td>
            </tr>
          </table>
        `;
      }
    }).join("");
  }

  const logoHeight = clampMsgLogoHeightPx(
    d.logoHeight || currentWebinarDoc.branding?.logoHeight || currentWebinarDoc.branding?.logoMaxHeightPx || 80
  );

  const br = /** @type {Record<string, unknown>} */ (currentWebinarDoc.branding || {});
  const footerHtmlRaw = String(br.footerHtml || "").trim();
  const footerInner = footerHtmlRaw
    ? sanitizeWebinarHtml(footerHtmlRaw)
    : `<span style="white-space: pre-wrap;">${escapeHtml(String(br.footerText || "© MAP"))}</span>`;

  return `
    <div style="background-color: ${d.backgroundColor}; padding: 20px; font-family: 'Poppins', 'Helvetica Neue', Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: ${d.contentColor}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background-color: ${d.headerColor}; padding: 30px; text-align: center;">
          <img src="${logo}" alt="Logo" style="max-height: ${logoHeight}px; max-width: 100%; display: block; margin: 0 auto;">
        </div>
        <div style="padding: 40px 30px; color: #333;">
          ${blocksHtml}
        </div>
        <div style="background-color: ${d.footerColor}; padding: 30px; text-align: center; color: #fff; font-size: 14px; border-top: 1px solid ${d.footerColor};">
          ${footerInner}
        </div>
      </div>
    </div>
  `;
}

function updatePreview() {
  readFormIntoTemplate();
  els.previewRoot.innerHTML = buildEmailHtmlString();
  const subjLine = document.getElementById("msg-preview-subject-line");
  if (subjLine) {
    const s = String(currentTemplateData.subject || "").trim();
    subjLine.textContent = s
      ? `Asunto del correo (solo en la bandeja de entrada, no dentro del mensaje): ${s}`
      : "";
  }
}

async function saveChanges() {
  readFormIntoTemplate();
  currentTemplateData.bodyHtml = buildEmailHtmlString();

  const statusEl = document.getElementById("msg-action-status");
  statusEl.textContent = "Guardando...";
  statusEl.className = "webinars-builder-status";

  const msgs = getMessagingMessagesFromWebinar(currentWebinarDoc);
  const merged = upsertMessagingMessage(msgs, {
    ...currentTemplateData,
    id: currentTemplateId,
  });

  const messagingClean = {
    enabled: true,
    templates: currentWebinarDoc.messaging?.templates || {},
    messages: merged,
  };

  try {
    const prevBr =
      currentWebinarDoc.branding && typeof currentWebinarDoc.branding === "object"
        ? currentWebinarDoc.branding
        : {};
    await updateDoc(doc(db, "webinars", currentWebinarId), {
      messaging: messagingClean,
      branding: { ...prevBr },
      updatedAt: serverTimestamp(),
    });
    currentWebinarDoc.messaging = messagingClean;

    statusEl.textContent = "Cambios guardados correctamente.";
    statusEl.classList.add("webinars-builder-status--success");

    setTimeout(() => {
      statusEl.textContent = "";
      statusEl.classList.remove("webinars-builder-status--success");
    }, 3000);
  } catch (error) {
    console.error("Error saving:", error);
    statusEl.textContent = "Error al guardar los cambios.";
    statusEl.classList.add("webinars-builder-status--error");
  }
}

function bindEvents() {
  [els.sendFormat, els.autoTrigger, els.scheduledAt].forEach((input) => {
    input?.addEventListener("change", () => {
      syncSendFormatUi();
      updatePreview();
    });
  });

  const logoNum = document.getElementById("msg-logo-height-num");
  const inputs = [
    els.msgName,
    els.enabled,
    els.subject,
    els.logoUrl,
    logoNum,
    els.headerColor,
    els.footerColor,
    els.bgColor,
    els.contentColor,
    els.btnColor,
    els.btnTextColor,
    els.titleColor,
    els.textColor,
  ];
  inputs.forEach((input) => {
    if (input) {
      input.addEventListener("input", updatePreview);
      input.addEventListener("change", updatePreview);
    }
  });

  const syncMsgLogoFromControls = () => {
    const range = document.getElementById("msg-logo-height");
    const num = document.getElementById("msg-logo-height-num");
    const raw = num && document.activeElement === num ? num.value : range?.value;
    syncMsgLogoHeightControls(clampMsgLogoHeightPx(raw));
    updatePreview();
  };
  els.logoHeight?.addEventListener("input", syncMsgLogoFromControls);
  logoNum?.addEventListener("input", syncMsgLogoFromControls);
  logoNum?.addEventListener("change", syncMsgLogoFromControls);

  document.getElementById("btn-msg-save-changes").addEventListener("click", saveChanges);

  function downloadMessagePreviewHtml() {
    readFormIntoTemplate();
    const bodyHtml = buildEmailHtmlString();
    const rawName =
      String(currentTemplateData?.name || currentTemplateId || "mensaje").trim() || "mensaje";
    const nameSafe = rawName.replace(/[^\w\u00C0-\u024F-]+/g, "_").replace(/_+/g, "_").slice(0, 80);
    const doc = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Vista previa — ${escapeHtml(rawName)}</title>
</head>
<body style="margin:0;background:#1a1a1a;">
${bodyHtml}
</body>
</html>`;
    const blob = new Blob([doc], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vista-previa-${nameSafe || "mensaje"}.html`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  document.getElementById("btn-msg-download-preview-html")?.addEventListener("click", downloadMessagePreviewHtml);
  document
    .getElementById("btn-msg-download-preview-html-toolbar")
    ?.addEventListener("click", downloadMessagePreviewHtml);

  document.getElementById("btn-msg-add-block").addEventListener("click", () => {
    const type = document.getElementById("msg-new-block-type").value;
    const id = "blk_" + Date.now();
    let defaultContent = type.toUpperCase();
    if (type === 'title') defaultContent = 'Nuevo Título';
    if (type === 'text') defaultContent = 'Escribe tu párrafo aquí...';
    if (type === 'list') defaultContent = 'Elemento 1\nElemento 2\nElemento 3';

    /** @type {Record<string, unknown>} */
    const newBlock = {
      id,
      type,
      content: defaultContent,
      url: "",
      listType: type === "list" ? "bullets" : null,
    };
    if (isCtaBlockType(type)) {
      newBlock.ctaCaption = "";
      newBlock.ctaCaptionColor = "#F4F0ED";
      newBlock.ctaZoomMetaColor = "#FFFFFF";
      newBlock.ctaBoxBg = "#2A2C2C";
      newBlock.ctaBoxBorderColor = "#A89F8F";
      newBlock.ctaFontFamily = "montserrat";
    }

    currentTemplateData.blocks.push(newBlock);
    selectedCtaId = id;
    renderBlockList();
    updatePreview();
  });
  
  els.blockList.addEventListener("click", (e) => {
    const target = e.target;
    
    const selectEl = target.closest("[data-select-block]");
    if (selectEl) {
      selectedCtaId = selectEl.getAttribute("data-select-block");
      renderBlockList();
      return;
    }
    
    const removeEl = target.closest("[data-remove-block]");
    if (removeEl) {
      const id = removeEl.getAttribute("data-remove-block");
      currentTemplateData.blocks = currentTemplateData.blocks.filter(c => c.id !== id);
      if (selectedCtaId === id) selectedCtaId = null;
      renderBlockList();
      updatePreview();
      return;
    }
    
    const moveEl = target.closest("[data-move-block]");
    if (moveEl) {
      const id = moveEl.getAttribute("data-move-block");
      const dir = moveEl.getAttribute("data-dir");
      const index = currentTemplateData.blocks.findIndex(b => b.id === id);
      if (index > -1) {
        if (dir === 'up' && index > 0) {
          const temp = currentTemplateData.blocks[index - 1];
          currentTemplateData.blocks[index - 1] = currentTemplateData.blocks[index];
          currentTemplateData.blocks[index] = temp;
        } else if (dir === 'down' && index < currentTemplateData.blocks.length - 1) {
          const temp = currentTemplateData.blocks[index + 1];
          currentTemplateData.blocks[index + 1] = currentTemplateData.blocks[index];
          currentTemplateData.blocks[index] = temp;
        }
        renderBlockList();
        updatePreview();
      }
      return;
    }
  });
  
  els.blockContent.addEventListener("input", (e) => {
    if (selectedCtaId) {
      const block = currentTemplateData.blocks.find((c) => c.id === selectedCtaId);
      if (block && block.type === "list") {
        block.content = e.target.value;
        const safeId =
          typeof CSS !== "undefined" && typeof CSS.escape === "function"
            ? CSS.escape(selectedCtaId)
            : String(selectedCtaId).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        const itemLabel = document.querySelector(
          `li.builder-field-item.msg-block-item[data-block-id="${safeId}"] .builder-field-row__label`
        );
        if (itemLabel) {
          let label = block.content || "Sin texto";
          if (label.length > 30) label = label.substring(0, 30) + "...";
          itemLabel.textContent = label;
        }
        updatePreview();
      }
    }
  });

  const msgBlockEd = document.getElementById("msg-block-content-editable");
  const msgBlockTb = document.getElementById("msg-block-rich-toolbar");
  if (msgBlockTb && msgBlockEd && msgBlockTb.dataset.mapRichBound !== "1") {
    msgBlockTb.dataset.mapRichBound = "1";
    const updateMsgBlockRowLabel = () => {
      if (!selectedCtaId) return;
      const block = currentTemplateData.blocks.find((c) => c.id === selectedCtaId);
      if (!block) return;
      const safeId =
        typeof CSS !== "undefined" && typeof CSS.escape === "function"
          ? CSS.escape(selectedCtaId)
          : String(selectedCtaId).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const itemLabel = document.querySelector(
        `li.builder-field-item.msg-block-item[data-block-id="${safeId}"] .builder-field-row__label`
      );
      if (itemLabel) {
        let label = stripHtmlToPlain(block.content || "") || "Sin texto";
        if (label.length > 30) label = label.substring(0, 30) + "...";
        itemLabel.textContent = label;
      }
    };
    const syncMsgBlockRichFromEditor = () => {
      if (!selectedCtaId) return;
      const block = currentTemplateData.blocks.find((c) => c.id === selectedCtaId);
      if (
        !block ||
        (!["title", "text"].includes(block.type) && !isCtaBlockType(block.type))
      )
        return;
      block.content = sanitizeWebinarHtml(msgBlockEd.innerHTML);
      updateMsgBlockRowLabel();
      updatePreview();
    };
    bindRichToolbar(msgBlockTb, msgBlockEd, { onChange: syncMsgBlockRichFromEditor });
    bindRichEditorInput(msgBlockEd, {
      onInput: (html) => {
        if (!selectedCtaId) return;
        const block = currentTemplateData.blocks.find((c) => c.id === selectedCtaId);
        if (
          !block ||
          (!["title", "text"].includes(block.type) && !isCtaBlockType(block.type))
        )
          return;
        block.content = html;
        updateMsgBlockRowLabel();
        updatePreview();
      },
    });
  }

  const msgCapEd = document.getElementById("msg-block-cta-caption-editable");
  const msgCapTb = document.getElementById("msg-block-cta-caption-toolbar");
  if (msgCapTb && msgCapEd && msgCapTb.dataset.mapRichBound !== "1") {
    msgCapTb.dataset.mapRichBound = "1";
    const syncCaptionFromEditor = () => {
      if (!selectedCtaId) return;
      const block = currentTemplateData.blocks.find((c) => c.id === selectedCtaId);
      if (!block || !isCtaBlockType(block.type)) return;
      block.ctaCaption = sanitizeWebinarHtml(msgCapEd.innerHTML);
      updatePreview();
    };
    bindRichToolbar(msgCapTb, msgCapEd, { onChange: syncCaptionFromEditor });
    bindRichEditorInput(msgCapEd, {
      onInput: (html) => {
        if (!selectedCtaId) return;
        const block = currentTemplateData.blocks.find((c) => c.id === selectedCtaId);
        if (!block || !isCtaBlockType(block.type)) return;
        block.ctaCaption = html;
        updatePreview();
      },
    });
  }

  const msgFootEd = document.getElementById("msg-footer-editable");
  const msgFootTb = document.getElementById("msg-footer-rich-toolbar");
  if (msgFootTb && msgFootEd && msgFootTb.dataset.mapRichBound !== "1") {
    msgFootTb.dataset.mapRichBound = "1";
    bindRichToolbar(msgFootTb, msgFootEd, { onChange: () => updatePreview() });
    bindRichEditorInput(msgFootEd, { onInput: () => updatePreview() });
  }
  
  els.blockListType.addEventListener("change", (e) => {
    if (selectedCtaId) {
      const block = currentTemplateData.blocks.find(c => c.id === selectedCtaId);
      if (block) {
        block.listType = e.target.value;
        updatePreview();
      }
    }
  });
  
  els.blockUrl.addEventListener("input", (e) => {
    if (selectedCtaId) {
      const block = currentTemplateData.blocks.find(c => c.id === selectedCtaId);
      if (block) {
        block.url = e.target.value;
        updatePreview();
      }
    }
  });

  els.blockZoomId.addEventListener("input", (e) => {
    if (selectedCtaId) {
      const block = currentTemplateData.blocks.find(c => c.id === selectedCtaId);
      if (block) {
        block.meetingId = e.target.value;
        updatePreview();
      }
    }
  });

  els.blockZoomPwd.addEventListener("input", (e) => {
    if (selectedCtaId) {
      const block = currentTemplateData.blocks.find(c => c.id === selectedCtaId);
      if (block) {
        block.meetingPassword = e.target.value;
        updatePreview();
      }
    }
  });

  const syncCtaStyle = (mutator) => {
    if (!selectedCtaId) return;
    const block = currentTemplateData.blocks.find((c) => c.id === selectedCtaId);
    if (block && isCtaBlockType(block.type)) {
      mutator(block);
      updatePreview();
    }
  };

  const onCtaColor = (prop, el) => {
    el?.addEventListener("input", (e) => {
      syncCtaStyle((b) => {
        b[prop] = e.target.value;
      });
    });
    el?.addEventListener("change", (e) => {
      syncCtaStyle((b) => {
        b[prop] = e.target.value;
      });
    });
  };

  onCtaColor("ctaCaptionColor", els.blockCtaCaptionColor);
  onCtaColor("ctaZoomMetaColor", els.blockCtaZoomMetaColor);
  onCtaColor("ctaBoxBg", els.blockCtaBoxBg);
  onCtaColor("ctaBoxBorderColor", els.blockCtaBoxBorder);

  els.blockCtaFont?.addEventListener("change", (e) => {
    syncCtaStyle((b) => {
      b.ctaFontFamily = e.target.value;
    });
  });

  // Tabs
  document.querySelectorAll("[data-msg-tab]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const tab = e.target.getAttribute("data-msg-tab");
      
      document.querySelectorAll("[data-msg-tab]").forEach(b => {
        b.classList.remove("webinars-builder-tab--active");
        b.setAttribute("aria-selected", "false");
      });
      e.target.classList.add("webinars-builder-tab--active");
      e.target.setAttribute("aria-selected", "true");
      
      document.querySelectorAll(".webinars-builder-tabpanel").forEach(p => {
        p.hidden = true;
        p.classList.add("webinars-builder-tabpanel--hidden");
      });
      
      const panel = document.getElementById(`msg-panel-${tab}`);
      if (panel) {
        panel.hidden = false;
        panel.classList.remove("webinars-builder-tabpanel--hidden");
      }
    });
  });
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;");
}

function renderGuard(message) {
  if (els.guard) {
    els.guard.hidden = false;
    els.guard.innerHTML = `
      <h2>Acceso restringido</h2>
      <p>${message}</p>
      <p><a class="webapp-card__link" href="../../index.html">Volver al portal principal</a></p>
    `;
  }
  if (els.builder) els.builder.hidden = true;
}

init();

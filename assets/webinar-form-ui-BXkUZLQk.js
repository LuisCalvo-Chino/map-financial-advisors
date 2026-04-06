import{d as m,h as C}from"./webinars-header-CRS18hlg.js";const T="../../img/MAP Logo.png";function E(e){return String(e||"").trim()||T}function B(){const e=new Uint8Array(16);return crypto.getRandomValues(e),Array.from(e,t=>t.toString(16).padStart(2,"0")).join("")}function G(e){return String(e||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,80)||"webinar"}const P=80,F=400,j=180;function H(e){const t=typeof e=="number"?e:Number(e);return Number.isFinite(t)?Math.min(F,Math.max(P,Math.round(t))):j}function i(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}function U(e){if(!e||typeof e!="object")return null;const t=typeof e.branding=="object"&&e.branding!==null?e.branding:{},u=Array.isArray(e.fields)?e.fields:[];return{titulo:typeof e.titulo=="string"?e.titulo:"",slug:typeof e.slug=="string"?e.slug:"",descripcion:typeof e.descripcion=="string"?e.descripcion:"",estado:e.estado==="published"||e.estado==="closed"||e.estado==="draft"?e.estado:"draft",publicHex:typeof e.publicHex=="string"?e.publicHex:"",branding:{logoUrl:typeof t.logoUrl=="string"?t.logoUrl:"",headerColor:typeof t.headerColor=="string"?t.headerColor:"#173862",footerColor:typeof t.footerColor=="string"?t.footerColor:"#102742",backgroundColor:typeof t.backgroundColor=="string"?t.backgroundColor:"#f4f0ed",contentColor:typeof t.contentColor=="string"?t.contentColor:"#ffffff",titleColor:typeof t.titleColor=="string"?t.titleColor:"#173862",textColor:typeof t.textColor=="string"?t.textColor:"#102742",fieldTextColor:typeof t.fieldTextColor=="string"?t.fieldTextColor:"#102742",fieldInputBackgroundColor:typeof t.fieldInputBackgroundColor=="string"?t.fieldInputBackgroundColor:"#ffffff",fieldInputTextColor:typeof t.fieldInputTextColor=="string"?t.fieldInputTextColor:"#102742",logoMaxHeightPx:H(t.logoMaxHeightPx),accentColor:typeof t.accentColor=="string"?t.accentColor:"#A89F8F",title:typeof t.title=="string"?t.title:"",subtitle:typeof t.subtitle=="string"?t.subtitle:"",footerText:typeof t.footerText=="string"?t.footerText:"",footerHtml:typeof t.footerHtml=="string"?t.footerHtml:""},fields:u.filter(n=>n&&typeof n=="object").map(n=>{const r=n;return{id:String(r.id||""),type:["text","email","phone","file","paragraph","title","static_text","list"].includes(String(r.type))?String(r.type):"text",label:String(r.label||"Campo"),placeholder:String(r.placeholder||""),content:String(r.content||""),listType:String(r.listType||"bullets"),helpText:String(r.helpText||""),required:!!r.required,order:typeof r.order=="number"?r.order:0,width:r.width==="half"?"half":"full",validation:typeof r.validation=="object"&&r.validation!==null?r.validation:{}}})}}function N(e,t,u={}){if(!e||!t)return;const{previewMode:n=!1,formId:r="webinar-public-form"}=u,l=t.branding,_=E(l.logoUrl),y=H(l.logoMaxHeightPx),S=[...t.fields].sort((o,s)=>o.order-s.order).map(o=>{const s=`fld_${String(o.id).replace(/[^a-zA-Z0-9_-]/g,"_")}`,d=o.required?"required":"",$=n?'readonly tabindex="-1"':"",x=n?"disabled":"";let a="";const p="color: var(--w-input-text); background-color: var(--w-input-bg);",f=`id="${s}" name="${i(o.id)}" class="webinars-public-input" placeholder="${i(o.placeholder)}" ${d} ${$} ${x} style="${p}"`;if(o.type==="title")return`
          <div class="webinars-public-field webinars-public-field--full">
            <div class="webinars-rich-block webinars-rich-block--title" style="color: var(--w-title); font-family: var(--font-titles); font-weight: 700; font-size: 1.25rem; margin: 1rem 0 0.5rem;">${m(C(o.content||o.label))||i(o.label)}</div>
          </div>
        `;if(o.type==="static_text")return`
          <div class="webinars-public-field webinars-public-field--full">
            <div class="webinars-rich-block" style="color: var(--w-text); font-family: var(--font-body); margin-bottom: 0.5rem;">${m(C(o.content||o.label))||i(o.label)}</div>
          </div>
        `;if(o.type==="list"){const b=(o.content||"").split(`
`).filter(g=>g.trim()!==""),v=o.listType==="numbers"?"ol":"ul",M=b.map(g=>`<li style="margin-bottom: 0.25rem;">${i(g)}</li>`).join("");return`
          <div class="webinars-public-field webinars-public-field--full">
            <${v} style="color: var(--w-text); font-family: var(--font-body); margin-bottom: 0.5rem; padding-left: 1.5rem;">${M}</${v}>
          </div>
        `}o.type==="email"?a=`<input type="email" ${f} autocomplete="email" />`:o.type==="phone"?a=`<input type="tel" ${f} autocomplete="tel" />`:o.type==="file"?a=n?`<input type="text" readonly class="webinars-public-input" value="[Archivo — vista previa]" style="${p}" />`:`<input type="file" id="${s}" name="${i(o.id)}" class="webinars-public-input" ${d} style="${p}" />`:o.type==="paragraph"?a=`<textarea ${`id="${s}" name="${i(o.id)}" class="webinars-public-input webinars-public-textarea" rows="4" placeholder="${i(o.placeholder)}" ${d} ${$} ${x} style="${p}"`}></textarea>`:a=`<input type="text" ${f} autocomplete="off" />`;const L=o.helpText?`<p class="webinars-public-help" style="color: var(--w-text);">${i(o.helpText)}</p>`:"";return`
        <div class="webinars-public-field ${o.type==="paragraph"?"webinars-public-field--full":o.width==="half"?"webinars-public-field--half":"webinars-public-field--full"}">
          <label class="webinars-public-label" for="${s}" style="color: var(--w-label);">${i(o.label)}${o.required?" *":""}</label>
          ${a}
          ${L}
        </div>
      `}).join(""),k="",h=String(l.footerHtml||"").trim(),I=h?`<div class="webinars-footer-html">${m(h)}</div>`:`<div class="webinars-footer-plain" style="white-space: pre-wrap;">${i(l.footerText||"MAP")}</div>`,A=[`--w-header:${i(l.headerColor)}`,`--w-footer:${i(l.footerColor)}`,`--w-content:${i(l.contentColor)}`,`--w-bg:${i(l.backgroundColor)}`,`--w-title:${i(l.titleColor||"#173862")}`,`--w-text:${i(l.textColor||"#102742")}`,`--w-label:${i(l.fieldTextColor||"#102742")}`,`--w-input-bg:${i(l.fieldInputBackgroundColor||"#ffffff")}`,`--w-input-text:${i(l.fieldInputTextColor||"#102742")}`].join(";");e.style.setProperty("--w-preview-bg",l.backgroundColor),e.innerHTML=`
    <section class="webinars-public-shell webinars-public-shell--embedded" style="${A}">
      <header class="webinars-public-shell__header webinars-public-shell__header--logo-only">
        <div class="webinars-public-logo-row">
          <img
            class="webinars-public-logo"
            src="${i(_)}"
            alt=""
            height="${y}"
            style="height: ${y}px; width: auto; max-width: 100%; object-fit: contain;"
          />
        </div>
      </header>
      <div class="webinars-public-shell__content">
        ${k}
        <form id="${i(r)}" class="webinars-public-form webinars-public-form--grid" novalidate>
          ${S||'<p class="webinars-public-help">Sin campos todavía.</p>'}
          <div class="webinars-form-actions webinars-public-actions">
            <button type="submit" class="btn-map-primary" ${n?"disabled":""}>
              ${n?"Enviar (solo en publicado)":"Enviar inscripción"}
            </button>
          </div>
          <p id="public-viewer-status" class="webinars-status webinars-public-form-status" aria-live="polite"></p>
        </form>
        ${n?"":`<div id="webinar-public-thanks" class="webinars-public-thanks" hidden>
          <p class="webinars-public-thanks__title">¡Gracias!</p>
          <p class="webinars-public-thanks__text">Tu inscripción fue registrada. Pronto recibirás novedades por correo.</p>
          <button type="button" id="webinar-public-again" class="btn-map-primary webinars-public-thanks__again">
            Enviar otro formulario
          </button>
        </div>`}
      </div>
      <footer class="webinars-public-shell__footer">
        ${I}
      </footer>
    </section>
  `;const w=e.querySelector(".webinars-public-shell");w&&(w.style.boxShadow=n?"0 8px 28px rgba(0,0,0,0.15)":void 0);const c=e.querySelector(".webinars-public-logo");c instanceof HTMLImageElement&&c.addEventListener("error",()=>{c.onerror=null,c.src=T})}export{B as g,U as n,N as r,G as s};

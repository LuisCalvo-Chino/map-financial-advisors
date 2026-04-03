const w="../../img/MAP Logo.png";function A(t){return String(t||"").trim()||w}function j(){const t=new Uint8Array(16);return crypto.getRandomValues(t),Array.from(t,e=>e.toString(16).padStart(2,"0")).join("")}function q(t){return String(t||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,80)||"webinar"}const L=100,M=400,E=180;function v(t){const e=typeof t=="number"?t:Number(t);return Number.isFinite(e)?Math.min(M,Math.max(L,Math.round(e))):E}function l(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}function F(t){if(!t||typeof t!="object")return null;const e=typeof t.branding=="object"&&t.branding!==null?t.branding:{},u=Array.isArray(t.fields)?t.fields:[];return{titulo:typeof t.titulo=="string"?t.titulo:"",slug:typeof t.slug=="string"?t.slug:"",descripcion:typeof t.descripcion=="string"?t.descripcion:"",estado:t.estado==="published"||t.estado==="closed"||t.estado==="draft"?t.estado:"draft",publicHex:typeof t.publicHex=="string"?t.publicHex:"",branding:{logoUrl:typeof e.logoUrl=="string"?e.logoUrl:"",headerColor:typeof e.headerColor=="string"?e.headerColor:"#173862",footerColor:typeof e.footerColor=="string"?e.footerColor:"#102742",backgroundColor:typeof e.backgroundColor=="string"?e.backgroundColor:"#f4f0ed",contentColor:typeof e.contentColor=="string"?e.contentColor:"#ffffff",titleColor:typeof e.titleColor=="string"?e.titleColor:"#173862",textColor:typeof e.textColor=="string"?e.textColor:"#102742",fieldTextColor:typeof e.fieldTextColor=="string"?e.fieldTextColor:"#102742",fieldInputBackgroundColor:typeof e.fieldInputBackgroundColor=="string"?e.fieldInputBackgroundColor:"#ffffff",fieldInputTextColor:typeof e.fieldInputTextColor=="string"?e.fieldInputTextColor:"#102742",logoMaxHeightPx:v(e.logoMaxHeightPx),accentColor:typeof e.accentColor=="string"?e.accentColor:"#A89F8F",title:typeof e.title=="string"?e.title:"",subtitle:typeof e.subtitle=="string"?e.subtitle:"",footerText:typeof e.footerText=="string"?e.footerText:""},fields:u.filter(n=>n&&typeof n=="object").map(n=>{const i=n;return{id:String(i.id||""),type:["text","email","phone","file","paragraph","title","static_text","list"].includes(String(i.type))?String(i.type):"text",label:String(i.label||"Campo"),placeholder:String(i.placeholder||""),content:String(i.content||""),listType:String(i.listType||"bullets"),helpText:String(i.helpText||""),required:!!i.required,order:typeof i.order=="number"?i.order:0,width:i.width==="half"?"half":"full",validation:typeof i.validation=="object"&&i.validation!==null?i.validation:{}}})}}function O(t,e,u={}){if(!t||!e)return;const{previewMode:n=!1,formId:i="webinar-public-form"}=u,r=e.branding,C=A(r.logoUrl),g=v(r.logoMaxHeightPx),T=[...e.fields].sort((o,s)=>o.order-s.order).map(o=>{const s=`fld_${String(o.id).replace(/[^a-zA-Z0-9_-]/g,"_")}`,b=o.required?"required":"",y=n?'readonly tabindex="-1"':"",h=n?"disabled":"";let a="";const p="color: var(--w-input-text); background-color: var(--w-input-bg);",d=`id="${s}" name="${l(o.id)}" class="webinars-public-input" placeholder="${l(o.placeholder)}" ${b} ${y} ${h} style="${p}"`;if(o.type==="title")return`
          <div class="webinars-public-field webinars-public-field--full">
            <h3 style="color: var(--w-title); font-family: var(--font-titles); margin: 1rem 0 0.5rem;">${l(o.content||o.label)}</h3>
          </div>
        `;if(o.type==="static_text")return`
          <div class="webinars-public-field webinars-public-field--full">
            <div style="color: var(--w-text); font-family: var(--font-body); white-space: pre-wrap; margin-bottom: 0.5rem;">${l(o.content||o.label)}</div>
          </div>
        `;if(o.type==="list"){const x=(o.content||"").split(`
`).filter(f=>f.trim()!==""),$=o.listType==="numbers"?"ol":"ul",I=x.map(f=>`<li style="margin-bottom: 0.25rem;">${l(f)}</li>`).join("");return`
          <div class="webinars-public-field webinars-public-field--full">
            <${$} style="color: var(--w-text); font-family: var(--font-body); margin-bottom: 0.5rem; padding-left: 1.5rem;">${I}</${$}>
          </div>
        `}o.type==="email"?a=`<input type="email" ${d} autocomplete="email" />`:o.type==="phone"?a=`<input type="tel" ${d} autocomplete="tel" />`:o.type==="file"?a=n?`<input type="text" readonly class="webinars-public-input" value="[Archivo — vista previa]" style="${p}" />`:`<input type="file" id="${s}" name="${l(o.id)}" class="webinars-public-input" ${b} style="${p}" />`:o.type==="paragraph"?a=`<textarea ${`id="${s}" name="${l(o.id)}" class="webinars-public-input webinars-public-textarea" rows="4" placeholder="${l(o.placeholder)}" ${b} ${y} ${h} style="${p}"`}></textarea>`:a=`<input type="text" ${d} autocomplete="off" />`;const S=o.helpText?`<p class="webinars-public-help" style="color: var(--w-text);">${l(o.helpText)}</p>`:"";return`
        <div class="webinars-public-field ${o.type==="paragraph"?"webinars-public-field--full":o.width==="half"?"webinars-public-field--half":"webinars-public-field--full"}">
          <label class="webinars-public-label" for="${s}" style="color: var(--w-label);">${l(o.label)}${o.required?" *":""}</label>
          ${a}
          ${S}
        </div>
      `}).join(""),H=n?'<p class="webinars-preview-banner">Vista previa — así verá el formulario quien abra el enlace público.</p>':"",_=[`--w-header:${l(r.headerColor)}`,`--w-footer:${l(r.footerColor)}`,`--w-content:${l(r.contentColor)}`,`--w-bg:${l(r.backgroundColor)}`,`--w-title:${l(r.titleColor||"#173862")}`,`--w-text:${l(r.textColor||"#102742")}`,`--w-label:${l(r.fieldTextColor||"#102742")}`,`--w-input-bg:${l(r.fieldInputBackgroundColor||"#ffffff")}`,`--w-input-text:${l(r.fieldInputTextColor||"#102742")}`].join(";");t.style.setProperty("--w-preview-bg",r.backgroundColor),t.innerHTML=`
    <section class="webinars-public-shell webinars-public-shell--embedded" style="${_}">
      <header class="webinars-public-shell__header webinars-public-shell__header--logo-only">
        <div class="webinars-public-logo-row">
          <img
            class="webinars-public-logo"
            src="${l(C)}"
            alt=""
            height="${g}"
            style="height: ${g}px; width: auto; max-width: 100%; object-fit: contain;"
          />
        </div>
      </header>
      <div class="webinars-public-shell__content">
        ${H}
        <form id="${l(i)}" class="webinars-public-form webinars-public-form--grid" novalidate>
          ${T||'<p class="webinars-public-help">Sin campos todavía.</p>'}
          <div class="webinars-form-actions webinars-public-actions">
            <button type="submit" class="btn-map-primary" ${n?"disabled":""}>
              ${n?"Enviar (solo en publicado)":"Enviar inscripción"}
            </button>
          </div>
          <p id="public-viewer-status" class="webinars-status webinars-public-form-status" aria-live="polite"></p>
        </form>
      </div>
      <footer class="webinars-public-shell__footer">
        <p>${l(r.footerText||"MAP")}</p>
      </footer>
    </section>
  `;const m=t.querySelector(".webinars-public-shell");m&&(m.style.boxShadow=n?"0 8px 28px rgba(0,0,0,0.15)":void 0);const c=t.querySelector(".webinars-public-logo");c instanceof HTMLImageElement&&c.addEventListener("error",()=>{c.onerror=null,c.src=w})}export{j as g,F as n,O as r,q as s};

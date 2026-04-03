import{s as T,a as v,g as H,o as oe,p as ne,E as se,r as U,t as W,v as ie,x as R,G as re,y as ce,n as F,d as P,b as I,j as O}from"./firebase-config-BJGMYP3z.js";import{e as le,P as de,i as ue,f as z,n as M}from"./user-schema-zU-iyuhU.js";import{d as pe}from"./ui-shell-CAP1PXY6.js";import{g as me,f as ge}from"./gmail-backend-QjONWBZj.js";let w=null;function L(e){return String(e||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}function k(e,a={}){var p,h;const t=document.getElementById("user-profile");if(!t)return;if(!e){w==null||w.abort(),w=null,t.innerHTML="";return}const{isAdmin:o=!1,adminConsoleHref:i="./apps/admin-console/index.html",onOpenProfile:n}=a;w==null||w.abort(),w=new AbortController;const{signal:l}=w,c=e.displayName||e.email||"Usuario",d=o?`
        <a class="user-dropdown__item user-dropdown__item--link" href="${L(i)}">
          <span>🗂</span> Admin Console
        </a>
      `:"";t.innerHTML=`
    <div class="user-menu-container">
      <button type="button" id="btn-user-menu" class="btn-user-menu" aria-expanded="false" aria-haspopup="true">
        <span class="header-user-name">${L(c)}</span>
        <span class="user-menu-icon">▼</span>
      </button>
      <div id="user-dropdown" class="user-dropdown is-hidden">
        <div class="user-dropdown__header">
          <p class="user-dropdown__name">${L(c)}</p>
          <p class="user-dropdown__email">${L(e.email||"")}</p>
        </div>
        <div class="user-dropdown__body">
          <button type="button" id="btn-open-profile" class="user-dropdown__item">
            <span>⚙️</span> Configuración de Perfil
          </button>
          ${d}
        </div>
        <div class="user-dropdown__footer">
          <button type="button" id="btn-logout" class="user-dropdown__item user-dropdown__item--danger">
            <span>🚪</span> Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  `;const s=document.getElementById("btn-user-menu"),u=document.getElementById("user-dropdown");s==null||s.addEventListener("click",g=>{g.stopPropagation();const f=s.getAttribute("aria-expanded")==="true";s.setAttribute("aria-expanded",f?"false":"true"),u==null||u.classList.toggle("is-hidden",f)},{signal:l}),document.addEventListener("click",g=>{t.contains(g.target)||(s==null||s.setAttribute("aria-expanded","false"),u==null||u.classList.add("is-hidden"))},{signal:l}),(p=document.getElementById("btn-logout"))==null||p.addEventListener("click",()=>{T(v)},{signal:l}),(h=document.getElementById("btn-open-profile"))==null||h.addEventListener("click",()=>{s==null||s.setAttribute("aria-expanded","false"),u==null||u.classList.add("is-hidden"),typeof n=="function"?n():document.dispatchEvent(new CustomEvent("map:open-profile"))},{signal:l})}const he=new Set(["inicio"]);function j(e){return he.has(String(e||"").toLowerCase().trim())}function fe(e){return!!(j(e.appId)||!e.missing&&String(e.titulo||"").trim().toLowerCase()==="inicio")}function be(e){const a=String(e||"").trim();return a?!!(/^https?:\/\//i.test(a)||a.startsWith("./")||a.startsWith("../")||a.startsWith("apps/")||a.startsWith("/")):!1}const G={users:"👥",user:"👤",shield:"🛡",calendar:"📅",calculator:"🧮",chart:"📊",home:"🏠",form:"📋",default:"◆"};function b(e){const a=document.getElementById("home-auth-message");if(!a)return;const t=e.success||e.error||"";a.textContent=t,a.hidden=!t,a.classList.remove("home-auth-message--error","home-auth-message--ok"),e.success?a.classList.add("home-auth-message--ok"):e.error&&a.classList.add("home-auth-message--error")}function ve(e){var n,l,c,d;document.body.dataset.shell="guest";const a=document.getElementById("main-container");if(!a)return;a.innerHTML=`
    <section class="home-layout">
      <div class="home-intro">
        <p class="home-eyebrow">Asesores patrimoniales</p>
        <h1 class="home-title">MAP</h1>
        <p class="home-tagline">
          Gestión patrimonial, inversión y salud en un solo acceso seguro.
        </p>
      </div>
      <div class="home-auth-card">
        <div class="home-auth-tabs" role="tablist">
          <button type="button" class="home-auth-tab is-active" data-tab="login" role="tab" aria-selected="true">
            Ingresar
          </button>
          <button type="button" class="home-auth-tab" data-tab="register" role="tab" aria-selected="false">
            Registrarse
          </button>
        </div>
        <p id="home-auth-message" class="home-auth-message" hidden role="status"></p>
        <div id="panel-login" class="home-auth-panel" role="tabpanel">
          <form id="form-login" class="home-form" novalidate>
            <label class="home-label">Correo
              <input type="email" name="email" class="home-input" autocomplete="email" required />
            </label>
            <label class="home-label">Contraseña
              <input type="password" name="password" class="home-input" autocomplete="current-password" required />
            </label>
            <button type="submit" class="btn-map-primary">Ingresar a mi cuenta</button>
          </form>
          <p class="home-divider"><span>o</span></p>
          <button type="button" id="btn-google-login" class="btn-map-google btn-map-google--full">
            Continuar con Google
          </button>
        </div>
        <div id="panel-register" class="home-auth-panel is-hidden" role="tabpanel" hidden>
          <form id="form-register" class="home-form" novalidate>
            <label class="home-label">Nombre completo
              <input type="text" name="nombre" class="home-input" autocomplete="name" required />
            </label>
            <label class="home-label">Correo
              <input type="email" name="email" class="home-input" autocomplete="email" required />
            </label>
            <label class="home-label">Contraseña
              <input type="password" name="password" class="home-input" autocomplete="new-password" required minlength="6" />
            </label>
            <button type="submit" class="btn-map-primary">Crear cuenta</button>
          </form>
          <p class="home-divider"><span>o</span></p>
          <button type="button" id="btn-google-register" class="btn-map-google btn-map-google--full">
            Registrarse con Google
          </button>
        </div>
      </div>
    </section>
  `,b({});const t=a.querySelectorAll(".home-auth-tab"),o=a.querySelector("#panel-login"),i=a.querySelector("#panel-register");t.forEach(s=>{s.addEventListener("click",()=>{const u=s.getAttribute("data-tab");t.forEach(h=>{const g=h===s;h.classList.toggle("is-active",g),h.setAttribute("aria-selected",g?"true":"false")});const p=u==="login";o==null||o.classList.toggle("is-hidden",!p),i==null||i.classList.toggle("is-hidden",p),o&&(o.hidden=!p),i&&(i.hidden=p),b({})})}),(n=a.querySelector("#form-login"))==null||n.addEventListener("submit",s=>{s.preventDefault();const u=s.target,p=new FormData(u),h=String(p.get("email")||"").trim(),g=String(p.get("password")||"");e.onLoginEmail(h,g)}),(l=a.querySelector("#form-register"))==null||l.addEventListener("submit",s=>{s.preventDefault();const u=s.target,p=new FormData(u),h=String(p.get("nombre")||"").trim(),g=String(p.get("email")||"").trim(),f=String(p.get("password")||"");e.onRegister(h,g,f)}),(c=a.querySelector("#btn-google-login"))==null||c.addEventListener("click",()=>{e.onGoogle()}),(d=a.querySelector("#btn-google-register"))==null||d.addEventListener("click",()=>{e.onGoogle()})}function N(e,a,t,o,i={connected:!1,email:"",providerLinked:!1,scopes:[]}){document.body.dataset.shell="app";const n=document.getElementById("main-container");if(!n)return;const{nombre:l,tiles:c}=e;let d="";c.length===0?d='<p class="dashboard-empty">Aún no tienes aplicaciones asignadas. Contacta a tu asesor MAP.</p>':d=c.map(r=>{if(r.missing)return`
            <article class="webapp-card" role="listitem">
              <div class="webapp-card__icon" aria-hidden="true">${G.default}</div>
              <h3 class="webapp-card__title">No disponible</h3>
              <p class="webapp-card__meta">${y(r.appId)}</p>
              <span class="webapp-card__disabled">Sin entrada en <code>webapps</code> para este id</span>
            </article>
          `;const m=G[r.icono]||G.default,A=y(r.titulo),C=!!(r.url&&be(r.url)),ee=C?"webapp-card webapp-card--clickable":"webapp-card",ae=C?`role="listitem" tabindex="0" data-app-id="${_(r.appId)}" aria-label="Abrir ${_(r.titulo)}"`:'role="listitem"',te=C?'<span class="webapp-card__open-hint">Clic para abrir</span>':'<span class="webapp-card__disabled">URL no configurada</span>';return`
          <article class="${ee}" ${ae}>
            <div class="webapp-card__icon" aria-hidden="true">${m}</div>
            <h3 class="webapp-card__title">${A}</h3>
            <p class="webapp-card__meta">${y(r.appId)}</p>
            ${te}
          </article>
        `}).join("");const s=a.providerData.map(r=>r.providerId),u=s.includes("google.com"),p=s.includes("password");n.innerHTML=`
    <div class="dashboard-shell">
      <h2 class="dashboard-greeting">Hola, ${y(l)}</h2>
      <p class="dashboard-hint">Tu menú de herramientas MAP:</p>
      <div class="app-grid app-grid--dashboard" id="app-grid" role="list">
        ${d}
      </div>
    </div>
  `;const h=()=>{we(a,t,{hasGoogle:u,hasPassword:p},o,i)};document.removeEventListener("map:open-profile",window._mapProfileHandler),window._mapProfileHandler=h,document.addEventListener("map:open-profile",window._mapProfileHandler);function g(r){const m=c.find(A=>!A.missing&&A.appId===r);if(!(!m||m.missing||!m.url)){if(!le(t,m)){ye();return}window.open(m.url,"_blank","noopener,noreferrer")}}const f=document.getElementById("app-grid");f==null||f.addEventListener("click",r=>{const m=r.target.closest("[data-app-id]");m!=null&&m.dataset.appId&&g(m.dataset.appId)}),f==null||f.addEventListener("keydown",r=>{if(r.key!=="Enter"&&r.key!==" ")return;const m=r.target.closest("[data-app-id]");m!=null&&m.dataset.appId&&(r.preventDefault(),g(m.dataset.appId))})}function we(e,a,t,o,i={connected:!1,email:"",providerLinked:!1,scopes:[]}){var p,h,g,f;const{hasGoogle:n,hasPassword:l}=t,c=de[a.plan.tipo]??a.plan.tipo,d=a.status==="suspended"?"Suspendido":ue(a)?"Expirado":"Activo",s=document.createElement("div");s.className="map-modal-overlay",s.id="profile-modal",s.innerHTML=`
    <div class="map-modal map-modal--large">
      <div class="map-modal__header">
        <h3 class="map-modal__title">Configuración de Perfil</h3>
        <button type="button" class="map-modal__close" id="btn-close-profile">✕</button>
      </div>
      
      <div class="map-modal__body">
        <section class="profile-section">
          <h4 class="profile-section__title">Información Personal</h4>
          <div class="profile-field">
            <label class="home-label">Nombre</label>
            <input type="text" class="home-input" value="${_(e.displayName||"")}" readonly disabled />
            <span class="profile-field__hint">Para cambiar tu nombre, contacta a tu asesor.</span>
          </div>
          <div class="profile-field">
            <label class="home-label">Correo Electrónico</label>
            <input type="email" class="home-input" value="${_(e.email||"")}" readonly disabled />
          </div>
          <div class="profile-field">
            <label class="home-label">Plan actual</label>
            <input type="text" class="home-input" value="${_(c)}" readonly disabled />
          </div>
          <div class="profile-field">
            <label class="home-label">Estado de acceso</label>
            <input type="text" class="home-input" value="${_(d)}" readonly disabled />
          </div>
        </section>

        <section class="profile-section">
          <h4 class="profile-section__title">Métodos de Acceso</h4>
          <p class="dashboard-hint" style="margin-bottom: 1rem;">Gestiona cómo inicias sesión en MAP.</p>
          <div class="dashboard-security__methods">
            ${n?'<div class="security-linked"><span>✅</span> Google vinculado</div>':'<button type="button" id="btn-link-google" class="btn-map-google">Vincular mi cuenta de Google</button>'}
            ${l?'<div class="security-linked"><span>✅</span> Contraseña configurada</div>':'<button type="button" id="btn-link-password" class="btn-map-primary">Crear contraseña de acceso</button>'}
          </div>
        </section>

        <section class="profile-section">
          <h4 class="profile-section__title">Gmail Access</h4>
          <p class="dashboard-hint" style="margin-bottom: 1rem;">
            Autoriza a MAP para preparar el envío de correos desde tu cuenta de Google.
          </p>
          <div class="integration-card ${i.connected?"integration-card--ready":"integration-card--warning"}">
            <span class="integration-card__icon">✉️</span>
            <span class="integration-card__name">Gmail Access</span>
            <span class="integration-card__status">${i.connected?"Configurado":"Pendiente"}</span>
          </div>
          <div class="profile-field">
            <span class="profile-field__hint">
              ${i.connected?`Conectado con ${y(i.email||e.email||"tu cuenta")}.${i.providerLinked?" Google está vinculado.":""}`:"Por favor configura Gmail en tu cuenta antes de intentar enviar correos."}
            </span>
          </div>
          <div>
            <button type="button" id="btn-request-gmail-access" class="btn-map-primary">
              ${i.connected?"Actualizar Gmail Access":"Gmail Access"}
            </button>
          </div>
        </section>

        <section class="profile-section">
          <h4 class="profile-section__title">Integraciones (Próximamente)</h4>
          <p class="dashboard-hint" style="margin-bottom: 1rem;">Conecta tus herramientas externas.</p>
          <div class="integrations-grid">
            <div class="integration-card integration-card--coming-soon">
              <span class="integration-card__icon">📹</span>
              <span class="integration-card__name">Zoom</span>
              <span class="integration-card__status">Próximamente</span>
            </div>
            <div class="integration-card integration-card--coming-soon">
              <span class="integration-card__icon">📅</span>
              <span class="integration-card__name">Google Calendar</span>
              <span class="integration-card__status">Próximamente</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,document.body.appendChild(s);const u=()=>s.remove();(p=document.getElementById("btn-close-profile"))==null||p.addEventListener("click",u),s.addEventListener("click",r=>{r.target===s&&u()}),n||(h=document.getElementById("btn-link-google"))==null||h.addEventListener("click",async()=>{try{await o.onLinkGoogle(),window.location.reload()}catch(r){E("No se pudo vincular Google",S(r))}}),l||(g=document.getElementById("btn-link-password"))==null||g.addEventListener("click",()=>{Ee(async r=>{try{await o.onLinkPassword(r),window.location.reload()}catch(m){E("No se pudo crear la contraseña",S(m))}})}),(f=document.getElementById("btn-request-gmail-access"))==null||f.addEventListener("click",async()=>{try{await o.onRequestGmailAccess(),E("Gmail Access configurado","Tu cuenta ya quedó autorizada para el envío de correos desde MAP. Si no ves el cambio de inmediato, recarga la página."),u(),window.location.reload()}catch(r){E("No se pudo configurar Gmail Access",S(r))}})}function ye(){E("Acceso restringido","Cuenta en suspensión. Contacta al equipo MAP para actualizar tu pago.")}function _e(e,a,t){const o=document.createElement("div");o.className="map-modal-overlay",o.innerHTML=`
    <div class="map-modal">
      <h3 class="map-modal__title">Vincular cuenta</h3>
      <p class="map-modal__text">La cuenta <strong>${y(e)}</strong> ya existe. Ingresa tu contraseña de MAP para vincularla con Google.</p>
      <input type="password" id="modal-password" class="home-input" placeholder="Contraseña" style="width: 100%; box-sizing: border-box;" />
      <div class="map-modal__actions">
        <button id="modal-cancel" class="btn-map-secondary">Cancelar</button>
        <button id="modal-confirm" class="btn-map-primary">Vincular</button>
      </div>
    </div>
  `,document.body.appendChild(o);const i=()=>o.remove();document.getElementById("modal-cancel").addEventListener("click",()=>{i(),t&&t()}),document.getElementById("modal-confirm").addEventListener("click",()=>{const n=document.getElementById("modal-password").value;i(),a&&a(n)})}function Ee(e){const a=document.createElement("div");a.className="map-modal-overlay",a.innerHTML=`
    <div class="map-modal">
      <h3 class="map-modal__title">Crear contraseña</h3>
      <p class="map-modal__text">Crea una contraseña para poder iniciar sesión con tu correo electrónico además de Google.</p>
      <input type="password" id="modal-new-password" class="home-input" placeholder="Nueva contraseña (mín. 6 caracteres)" style="width: 100%; box-sizing: border-box;" />
      <div class="map-modal__actions">
        <button id="modal-cancel" class="btn-map-secondary">Cancelar</button>
        <button id="modal-confirm" class="btn-map-primary">Guardar</button>
      </div>
    </div>
  `,document.body.appendChild(a);const t=()=>a.remove();document.getElementById("modal-cancel").addEventListener("click",t),document.getElementById("modal-confirm").addEventListener("click",()=>{const o=document.getElementById("modal-new-password").value;if(o.length<6){alert("La contraseña debe tener al menos 6 caracteres.");return}t(),e&&e(o)})}function E(e,a){var i;const t=document.createElement("div");t.className="map-modal-overlay",t.innerHTML=`
    <div class="map-modal">
      <h3 class="map-modal__title">${y(e)}</h3>
      <p class="map-modal__text">${y(a)}</p>
      <div class="map-modal__actions">
        <button id="modal-status-close" class="btn-map-primary">Entendido</button>
      </div>
    </div>
  `,document.body.appendChild(t);const o=()=>t.remove();(i=document.getElementById("modal-status-close"))==null||i.addEventListener("click",o),t.addEventListener("click",n=>{n.target===t&&o()})}function y(e){const a=document.createElement("div");return a.textContent=e,a.innerHTML}function _(e){return e.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;")}function S(e){return e instanceof Error&&e.message?e.message:"Inténtalo de nuevo en unos segundos."}function B(e){const a=e&&typeof e=="object"&&"code"in e?String(e.code):"",t={"auth/email-already-in-use":"Ese correo ya está registrado. Inicia sesión o usa otro email.","auth/invalid-email":"El correo no tiene un formato válido.","auth/weak-password":"La contraseña debe tener al menos 6 caracteres.","auth/user-disabled":"Esta cuenta fue deshabilitada. Contacta a MAP.","auth/user-not-found":"No hay cuenta con ese correo.","auth/wrong-password":"Contraseña incorrecta.","auth/invalid-credential":"Correo o contraseña incorrectos. También puedes usar Google.","auth/too-many-requests":"Demasiados intentos. Espera unos minutos e inténtalo de nuevo.","auth/popup-closed-by-user":"Inicio con Google cancelado.","auth/network-request-failed":"Error de red. Revisa tu conexión.","auth/credential-already-in-use":"Esta cuenta ya está vinculada a otro usuario.","auth/account-exists-with-different-credential":"Ya existe una cuenta con este correo usando otro método.","auth/unauthorized-domain":"Este dominio no está autorizado en Firebase. En la consola de Firebase: Autenticación → Configuración → Dominios autorizados, añade el dominio desde el que abres la web (por ejemplo tu-sitio.github.io o localhost).","auth/operation-not-allowed":"Este método de acceso está desactivado en el proyecto. En Firebase: Autenticación → Método de inicio, activa Correo/contraseña o Google según corresponda.","auth/popup-blocked":"El navegador bloqueó la ventana de Google. Permite ventanas emergentes para este sitio o prueba en otra ventana.","auth/invalid-api-key":"La clave de API de Firebase no es válida o tiene restricciones. Revisa .env.local y, en Google Cloud, restricciones de la API key (referrers).","auth/internal-error":"Error interno de autenticación. Prueba más tarde, otro navegador o borra datos del sitio.","auth/missing-email":"Falta el correo electrónico.","auth/missing-password":"Escribe tu contraseña.","auth/requires-recent-login":"Por seguridad, cierra sesión y vuelve a entrar para continuar."};if(t[a])return t[a];const o="No se pudo completar la acción. Inténtalo de nuevo.";return a&&a.startsWith("auth/")?`${o} (código técnico: ${a})`:o}const Ae="map:gmail-oauth-result";function Le(e){return P(I,"usuarios",e,"private","gmail_access")}async function V(e){if(!e)return{connected:!1,email:"",providerLinked:!1,scopes:[]};const a=await H(Le(e));if(!a.exists())return{connected:!1,email:"",providerLinked:!1,scopes:[]};const t=a.data();return{connected:!!t.connected,email:typeof t.email=="string"?t.email:"",providerLinked:!!t.providerLinked,scopes:Array.isArray(t.scopes)?t.scopes.map(o=>String(o)):[]}}async function q(e){try{return await V(e)}catch(a){return console.warn("[MAP] No se pudo leer gmail_access; se usará estado pendiente.",a),{connected:!1,email:"",providerLinked:!1,scopes:[]}}}async function Y(){var l;const e=v.currentUser;if(!e)throw new Error("Debes iniciar sesión para configurar Gmail Access.");const a=ke(),t=me(window.location.origin);Pe(a,{uid:e.uid,origin:window.location.origin,createdAt:Date.now()});const o=await ge("/api/oauth/start",{state:a,redirectUri:t}),i=String((o==null?void 0:o.authUrl)||"");if(!i)throw x(a),new Error("No se pudo iniciar Gmail Access.");const n=Ie(i,"map-gmail-access");if(!n)throw x(a),new Error("El navegador bloqueó la ventana emergente de Gmail Access.");try{const c=await Ce(a,n);return{connected:!0,email:c&&typeof c=="object"&&"result"in c?String(((l=c.result)==null?void 0:l.email)||e.email||""):e.email||""}}finally{x(a)}}function ke(){const e=new Uint8Array(24);return crypto.getRandomValues(e),Array.from(e,a=>a.toString(16).padStart(2,"0")).join("")}function Pe(e,a){window.sessionStorage.setItem(`map:gmail-oauth:${e}`,JSON.stringify(a))}function x(e){window.sessionStorage.removeItem(`map:gmail-oauth:${e}`)}function Ie(e,a){const i=Math.max(0,Math.round(window.screenX+(window.outerWidth-560)/2)),n=Math.max(0,Math.round(window.screenY+(window.outerHeight-720)/2));return window.open(e,a,`popup=yes,width=560,height=720,left=${i},top=${n},resizable=yes,scrollbars=yes`)}function Ce(e,a){return new Promise((t,o)=>{const i=window.setTimeout(()=>{c(),o(new Error("La autorización de Gmail tardó demasiado o fue cancelada."))},18e4),n=window.setInterval(()=>{a.closed&&(c(),o(new Error("La ventana de Gmail Access se cerró antes de completar el proceso.")))},500),l=d=>{if(d.origin!==window.location.origin)return;const s=d.data;!s||s.type!==Ae||String(s.state||"")===e&&(c(),s.ok?t(s):o(new Error(String(s.error||"No se pudo completar Gmail Access."))))},c=()=>{window.clearTimeout(i),window.clearInterval(n),window.removeEventListener("message",l);try{a.closed||a.close()}catch{}};window.addEventListener("message",l)})}async function J(){try{b({});const e=await ie(v,R);console.log("Usuario logueado:",e.user.displayName)}catch(e){if(e.code==="auth/account-exists-with-different-credential"){const a=e.customData.email,t=re.credentialFromError(e);_e(a,async o=>{try{const i=await W(v,a,o);await U(i.user,t)}catch(i){console.error("Error al vincular:",i),b({error:"Contraseña incorrecta o error al vincular."})}},()=>{b({error:"Vinculación cancelada."})})}else console.error("Error en login:",e),b({error:B(e)})}}async function X(e,a){try{b({}),await W(v,e,a)}catch(t){console.error("Error login email:",t),b({error:B(t)})}}async function Z(e,a,t){try{if(b({}),!e){b({error:"Escribe tu nombre completo."});return}const o=await ce(v,a,t);await F(P(I,"usuarios",o.user.uid),z({nombre:e.trim(),email:o.user.email??a.trim(),fechaInicio:O()}))}catch(o){console.error("Error registro:",o),b({error:B(o)})}}function Ge(){return T(v)}async function K(){const e=v.currentUser;e&&await ne(e,R)}async function Q(e){const a=v.currentUser;if(!a||!a.email)return;const t=se.credential(a.email,e);await U(a,t)}const $="./apps/admin-console/index.html";function Se(e){return e.providerData.some(a=>a.providerId==="google.com")}function xe(e){const a=e.email??"",t=e.displayName&&e.displayName.trim()||(a.includes("@")?a.split("@")[0]:"")||"Usuario";return z({nombre:t,email:a,fechaInicio:O()})}async function D(e){const a=M(e),t=a.apps_activas.filter(n=>!j(n));if(t.length===0)return{nombre:a.nombre,tiles:[]};const o=await Promise.all(t.map(n=>H(P(I,"webapps",n)))),i=t.map((n,l)=>{const c=o[l];if(!c.exists())return{appId:n,missing:!0};const d=c.data();return{appId:n,missing:!1,titulo:typeof d.titulo=="string"&&d.titulo.trim()?d.titulo.trim():n,url:typeof d.url=="string"?d.url.trim():"",es_gratuita:!!d.es_gratuita,icono:typeof d.icono=="string"?d.icono.toLowerCase().trim():""}}).filter(n=>!fe(n));return{nombre:a.nombre,tiles:i}}function $e(){oe(v,async e=>{pe();const a=document.getElementById("main-container");if(a)if(e){document.body.dataset.shell="app",b({}),k(e,{isAdmin:!1,adminConsoleHref:$});try{const t=P(I,"usuarios",e.uid),o=await H(t),i={onLinkGoogle:K,onLinkPassword:Q,onRequestGmailAccess:Y};if(o.exists()){const n=M(o.data(),e.uid);k(e,{isAdmin:n.rol==="admin",adminConsoleHref:$});const l=await D(o.data()),c=await q(e.uid);N(l,e,n,i,c)}else if(Se(e)&&e.email){const n=xe(e);await F(t,n);const l=M({...n,plan:{...n.plan,fecha_inicio:new Date}},e.uid);k(e,{isAdmin:l.rol==="admin",adminConsoleHref:$});const c=await D({...n,plan:{...n.plan,fecha_inicio:new Date}}),d=await q(e.uid);N(c,e,l,i,d)}else a.innerHTML='<div class="auth-error"><h2>Usuario no registrado</h2><p>No encontramos tu perfil en el sistema MAP. Regístrate con correo y contraseña o pide a un asesor que dé de alta tu cuenta.</p></div>'}catch(t){console.error("Error al leer perfil:",t),a.innerHTML='<div class="auth-error"><h2>No se pudo cargar tu perfil</h2><p>Revisa tu conexión o los permisos en Firestore.</p></div>'}}else k(null),ve({onGoogle:J,onLoginEmail:X,onRegister:Z})})}const qe=Object.freeze(Object.defineProperty({__proto__:null,getGmailAccessState:V,initAuthShell:$e,linkGoogleAccount:K,linkPasswordAccount:Q,loginWithEmail:X,loginWithGoogle:J,logout:Ge,registerWithEmail:Z,requestGmailAccess:Y},Symbol.toStringTag,{value:"Module"}));export{Y as a,K as b,qe as c,V as g,Q as l,k as m,we as r};

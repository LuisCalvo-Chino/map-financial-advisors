import{o as U,b as h,j as W,E as R,k as $,m as B,n as F,p as H,G as j,s as z,r as V,t as N,d as k,a as C,v as M,g as q}from"./firebase-config-DR4FsoVa.js";import{e as O,P as Y,i as Z,f as D,n as L}from"./user-schema-DrkO0d5X.js";import{d as J}from"./main-B4Dbuez9.js";import"./brand-B4nv3qcu.js";function I(e){const a=e&&typeof e=="object"&&"code"in e?String(e.code):"";return{"auth/email-already-in-use":"Ese correo ya está registrado. Inicia sesión o usa otro email.","auth/invalid-email":"El correo no tiene un formato válido.","auth/weak-password":"La contraseña debe tener al menos 6 caracteres.","auth/user-disabled":"Esta cuenta fue deshabilitada. Contacta a MAP.","auth/user-not-found":"No hay cuenta con ese correo.","auth/wrong-password":"Contraseña incorrecta.","auth/invalid-credential":"Correo o contraseña incorrectos. También puedes usar Google.","auth/too-many-requests":"Demasiados intentos. Espera unos minutos e inténtalo de nuevo.","auth/popup-closed-by-user":"Inicio con Google cancelado.","auth/network-request-failed":"Error de red. Revisa tu conexión.","auth/credential-already-in-use":"Esta cuenta ya está vinculada a otro usuario.","auth/account-exists-with-different-credential":"Ya existe una cuenta con este correo usando otro método."}[a]||"No se pudo completar la acción. Inténtalo de nuevo."}const w={users:"👥",user:"👤",shield:"🛡",calendar:"📅",calculator:"🧮",chart:"📊",home:"🏠",default:"◆"};function g(e){const a=document.getElementById("home-auth-message");if(!a)return;const t=e.success||e.error||"";a.textContent=t,a.hidden=!t,a.classList.remove("home-auth-message--error","home-auth-message--ok"),e.success?a.classList.add("home-auth-message--ok"):e.error&&a.classList.add("home-auth-message--error")}function K(e){var s,l,c,i;document.body.dataset.shell="guest";const a=document.getElementById("main-container");if(!a)return;a.innerHTML=`
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
  `,g({});const t=a.querySelectorAll(".home-auth-tab"),o=a.querySelector("#panel-login"),n=a.querySelector("#panel-register");t.forEach(p=>{p.addEventListener("click",()=>{const b=p.getAttribute("data-tab");t.forEach(u=>{const r=u===p;u.classList.toggle("is-active",r),u.setAttribute("aria-selected",r?"true":"false")});const d=b==="login";o==null||o.classList.toggle("is-hidden",!d),n==null||n.classList.toggle("is-hidden",d),o&&(o.hidden=!d),n&&(n.hidden=d),g({})})}),(s=a.querySelector("#form-login"))==null||s.addEventListener("submit",p=>{p.preventDefault();const b=p.target,d=new FormData(b),u=String(d.get("email")||"").trim(),r=String(d.get("password")||"");e.onLoginEmail(u,r)}),(l=a.querySelector("#form-register"))==null||l.addEventListener("submit",p=>{p.preventDefault();const b=p.target,d=new FormData(b),u=String(d.get("nombre")||"").trim(),r=String(d.get("email")||"").trim(),m=String(d.get("password")||"");e.onRegister(u,r,m)}),(c=a.querySelector("#btn-google-login"))==null||c.addEventListener("click",()=>{e.onGoogle()}),(i=a.querySelector("#btn-google-register"))==null||i.addEventListener("click",()=>{e.onGoogle()})}function x(e,a,t,o){document.body.dataset.shell="app";const n=document.getElementById("main-container");if(!n)return;const{nombre:s,tiles:l}=e,c=t.rol==="admin";let i="";l.length===0&&!c?i='<p class="dashboard-empty">Aún no tienes aplicaciones asignadas. Contacta a tu asesor MAP.</p>':i=(c?`
        <article class="webapp-card webapp-card--admin" role="listitem">
          <div class="webapp-card__icon" aria-hidden="true">🗂</div>
          <h3 class="webapp-card__title">Consola Admin</h3>
          <p class="webapp-card__meta">apps/admin-console</p>
          <a class="webapp-card__link" href="./apps/admin-console/index.html">
            Abrir consola
          </a>
        </article>
      `:"")+l.map(m=>{if(m.missing)return`
            <article class="webapp-card" role="listitem">
              <div class="webapp-card__icon" aria-hidden="true">${w.default}</div>
              <h3 class="webapp-card__title">No disponible</h3>
              <p class="webapp-card__meta">${f(m.appId)}</p>
              <span class="webapp-card__disabled">Sin entrada en <code>webapps</code> para este id</span>
            </article>
          `;const v=w[m.icono]||w.default,_=f(m.titulo),T=m.url&&/^https?:\/\//i.test(m.url)?`<button class="webapp-card__link webapp-card__link-btn" type="button" data-app-id="${y(m.appId)}">Abrir aplicación</button>`:'<span class="webapp-card__disabled">URL no configurada</span>';return`
          <article class="webapp-card" role="listitem">
            <div class="webapp-card__icon" aria-hidden="true">${v}</div>
            <h3 class="webapp-card__title">${_}</h3>
            <p class="webapp-card__meta">${f(m.appId)}</p>
            ${T}
          </article>
        `}).join("");const p=a.providerData.map(r=>r.providerId),b=p.includes("google.com"),d=p.includes("password");n.innerHTML=`
    <div class="dashboard-shell">
      <h2 class="dashboard-greeting">Hola, ${f(s)}</h2>
      <p class="dashboard-hint">Tu menú de herramientas MAP:</p>
      <div class="app-grid app-grid--dashboard" id="app-grid" role="list">
        ${i}
      </div>
    </div>
  `;const u=()=>{Q(a,t,{hasGoogle:b,hasPassword:d},o)};document.removeEventListener("map:open-profile",window._mapProfileHandler),window._mapProfileHandler=u,document.addEventListener("map:open-profile",window._mapProfileHandler),n.querySelectorAll("[data-app-id]").forEach(r=>{r.addEventListener("click",()=>{const m=r.dataset.appId,v=l.find(_=>!_.missing&&_.appId===m);if(!(!v||v.missing||!v.url)){if(!O(t,v)){X();return}window.open(v.url,"_blank","noopener,noreferrer")}})})}function Q(e,a,t,o){var b,d,u;const{hasGoogle:n,hasPassword:s}=t,l=Y[a.plan.tipo]??a.plan.tipo,c=a.status==="suspended"?"Suspendido":Z(a)?"Expirado":"Activo",i=document.createElement("div");i.className="map-modal-overlay",i.id="profile-modal",i.innerHTML=`
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
            <input type="text" class="home-input" value="${y(e.displayName||"")}" readonly disabled />
            <span class="profile-field__hint">Para cambiar tu nombre, contacta a tu asesor.</span>
          </div>
          <div class="profile-field">
            <label class="home-label">Correo Electrónico</label>
            <input type="email" class="home-input" value="${y(e.email||"")}" readonly disabled />
          </div>
          <div class="profile-field">
            <label class="home-label">Plan actual</label>
            <input type="text" class="home-input" value="${y(l)}" readonly disabled />
          </div>
          <div class="profile-field">
            <label class="home-label">Estado de acceso</label>
            <input type="text" class="home-input" value="${y(c)}" readonly disabled />
          </div>
        </section>

        <section class="profile-section">
          <h4 class="profile-section__title">Métodos de Acceso</h4>
          <p class="dashboard-hint" style="margin-bottom: 1rem;">Gestiona cómo inicias sesión en MAP.</p>
          <div class="dashboard-security__methods">
            ${n?'<div class="security-linked"><span>✅</span> Google vinculado</div>':'<button type="button" id="btn-link-google" class="btn-map-google">Vincular mi cuenta de Google</button>'}
            ${s?'<div class="security-linked"><span>✅</span> Contraseña configurada</div>':'<button type="button" id="btn-link-password" class="btn-map-primary">Crear contraseña de acceso</button>'}
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
            <div class="integration-card">
              <span class="integration-card__icon">🗂</span>
              <span class="integration-card__name">Consola Admin</span>
              <span class="integration-card__status">${a.rol==="admin"?"Disponible":"Solo admin"}</span>
            </div>
          </div>
          ${a.rol==="admin"?`<div style="margin-top: 1rem;">
                  <a class="btn-map-primary" href="./apps/admin-console/index.html" style="display: inline-flex; text-decoration: none;">
                    Abrir Consola de Administrador
                  </a>
                </div>`:""}
        </section>
      </div>
    </div>
  `,document.body.appendChild(i);const p=()=>i.remove();(b=document.getElementById("btn-close-profile"))==null||b.addEventListener("click",p),i.addEventListener("click",r=>{r.target===i&&p()}),n||(d=document.getElementById("btn-link-google"))==null||d.addEventListener("click",async()=>{try{await o.onLinkGoogle(),window.location.reload()}catch(r){A("No se pudo vincular Google",P(r))}}),s||(u=document.getElementById("btn-link-password"))==null||u.addEventListener("click",()=>{ae(async r=>{try{await o.onLinkPassword(r),window.location.reload()}catch(m){A("No se pudo crear la contraseña",P(m))}})})}function X(){A("Acceso restringido","Cuenta en suspensión. Contacta al equipo MAP para actualizar tu pago.")}function ee(e,a,t){const o=document.createElement("div");o.className="map-modal-overlay",o.innerHTML=`
    <div class="map-modal">
      <h3 class="map-modal__title">Vincular cuenta</h3>
      <p class="map-modal__text">La cuenta <strong>${f(e)}</strong> ya existe. Ingresa tu contraseña de MAP para vincularla con Google.</p>
      <input type="password" id="modal-password" class="home-input" placeholder="Contraseña" style="width: 100%; box-sizing: border-box;" />
      <div class="map-modal__actions">
        <button id="modal-cancel" class="btn-map-secondary">Cancelar</button>
        <button id="modal-confirm" class="btn-map-primary">Vincular</button>
      </div>
    </div>
  `,document.body.appendChild(o);const n=()=>o.remove();document.getElementById("modal-cancel").addEventListener("click",()=>{n(),t&&t()}),document.getElementById("modal-confirm").addEventListener("click",()=>{const s=document.getElementById("modal-password").value;n(),a&&a(s)})}function ae(e){const a=document.createElement("div");a.className="map-modal-overlay",a.innerHTML=`
    <div class="map-modal">
      <h3 class="map-modal__title">Crear contraseña</h3>
      <p class="map-modal__text">Crea una contraseña para poder iniciar sesión con tu correo electrónico además de Google.</p>
      <input type="password" id="modal-new-password" class="home-input" placeholder="Nueva contraseña (mín. 6 caracteres)" style="width: 100%; box-sizing: border-box;" />
      <div class="map-modal__actions">
        <button id="modal-cancel" class="btn-map-secondary">Cancelar</button>
        <button id="modal-confirm" class="btn-map-primary">Guardar</button>
      </div>
    </div>
  `,document.body.appendChild(a);const t=()=>a.remove();document.getElementById("modal-cancel").addEventListener("click",t),document.getElementById("modal-confirm").addEventListener("click",()=>{const o=document.getElementById("modal-new-password").value;if(o.length<6){alert("La contraseña debe tener al menos 6 caracteres.");return}t(),e&&e(o)})}function A(e,a){var n;const t=document.createElement("div");t.className="map-modal-overlay",t.innerHTML=`
    <div class="map-modal">
      <h3 class="map-modal__title">${f(e)}</h3>
      <p class="map-modal__text">${f(a)}</p>
      <div class="map-modal__actions">
        <button id="modal-status-close" class="btn-map-primary">Entendido</button>
      </div>
    </div>
  `,document.body.appendChild(t);const o=()=>t.remove();(n=document.getElementById("modal-status-close"))==null||n.addEventListener("click",o),t.addEventListener("click",s=>{s.target===t&&o()})}function f(e){const a=document.createElement("div");return a.textContent=e,a.innerHTML}function y(e){return e.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;")}function P(e){return e instanceof Error&&e.message?e.message:"Inténtalo de nuevo en unos segundos."}async function te(){try{g({});const e=await F(h,H);console.log("Usuario logueado:",e.user.displayName)}catch(e){if(e.code==="auth/account-exists-with-different-credential"){const a=e.customData.email,t=j.credentialFromError(e);ee(a,async o=>{try{const n=await B(h,a,o);await $(n.user,t)}catch(n){console.error("Error al vincular:",n),g({error:"Contraseña incorrecta o error al vincular."})}},()=>{g({error:"Vinculación cancelada."})})}else console.error("Error en login:",e),g({error:I(e)})}}async function oe(e,a){try{g({}),await B(h,e,a)}catch(t){console.error("Error login email:",t),g({error:I(t)})}}async function ne(e,a,t){try{if(g({}),!e){g({error:"Escribe tu nombre completo."});return}const o=await V(h,a,t);await N(k(C,"usuarios",o.user.uid),D({nombre:e.trim(),email:o.user.email??a.trim(),fechaInicio:M()}))}catch(o){console.error("Error registro:",o),g({error:I(o)})}}function se(){return z(h)}async function ie(){const e=h.currentUser;e&&await W(e,H)}async function re(e){const a=h.currentUser;if(!a||!a.email)return;const t=R.credential(a.email,e);await $(a,t)}function G(e){var s,l;const a=document.getElementById("user-profile");if(!a)return;if(!e){a.innerHTML="";return}const t=e.displayName||e.email||"Usuario";a.innerHTML=`
    <div class="user-menu-container">
      <button type="button" id="btn-user-menu" class="btn-user-menu" aria-expanded="false" aria-haspopup="true">
        <span class="header-user-name">${E(t)}</span>
        <span class="user-menu-icon">▼</span>
      </button>
      <div id="user-dropdown" class="user-dropdown is-hidden">
        <div class="user-dropdown__header">
          <p class="user-dropdown__name">${E(t)}</p>
          <p class="user-dropdown__email">${E(e.email||"")}</p>
        </div>
        <div class="user-dropdown__body">
          <button type="button" id="btn-open-profile" class="user-dropdown__item">
            <span>⚙️</span> Configuración de Perfil
          </button>
        </div>
        <div class="user-dropdown__footer">
          <button type="button" id="btn-logout" class="user-dropdown__item user-dropdown__item--danger">
            <span>🚪</span> Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  `;const o=document.getElementById("btn-user-menu"),n=document.getElementById("user-dropdown");o==null||o.addEventListener("click",c=>{c.stopPropagation();const i=o.getAttribute("aria-expanded")==="true";o.setAttribute("aria-expanded",i?"false":"true"),n==null||n.classList.toggle("is-hidden",i)}),document.addEventListener("click",c=>{a.contains(c.target)||(o==null||o.setAttribute("aria-expanded","false"),n==null||n.classList.add("is-hidden"))}),(s=document.getElementById("btn-logout"))==null||s.addEventListener("click",()=>{se()}),(l=document.getElementById("btn-open-profile"))==null||l.addEventListener("click",()=>{o==null||o.setAttribute("aria-expanded","false"),n==null||n.classList.add("is-hidden"),document.dispatchEvent(new CustomEvent("map:open-profile"))})}function E(e){return e.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}function le(e){return e.providerData.some(a=>a.providerId==="google.com")}function ce(e){const a=e.email??"",t=e.displayName&&e.displayName.trim()||(a.includes("@")?a.split("@")[0]:"")||"Usuario";return D({nombre:t,email:a,fechaInicio:M()})}async function S(e){const a=L(e),t=a.apps_activas;if(t.length===0)return{nombre:a.nombre,tiles:[]};const o=await Promise.all(t.map(s=>q(k(C,"webapps",s)))),n=t.map((s,l)=>{const c=o[l];if(!c.exists())return{appId:s,missing:!0};const i=c.data();return{appId:s,missing:!1,titulo:typeof i.titulo=="string"&&i.titulo.trim()?i.titulo.trim():s,url:typeof i.url=="string"?i.url.trim():"",es_gratuita:!!i.es_gratuita,icono:typeof i.icono=="string"?i.icono.toLowerCase().trim():""}});return{nombre:a.nombre,tiles:n}}function ge(){U(h,async e=>{J();const a=document.getElementById("main-container");if(a)if(e){document.body.dataset.shell="app",g({}),G(e);try{const t=k(C,"usuarios",e.uid),o=await q(t),n={onLinkGoogle:ie,onLinkPassword:re};if(o.exists()){const s=L(o.data(),e.uid),l=await S(o.data());x(l,e,s,n)}else if(le(e)&&e.email){const s=ce(e);await N(t,s);const l=L({...s,plan:{...s.plan,fecha_inicio:new Date}},e.uid),c=await S({...s,plan:{...s.plan,fecha_inicio:new Date}});x(c,e,l,n)}else a.innerHTML='<div class="auth-error"><h2>Usuario no registrado</h2><p>No encontramos tu perfil en el sistema MAP. Regístrate con correo y contraseña o pide a un asesor que dé de alta tu cuenta.</p></div>'}catch(t){console.error("Error al leer perfil:",t),a.innerHTML='<div class="auth-error"><h2>No se pudo cargar tu perfil</h2><p>Revisa tu conexión o los permisos en Firestore.</p></div>'}}else G(null),K({onGoogle:te,onLoginEmail:oe,onRegister:ne})})}export{ge as initAuthShell,ie as linkGoogleAccount,re as linkPasswordAccount,oe as loginWithEmail,te as loginWithGoogle,se as logout,ne as registerWithEmail};

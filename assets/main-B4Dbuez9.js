const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./auth-handler-nfkZiQSN.js","./firebase-config-DR4FsoVa.js","./user-schema-DrkO0d5X.js","./brand-B4nv3qcu.js","./brand-HKqc7-TA.css"])))=>i.map(i=>d[i]);
import"./brand-B4nv3qcu.js";const y="modulepreload",b=function(e,t){return new URL(e,t).href},f={},v=function(t,n,m){let l=Promise.resolve();if(n&&n.length>0){let a=function(o){return Promise.all(o.map(i=>Promise.resolve(i).then(d=>({status:"fulfilled",value:d}),d=>({status:"rejected",reason:d}))))};const s=document.getElementsByTagName("link"),c=document.querySelector("meta[property=csp-nonce]"),p=(c==null?void 0:c.nonce)||(c==null?void 0:c.getAttribute("nonce"));l=a(n.map(o=>{if(o=b(o,m),o in f)return;f[o]=!0;const i=o.endsWith(".css"),d=i?'[rel="stylesheet"]':"";if(!!m)for(let u=s.length-1;u>=0;u--){const g=s[u];if(g.href===o&&(!i||g.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${o}"]${d}`))return;const r=document.createElement("link");if(r.rel=i?"stylesheet":y,i||(r.as="script"),r.crossOrigin="",r.href=o,p&&r.setAttribute("nonce",p),document.head.appendChild(r),i)return new Promise((u,g)=>{r.addEventListener("load",u),r.addEventListener("error",()=>g(new Error(`Unable to preload CSS for ${o}`)))})}))}function h(a){const s=new Event("vite:preloadError",{cancelable:!0});if(s.payload=a,window.dispatchEvent(s),!s.defaultPrevented)throw a}return l.then(a=>{for(const s of a||[])s.status==="rejected"&&h(s.reason);return t().catch(h)})};function _(){var e;(e=document.getElementById("shell-boot"))==null||e.remove()}function E(e){_();const t=document.getElementById("main-container");if(!t)return;document.body.dataset.shell="guest";const n=String(e||"").slice(0,280);t.innerHTML=`
    <div class="shell-config-missing">
      <h2 class="shell-config-missing__title">No se pudo iniciar el portal</h2>
      <p class="shell-config-missing__text">
        Revisa la consola del navegador (F12 → Consola). Si subiste la carpeta <code>dist/</code>,
        vuelve a generarla con <code>npm run build</code> tras los últimos cambios.
      </p>
      ${n?`<p class="shell-config-missing__text"><code>${w(n)}</code></p>`:""}
    </div>
  `}function S(){if(!document.getElementById("shell-boot"))return;_();const e=document.getElementById("main-container");e&&(document.body.dataset.shell="guest",e.innerHTML=`
    <div class="shell-config-missing">
      <h2 class="shell-config-missing__title">El portal no terminó de cargar</h2>
      <p class="shell-config-missing__text">
        Lo más habitual: el navegador no pudo cargar el archivo JavaScript (ruta incorrecta al publicar)
        o hace falta usar el servidor de desarrollo.
      </p>
      <ul class="shell-help-list">
        <li>En tu PC: en la carpeta del proyecto ejecuta <code>npm run dev</code> y abre la URL que muestre Vite (p. ej. <code>http://localhost:5173</code>).</li>
        <li>Si publicas en GitHub Pages dentro de un repositorio, asegúrate de haber hecho <code>npm run build</code> con la versión actual del proyecto y de subir toda la carpeta <code>dist/</code>.</li>
        <li>Comprueba en F12 → pestaña <strong>Red / Network</strong> si algún <code>.js</code> aparece en rojo (404).</li>
      </ul>
    </div>
  `)}function w(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;")}const B=14e3;async function L(){let e=0;e=window.setTimeout(()=>{document.getElementById("shell-boot")&&S()},B);try{const t="AIzaSyD2SLe9uesfz5WV8YgOJ14UBoxzgk2V6CE",n="webasesorpatrimonial";await v(()=>import("./firebase-config-DR4FsoVa.js").then(l=>l.w),[],import.meta.url);const{initAuthShell:m}=await v(async()=>{const{initAuthShell:l}=await import("./auth-handler-nfkZiQSN.js");return{initAuthShell:l}},__vite__mapDeps([0,1,2,3,4]),import.meta.url);m()}catch(t){console.error("[MAP] Arranque:",t),window.clearTimeout(e);const n=t instanceof Error?t.message:String(t);E(n)}}L();export{_ as d};

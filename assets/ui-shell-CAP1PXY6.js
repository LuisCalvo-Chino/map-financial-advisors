function o(){var e;(e=document.getElementById("shell-boot"))==null||e.remove()}function l(){o();const e=document.getElementById("main-container");e&&(document.body.dataset.shell="guest",e.innerHTML=`
    <div class="shell-config-missing">
      <h2 class="shell-config-missing__title">Configuración pendiente</h2>
      <p class="shell-config-missing__text">
        No se encontraron variables <code>VITE_FIREBASE_*</code>. Copia
        <code>.env.example</code> a <code>.env.local</code>, pega los datos de tu proyecto Firebase
        y ejecuta <code>npm run dev</code> desde la carpeta del proyecto (no abras solo el HTML en el explorador).
      </p>
    </div>
  `)}function t(e){o();const n=document.getElementById("main-container");if(!n)return;document.body.dataset.shell="guest";const a=String(e||"").slice(0,280);n.innerHTML=`
    <div class="shell-config-missing">
      <h2 class="shell-config-missing__title">No se pudo iniciar el portal</h2>
      <p class="shell-config-missing__text">
        Revisa la consola del navegador (F12 → Consola). Si subiste la carpeta <code>dist/</code>,
        vuelve a generarla con <code>npm run build</code> tras los últimos cambios.
      </p>
      ${a?`<p class="shell-config-missing__text"><code>${s(a)}</code></p>`:""}
    </div>
  `}function i(){if(!document.getElementById("shell-boot"))return;o();const e=document.getElementById("main-container");e&&(document.body.dataset.shell="guest",e.innerHTML=`
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
  `)}function s(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;")}export{l as a,t as b,o as d,i as r};

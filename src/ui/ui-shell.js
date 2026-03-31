/** Quita la pantalla de arranque del shell (invitado o carga inicial). */
export function dismissShellBoot() {
  document.getElementById("shell-boot")?.remove();
}

/** Firebase sin variables VITE: mensaje claro sin inicializar la app. */
export function renderConfigMissing() {
  dismissShellBoot();
  const main = document.getElementById("main-container");
  if (!main) return;
  document.body.dataset.shell = "guest";
  main.innerHTML = `
    <div class="shell-config-missing">
      <h2 class="shell-config-missing__title">Configuración pendiente</h2>
      <p class="shell-config-missing__text">
        No se encontraron variables <code>VITE_FIREBASE_*</code>. Copia
        <code>.env.example</code> a <code>.env.local</code>, pega los datos de tu proyecto Firebase
        y ejecuta <code>npm run dev</code> desde la carpeta del proyecto (no abras solo el HTML en el explorador).
      </p>
    </div>
  `;
}

/** Error al inicializar Firebase o importar módulos (consola F12 para detalle). */
export function renderBootFailure(detail) {
  dismissShellBoot();
  const main = document.getElementById("main-container");
  if (!main) return;
  document.body.dataset.shell = "guest";
  const safe = String(detail || "").slice(0, 280);
  main.innerHTML = `
    <div class="shell-config-missing">
      <h2 class="shell-config-missing__title">No se pudo iniciar el portal</h2>
      <p class="shell-config-missing__text">
        Revisa la consola del navegador (F12 → Consola). Si subiste la carpeta <code>dist/</code>,
        vuelve a generarla con <code>npm run build</code> tras los últimos cambios.
      </p>
      ${safe ? `<p class="shell-config-missing__text"><code>${escapeHtmlSnippet(safe)}</code></p>` : ""}
    </div>
  `;
}

/** Sigue visible “Conectando…” demasiado tiempo (Auth no respondió, etc.). */
export function renderBootStuckHelp() {
  if (!document.getElementById("shell-boot")) return;
  dismissShellBoot();
  const main = document.getElementById("main-container");
  if (!main) return;
  document.body.dataset.shell = "guest";
  main.innerHTML = `
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
  `;
}

function escapeHtmlSnippet(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

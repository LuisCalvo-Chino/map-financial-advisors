/**
 * Navegación corta entre pantallas del asistente (orden: Dashboard → Inscripciones → Formulario → Mensajes).
 * @param {HTMLElement | null} mountEl
 * @param {"entries" | "builder" | "form-messages" | "messages"} view
 * @param {string | null | undefined} webinarId Firestore id del webinar (requerido salvo entries)
 */
export function mountWebinarsShortNav(mountEl, view, webinarId) {
  if (!mountEl) return;
  const id = String(webinarId || "").trim();
  const q = id ? `?id=${encodeURIComponent(id)}` : "";
  const cls = "btn-map-secondary btn-map-secondary--small webinars-nav-short__btn";

  if (view === "entries") {
    mountEl.innerHTML = `<a class="${cls}" href="./index.html">Dashboard</a>`;
    return;
  }

  if (view === "builder") {
    let html = `<a class="${cls}" href="./index.html">Dashboard</a>`;
    if (id) {
      html += `<a class="${cls}" href="./entries.html${q}">Inscripciones</a>`;
    }
    mountEl.innerHTML = html;
    return;
  }

  if (!id) {
    mountEl.innerHTML = "";
    return;
  }

  if (view === "form-messages") {
    mountEl.innerHTML =
      `<a class="${cls}" href="./index.html">Dashboard</a>` +
      `<a class="${cls}" href="./entries.html${q}">Inscripciones</a>` +
      `<a class="${cls}" href="./builder.html${q}">Formulario</a>`;
    return;
  }

  if (view === "messages") {
    mountEl.innerHTML =
      `<a class="${cls}" href="./index.html">Dashboard</a>` +
      `<a class="${cls}" href="./entries.html${q}">Inscripciones</a>` +
      `<a class="${cls}" href="./builder.html${q}">Formulario</a>` +
      `<span class="${cls} webinars-nav-short__current" aria-current="page">Mensajes</span>`;
  }
}

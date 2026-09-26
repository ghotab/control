import { suscribirDatosWF } from "./wf-store.js";

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function valor(v) {
  return v ? esc(v) : `<span class="cell-muted">—</span>`;
}

function badgeEstatus(estatus) {
  const clase = estatus === "Terminada" ? "ok" : "warn";
  return `<span class="badge ${clase}">${esc(estatus)}</span>`;
}

function badgeVideo(hayVideo) {
  const clase = hayVideo === "Sí" ? "ok" : "muted";
  return `<span class="badge ${clase}">${esc(hayVideo)}</span>`;
}

function badgeArea(area) {
  if (!area || area === "—") return `<span class="cell-muted">—</span>`;
  const clase = area === "TAB" ? "ok" : area === "MONITOREO" ? "warn" : "muted";
  return `<span class="badge ${clase}">${esc(area)}</span>`;
}

export function montarListaPendientes(root) {
  let baseSeleccionada = "TODAS";
  let estatusFiltro = "TODOS"; // TODOS | Pendiente | Terminada
  let videoFiltro = "TODOS"; // TODOS | Sí | No
  let busquedaAutobus = "";
  let filasExpandidas = new Set(); // idEjFlujo de los reportes abiertos individualmente
  let ultimosDatos = null;

  suscribirDatosWF((datos) => {
    ultimosDatos = datos;
    render();
  });

  function filtrarActual() {
    const lista = ultimosDatos?.lista || [];
    const q = busquedaAutobus.trim().toLowerCase();
    return lista.filter((f) => {
      if (baseSeleccionada !== "TODAS" && f.base !== baseSeleccionada) return false;
      if (estatusFiltro !== "TODOS" && f.estatus !== estatusFiltro) return false;
      if (videoFiltro !== "TODOS" && f.hayVideo !== videoFiltro) return false;
      if (q && !String(f.noEconomico || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function render() {
    try {
      const datos = ultimosDatos;
      if (!datos || !datos.listo || !datos.lista || datos.lista.length === 0) {
        root.innerHTML = vacioHtml();
        return;
      }

      const lista = datos.lista;
      const basesSet = new Set();
      lista.forEach((f) => { if (f.base) basesSet.add(f.base); });
      const bases = [...basesSet].sort();

      const filtrada = filtrarActual();
      const todasAbiertas = filtrada.length > 0 && filtrada.every((f) => filasExpandidas.has(f.idEjFlujo));
      const hayFiltrosActivos = baseSeleccionada !== "TODAS" || estatusFiltro !== "TODOS" || videoFiltro !== "TODOS" || busquedaAutobus.trim() !== "";

      root.innerHTML = `
        <div class="panel">
          <div class="panel-header">
            <div>
              <h3>Pendientes</h3>
              <p>${filtrada.length} de ${lista.length} solicitud${lista.length === 1 ? "" : "es"}</p>
            </div>
            <div class="panel-header-actions">
              <button type="button" class="btn-toggle-todo" id="btn-expandir-todo" ${filtrada.length === 0 ? "disabled" : ""}>
                ${todasAbiertas ? "Contraer todo" : "Expandir todo"}
              </button>
            </div>
          </div>

          <div class="filtros-lista">
            <input
              type="search"
              id="buscar-autobus"
              class="input-buscar"
              placeholder="Buscar por autobús…"
              value="${esc(busquedaAutobus)}"
            />
            <select id="filtro-estatus" class="select-base">
              <option value="TODOS" ${estatusFiltro === "TODOS" ? "selected" : ""}>Estatus: todos</option>
              <option value="Pendiente" ${estatusFiltro === "Pendiente" ? "selected" : ""}>Pendiente</option>
              <option value="Terminada" ${estatusFiltro === "Terminada" ? "selected" : ""}>Terminada</option>
            </select>
            <select id="filtro-video" class="select-base">
              <option value="TODOS" ${videoFiltro === "TODOS" ? "selected" : ""}>¿Hay video?: todos</option>
              <option value="Sí" ${videoFiltro === "Sí" ? "selected" : ""}>Con video</option>
              <option value="No" ${videoFiltro === "No" ? "selected" : ""}>Sin video</option>
            </select>
            ${
              bases.length > 1
                ? `<select id="selector-base-lista" class="select-base">
                    <option value="TODAS" ${baseSeleccionada === "TODAS" ? "selected" : ""}>Todas las bases</option>
                    ${bases.map((b) => `<option value="${esc(b)}" ${baseSeleccionada === b ? "selected" : ""}>${esc(b)}</option>`).join("")}
                  </select>`
                : ""
            }
            ${hayFiltrosActivos ? `<button type="button" class="btn-limpiar-filtros" id="btn-limpiar-filtros">Limpiar filtros</button>` : ""}
          </div>

          <div class="panel-body" style="padding:0;">
            ${filtrada.length === 0 ? `<div class="empty-state">No hay solicitudes para esta búsqueda/filtro.</div>` : tablaHtml(filtrada)}
          </div>
        </div>
      `;
      wireEvents();
    } catch (err) {
      console.error("Error al construir la vista de Pendientes (lista):", err);
      root.innerHTML = `<div class="callout error">Ocurrió un error mostrando la lista: ${esc(err.message || String(err))}.</div>`;
    }
  }

  function tablaHtml(filas) {
    return `
      <div class="table-wrap">
        <table class="data lista-pendientes-table">
          <thead>
            <tr>
              <th></th>
              <th>IdFlujo</th>
              <th>Id Accidente</th>
              <th>Clave Operador</th>
              <th>Nombre Entidad</th>
              <th>Autobús</th>
              <th>Base</th>
              <th>Fecha Incidente</th>
              <th>Hora Incidente</th>
              <th>Fecha Reporte</th>
              <th>Estatus</th>
              <th>¿Hay Video?</th>
              <th>Área Atención</th>
            </tr>
          </thead>
          <tbody>
            ${filas.map((f) => filaHtml(f)).join("")}
          </tbody>
        </table>
      </div>`;
  }

  function filaHtml(f) {
    const abierto = filasExpandidas.has(f.idEjFlujo);
    const principal = `
      <tr class="fila-compacta ${abierto ? "abierta" : ""}" data-toggle-id="${esc(f.idEjFlujo)}" title="Clic para ${abierto ? "cerrar" : "ver"} el detalle">
        <td class="col-chevron">${abierto ? "▾" : "▸"}</td>
        <td class="tabular">${valor(f.idEjFlujo)}</td>
        <td class="tabular">${valor(f.codigoAccidente)}</td>
        <td class="tabular">${valor(f.clave)}</td>
        <td>${valor(f.nombreEntidad || f.nombre)}</td>
        <td class="tabular"><strong>${valor(f.noEconomico)}</strong></td>
        <td>${valor(f.base)}</td>
        <td class="tabular">${valor(f.fechaIncidente)}</td>
        <td class="tabular">${valor(f.horarioIncidente)}</td>
        <td class="tabular">${valor(f.fechaReporte)}</td>
        <td>${badgeEstatus(f.estatus)}</td>
        <td>${badgeVideo(f.hayVideo)}</td>
        <td>${badgeArea(f.areaAtencion)}</td>
      </tr>`;

    if (!abierto) return principal;

    return principal + detalleHtml(f);
  }

  function detalleHtml(f) {
    const esTerminada = f.estatus === "Terminada";
    return `
      <tr class="fila-detalle-lista" data-detalle-de="${esc(f.idEjFlujo)}">
        <td colspan="13">
          <div class="detalle-lista-grid">
            <div>
              <span class="pwf-label">Tramo o lugar del accidente</span>
              <p class="pwf-text">${f.tramoLugar ? esc(f.tramoLugar) : `<span class="cell-muted">Sin información capturada</span>`}</p>
            </div>
            <div>
              <span class="pwf-label">Hechos - relato del conductor</span>
              <p class="pwf-text">${f.hechosRelato ? esc(f.hechosRelato) : `<span class="cell-muted">Sin información capturada</span>`}</p>
            </div>
          </div>
          ${esTerminada ? detalleVideoHtml(f) : ""}
        </td>
      </tr>`;
  }

  /** Solo para tareas terminadas: links de video y observaciones para
   * personal abordo, tomados de la hoja que realmente los tenía (Soporte
   * Técnico si el área de atención fue TAB, Monitoreo si fue MONITOREO). */
  function detalleVideoHtml(f) {
    const links = f.videosDetalle || [];
    const fuente = f.areaAtencion === "MONITOREO" ? "hoja de Monitoreo" : f.areaAtencion === "TAB" ? "hoja de Soporte Técnico" : null;

    return `
      <div class="detalle-lista-grid detalle-video">
        <div class="pwf-full">
          <span class="pwf-label">Links de video ${fuente ? `(de la ${fuente})` : ""}</span>
          ${
            links.length > 0
              ? `<div class="links-video">
                  ${links
                    .map(
                      (url, i) =>
                        `<a class="link-video-btn" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Link video ${i + 1}</a>`
                    )
                    .join("")}
                </div>`
              : `<p class="pwf-text"><span class="cell-muted">Sin links de video cargados</span></p>`
          }
        </div>
        <div class="pwf-full">
          <span class="pwf-label">Observaciones para Personal Abordo</span>
          <p class="pwf-text">${f.observacionesDetalle ? esc(f.observacionesDetalle) : `<span class="cell-muted">Sin observaciones capturadas</span>`}</p>
        </div>
      </div>`;
  }

  function wireEvents() {
    const tabla = root.querySelector("table.lista-pendientes-table");
    if (tabla) {
      tabla.addEventListener("click", (e) => {
        if (e.target.closest("a")) return; // no interceptar clics en los links de video
        const fila = e.target.closest("tr[data-toggle-id]");
        if (!fila) return;
        const id = fila.dataset.toggleId;
        if (filasExpandidas.has(id)) filasExpandidas.delete(id);
        else filasExpandidas.add(id);
        render();
      });
    }

    const btnTodo = document.getElementById("btn-expandir-todo");
    if (btnTodo) {
      btnTodo.addEventListener("click", () => {
        const filtrada = filtrarActual();
        const todasAbiertas = filtrada.length > 0 && filtrada.every((f) => filasExpandidas.has(f.idEjFlujo));
        if (todasAbiertas) filtrada.forEach((f) => filasExpandidas.delete(f.idEjFlujo));
        else filtrada.forEach((f) => filasExpandidas.add(f.idEjFlujo));
        render();
      });
    }

    const sel = document.getElementById("selector-base-lista");
    if (sel) sel.addEventListener("change", (e) => { baseSeleccionada = e.target.value; render(); });

    const selEstatus = document.getElementById("filtro-estatus");
    if (selEstatus) selEstatus.addEventListener("change", (e) => { estatusFiltro = e.target.value; render(); });

    const selVideo = document.getElementById("filtro-video");
    if (selVideo) selVideo.addEventListener("change", (e) => { videoFiltro = e.target.value; render(); });

    const btnLimpiar = document.getElementById("btn-limpiar-filtros");
    if (btnLimpiar) {
      btnLimpiar.addEventListener("click", () => {
        baseSeleccionada = "TODAS";
        estatusFiltro = "TODOS";
        videoFiltro = "TODOS";
        busquedaAutobus = "";
        render();
      });
    }

    const inputBuscar = document.getElementById("buscar-autobus");
    if (inputBuscar) {
      inputBuscar.addEventListener("input", (e) => {
        busquedaAutobus = e.target.value;
        const cursor = e.target.selectionStart;
        render();
        const nuevo = document.getElementById("buscar-autobus");
        if (nuevo) {
          nuevo.focus();
          nuevo.setSelectionRange(cursor, cursor);
        }
      });
    }
  }

  function vacioHtml() {
    return `
      <div class="panel">
        <div class="panel-header">
          <div>
            <h3>Pendientes</h3>
            <p>Lista compacta de solicitudes, pendientes y terminadas</p>
          </div>
        </div>
        <div class="panel-body">
          <div class="empty-state">
            Todavía no hay datos cargados. Ve a <strong>Pendientes WF</strong> y carga tu(s) archivo(s) de
            Workflow — en cuanto termine de procesarlos, esta lista se llena sola.
          </div>
        </div>
      </div>`;
  }
}

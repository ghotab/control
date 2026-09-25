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
  let filasExpandidas = new Set(); // idEjFlujo de los reportes abiertos individualmente
  let ultimosDatos = null;

  suscribirDatosWF((datos) => {
    ultimosDatos = datos;
    render();
  });

  function filtrarActual() {
    const lista = ultimosDatos?.lista || [];
    return baseSeleccionada === "TODAS" ? lista : lista.filter((f) => f.base === baseSeleccionada);
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

      root.innerHTML = `
        <div class="panel">
          <div class="panel-header">
            <div>
              <h3>Pendientes</h3>
              <p>${filtrada.length} solicitud${filtrada.length === 1 ? "" : "es"} ${baseSeleccionada === "TODAS" ? "· todas las bases" : `· base ${esc(baseSeleccionada)}`}</p>
            </div>
            <div class="panel-header-actions">
              <button type="button" class="btn-toggle-todo" id="btn-expandir-todo" ${filtrada.length === 0 ? "disabled" : ""}>
                ${todasAbiertas ? "Contraer todo" : "Expandir todo"}
              </button>
              ${
                bases.length > 1
                  ? `<select id="selector-base-lista" class="select-base">
                      <option value="TODAS" ${baseSeleccionada === "TODAS" ? "selected" : ""}>Todas las bases</option>
                      ${bases.map((b) => `<option value="${esc(b)}" ${baseSeleccionada === b ? "selected" : ""}>${esc(b)}</option>`).join("")}
                    </select>`
                  : ""
              }
            </div>
          </div>
          <div class="panel-body" style="padding:0;">
            ${filtrada.length === 0 ? `<div class="empty-state">No hay solicitudes para esta selección.</div>` : tablaHtml(filtrada)}
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

    return (
      principal +
      `
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
        </td>
      </tr>`
    );
  }

  function wireEvents() {
    const tabla = root.querySelector("table.lista-pendientes-table");
    if (tabla) {
      tabla.addEventListener("click", (e) => {
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
        if (todasAbiertas) {
          filtrada.forEach((f) => filasExpandidas.delete(f.idEjFlujo));
        } else {
          filtrada.forEach((f) => filasExpandidas.add(f.idEjFlujo));
        }
        render();
      });
    }

    const sel = document.getElementById("selector-base-lista");
    if (sel) sel.addEventListener("change", (e) => { baseSeleccionada = e.target.value; render(); });
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

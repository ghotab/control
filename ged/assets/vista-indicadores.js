import { suscribirDatosWF } from "./wf-store.js";

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function chipPorcentaje(pct) {
  if (pct === null || pct === undefined) return `<span class="cell-muted">Sin solicitudes</span>`;
  const hue = Math.max(0, Math.min(120, (pct / 100) * 120));
  return `<span class="chip-pct" style="background:hsl(${hue}, 72%, 40%)">${pct}%</span>`;
}

export function montarIndicadores(root) {
  const cancelar = suscribirDatosWF((datos) => render(datos));

  // Si el usuario navega fuera de esta vista y el nodo se descarta, no pasa
  // nada por dejar la suscripción activa (el store es del tamaño de la
  // sesión); si más adelante se desmonta explícitamente, aquí está `cancelar`.

  function render(datos) {
    if (!datos.listo) {
      root.innerHTML = vacioHtml();
      return;
    }

    const { pendientes, terminadas } = datos;
    const basesSet = new Set();
    [...pendientes, ...terminadas].forEach((f) => { if (f.base) basesSet.add(f.base); });
    const bases = [...basesSet].sort();

    if (bases.length === 0) {
      root.innerHTML = vacioHtml();
      return;
    }

    const filas = bases
      .map((b) => {
        const term = terminadas.filter((f) => f.base === b).length;
        const pend = pendientes.filter((f) => f.base === b).length;
        const total = term + pend;
        const pct = total > 0 ? Math.round((term / total) * 100) : null;
        return { base: b, term, pend, total, pct };
      })
      .sort((a, b) => (a.pct ?? 101) - (b.pct ?? 101));

    const totalTerm = terminadas.length;
    const totalPend = pendientes.length;
    const totalGeneral = totalTerm + totalPend;
    const pctGeneral = totalGeneral > 0 ? Math.round((totalTerm / totalGeneral) * 100) : null;

    const enRiesgo = pendientes.filter((f) => f.diasTranscurridos !== null && f.diasTranscurridos >= 3 && f.diasTranscurridos < 7).length;
    const criticos = pendientes.filter((f) => f.diasTranscurridos !== null && f.diasTranscurridos >= 7).length;

    root.innerHTML = `
      <div class="stat-row">
        <div class="stat-card"><div class="label">Pendientes · todas las bases</div><div class="value">${totalPend}</div></div>
        <div class="stat-card ok"><div class="label">Terminadas · todas las bases</div><div class="value">${totalTerm}</div></div>
        <div class="stat-card warn"><div class="label">Pendientes 3–6 días</div><div class="value">${enRiesgo}</div></div>
        <div class="stat-card danger"><div class="label">Pendientes 7+ días</div><div class="value">${criticos}</div></div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div>
            <h3>Indicadores por base</h3>
            <p>Terminados, pendientes y % de entrega — ordenado de menor a mayor alcance</p>
          </div>
        </div>
        <div class="panel-body" style="padding:0;">
          <div class="table-wrap">
            <table class="data indicadores-table">
              <thead>
                <tr>
                  <th>Base</th>
                  <th>Terminados</th>
                  <th>Pendientes</th>
                  <th>Total solicitudes</th>
                  <th>% de entrega</th>
                </tr>
              </thead>
              <tbody>
                ${filas
                  .map(
                    (f) => `
                  <tr>
                    <td>${esc(f.base)}</td>
                    <td class="tabular">${f.term}</td>
                    <td class="tabular">${f.pend}</td>
                    <td class="tabular">${f.total}</td>
                    <td>${chipPorcentaje(f.pct)}</td>
                  </tr>`
                  )
                  .join("")}
              </tbody>
              <tfoot>
                <tr class="fila-total">
                  <td>Total general</td>
                  <td class="tabular">${totalTerm}</td>
                  <td class="tabular">${totalPend}</td>
                  <td class="tabular">${totalGeneral}</td>
                  <td>${chipPorcentaje(pctGeneral)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function vacioHtml() {
    return `
      <div class="panel">
        <div class="panel-header">
          <div>
            <h3>Indicadores por base</h3>
            <p>Terminados, pendientes y % de entrega por base</p>
          </div>
        </div>
        <div class="panel-body">
          <div class="empty-state">
            Todavía no hay datos cargados. Ve a <strong>Pendientes WF</strong> y carga tu(s) archivo(s) de
            Workflow — en cuanto termine de procesarlos, aquí aparecen los indicadores automáticamente.
          </div>
        </div>
      </div>`;
  }
}

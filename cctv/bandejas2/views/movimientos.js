/**
 * movimientos.js — Vista de Movimientos Recientes.
 * Equivalente a movimientos.html
 */

import { cargarMovimientos } from "../modules/dataStore.js";
import { exportarCSV } from "../modules/csvExport.js";
import { formatFechaCort } from "../modules/formato.js";
import { filtrarPorQuery } from "../modules/filtros.js";

const BASES = [
    { c: "TODAS", n: "Todas las bases" },
    { c: "ACAP", n: "Acapulco" }, { c: "ATLA", n: "Atlacomulco" },
    { c: "COLI", n: "Colima" }, { c: "GDLJ", n: "Guadalajara" },
    { c: "GUZM", n: "Ciudad Guzmán" }, { c: "JILO", n: "Jilotepec" },
    { c: "JRIO", n: "San Juan del Río" }, { c: "MORE", n: "Morelia" },
    { c: "OFOC", n: "Occidente" }, { c: "TSAT", n: "Saturno" },
    { c: "TOLU", n: "Toluca" },
];

let _datos = [];
let _base = "TODAS";
let _periodo = "SEMANA";
let _query = "";
let _autoRefreshTimer = null;

export function getTemplate() {
    return `
    <div class="view-movimientos">
      <div class="view-filters">
        <div class="filter-group">
          <label class="filter-label">Base operativa</label>
          <div class="chip-scroll" id="mov-bases">
            ${BASES.map(b => `<button class="chip ${b.c === 'TODAS' ? 'active' : ''}" data-base="${b.c}">${b.n}</button>`).join("")}
          </div>
        </div>
        <div class="filter-group">
          <label class="filter-label">Periodo</label>
          <div class="chip-row">
            ${["HOY","AYER","SEMANA","MES"].map(p => `<button class="chip ${p === 'SEMANA' ? 'active' : ''}" data-periodo="${p}">${p === 'SEMANA' ? 'Últ. 7 días' : p === 'MES' ? 'Últ. mes' : p.charAt(0)+p.slice(1).toLowerCase()}</button>`).join("")}
            <button class="btn-export" id="mov-export"><i class="fa-solid fa-download"></i> Exportar CSV</button>
          </div>
        </div>
      </div>
      <div class="view-status" id="mov-status">Cargando...</div>
      <div class="card-list" id="mov-list"></div>
    </div>`;
}

export async function mount(container, query) {
    _query = query || "";
    _base = "TODAS";
    _periodo = "SEMANA";

    container.innerHTML = getTemplate();
    _bindEvents(container);
    await _load();
    _startAutoRefresh();
}

export function unmount() {
    _stopAutoRefresh();
}

export function onSearchChange(q) {
    _query = q;
    _render();
}

function _bindEvents(container) {
    container.querySelectorAll("[data-base]").forEach(btn => {
        btn.addEventListener("click", () => {
            container.querySelectorAll("[data-base]").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            _base = btn.dataset.base;
            _load();
        });
    });

    container.querySelectorAll("[data-periodo]").forEach(btn => {
        btn.addEventListener("click", () => {
            container.querySelectorAll("[data-periodo]").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            _periodo = btn.dataset.periodo;
            _load();
        });
    });

    container.querySelector("#mov-export")?.addEventListener("click", () => {
        exportarCSV(_datos, _base, _periodo);
    });
}

async function _load() {
    const status = document.getElementById("mov-status");
    if (status) status.textContent = "Actualizando...";

    try {
        _datos = await cargarMovimientos({ base: _base, periodo: _periodo });
        _render();
        if (status) {
            const hora = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            status.textContent = `${_datos.length.toLocaleString("es-MX")} registros · Sincronizado ${hora}`;
        }
    } catch (e) {
        console.error("[Movimientos]", e);
        if (status) status.textContent = "Error de conexión";
    }
}

function _render() {
    const list = document.getElementById("mov-list");
    if (!list) return;

    const datos = filtrarPorQuery(_datos, _query);

    if (datos.length === 0) {
        list.innerHTML = `<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Sin movimientos para este filtro</p></div>`;
        return;
    }

    list.innerHTML = datos.map(r => _cardHTML(r)).join("");
}

function _cardHTML(r) {
    const sube = r.bandeja_sube || null;
    const baja = r.bandeja_baja || null;
    const tipo = sube && baja ? "swap" : sube ? "sube" : "baja";
    const colores = { swap: "var(--s-seguro)", sube: "var(--s-activo)", baja: "var(--s-critico)" };
    const accentColor = colores[tipo];

    return `
    <div class="record-card" style="--card-accent: ${accentColor}">
      <div class="card-top">
        <div class="card-folio">
          <span class="folio-id">${r.numero_economico || "—"}</span>
          <span class="folio-ts"><i class="fa-regular fa-clock"></i> ${formatFechaCort(r.fecha_hora)}</span>
        </div>
        <div class="card-badges">
          ${sube ? `<span class="badge badge-up"><i class="fa-solid fa-arrow-up"></i> ${sube}</span>` : ""}
          ${baja ? `<span class="badge badge-down"><i class="fa-solid fa-arrow-down"></i> ${baja}</span>` : ""}
        </div>
      </div>
      <div class="card-grid">
        <div class="card-cell"><span class="cell-label">BASE</span><span class="cell-val">${r.base || "—"}</span></div>
        <div class="card-cell"><span class="cell-label">TÉCNICO</span><span class="cell-val">${r.clave_colaborador || "—"}</span></div>
        <div class="card-cell"><span class="cell-label">SUBE</span><span class="cell-val mono ${sube ? 'txt-up' : 'txt-muted'}">${sube || "—"}</span></div>
        <div class="card-cell"><span class="cell-label">BAJA</span><span class="cell-val mono ${baja ? 'txt-down' : 'txt-muted'}">${baja || "—"}</span></div>
      </div>
    </div>`;
}

function _startAutoRefresh() {
    _stopAutoRefresh();
    _autoRefreshTimer = setInterval(() => {
        if (!document.hidden) _load();
    }, 30000);
}

function _stopAutoRefresh() {
    if (_autoRefreshTimer) { clearInterval(_autoRefreshTimer); _autoRefreshTimer = null; }
}

/** Retorna el conteo de registros cargados para el badge del tab. */
export function getCount() { return _datos.length; }

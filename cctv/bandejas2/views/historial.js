/**
 * historial.js — Vista de Trazabilidad de Bandejas.
 * Equivalente a historial.html
 */

import { getHistorialAsc } from "../modules/dataStore.js";
import { calcularCiclos } from "../modules/calculos.js";
import { formatFechaCort, calcularDuracionStr } from "../modules/formato.js";

let _modo = "bus"; // "bus" | "disco"
let _query = "";

export function getTemplate() {
    return `
    <div class="view-historial">
      <div class="view-filters">
        <div class="chip-row">
          <button class="chip active" data-modo="bus"><i class="fa-solid fa-bus"></i> Por Autobús</button>
          <button class="chip" data-modo="disco"><i class="fa-solid fa-hard-drive"></i> Por Bandeja</button>
        </div>
        <p class="filter-hint">Ingresa el número económico o el código de bandeja en la barra de búsqueda.</p>
      </div>
      <div class="view-status" id="hist-status"></div>
      <div class="card-list" id="hist-list">
        <div class="empty-state"><i class="fa-solid fa-timeline"></i><p>Ingresa un número de autobús o el código de una bandeja para ver su bitácora completa.</p></div>
      </div>
    </div>`;
}

export async function mount(container, query) {
    _query = query || "";
    _modo = "bus";

    container.innerHTML = getTemplate();
    _bindEvents(container);

    if (_query) _render();
}

export function unmount() {}

export function onSearchChange(q) {
    _query = q;
    _render();
}

function _bindEvents(container) {
    container.querySelectorAll("[data-modo]").forEach(btn => {
        btn.addEventListener("click", () => {
            container.querySelectorAll("[data-modo]").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            _modo = btn.dataset.modo;
            _render();
        });
    });
}

function _render() {
    const list = document.getElementById("hist-list");
    const status = document.getElementById("hist-status");
    if (!list) return;

    const q = _query.trim().toUpperCase();

    if (!q) {
        list.innerHTML = `<div class="empty-state"><i class="fa-solid fa-timeline"></i><p>Ingresa un número de autobús o el código de una bandeja.</p></div>`;
        if (status) status.textContent = "";
        return;
    }

    const historial = getHistorialAsc();
    const ciclos = calcularCiclos(historial, q, _modo);

    if (ciclos.length === 0) {
        list.innerHTML = `<div class="empty-state"><i class="fa-solid fa-magnifying-glass"></i><p>Sin registros para "${q}".</p></div>`;
        if (status) status.textContent = "";
        return;
    }

    if (status) status.textContent = `${ciclos.length} ciclo(s) encontrado(s)`;
    list.innerHTML = ciclos.map(c => _cardCiclo(c, q)).join("");
}

function _cardCiclo({ rSube, rBaja, status }, q) {
    const stampMap = {
        finalizado:    { cls: "pill-seguro",   icon: "fa-circle-check",        label: "Ciclo cerrado" },
        activo:        { cls: "pill-activo",    icon: "fa-circle-play",         label: "En operación" },
        inconsistente: { cls: "pill-critico",   icon: "fa-triangle-exclamation",label: "Sin cierre" },
    };
    const st = stampMap[status] || stampMap.activo;

    const titulo = _modo === "bus" ? rSube.bandeja_sube : `Unidad ${rSube.numero_economico}`;
    const f1 = formatFechaCort(rSube.fecha_hora);
    const f2 = rBaja ? formatFechaCort(rBaja.fecha_hora) : (status === "inconsistente" ? "Desconocida" : "Activo");
    const meta2 = rBaja
        ? `${rBaja.clave_colaborador} · ${rBaja.base}`
        : "Bandeja activa en la unidad";
    const duracion = rBaja ? calcularDuracionStr(rSube.fecha_hora, rBaja.fecha_hora) : "En tránsito";

    return `
    <div class="record-card hist-card">
      <div class="card-top">
        <div class="card-folio">
          <span class="folio-id">${titulo}</span>
          <span class="folio-ts"><i class="fa-regular fa-clock"></i> ${f1}</span>
        </div>
        <span class="status-pill ${st.cls}">
          <i class="fa-solid ${st.icon}"></i> ${st.label}
        </span>
      </div>
      <div class="timeline">
        <div class="tl-node tl-up">
          <span class="tl-label">Instalación (subida)</span>
          <span class="tl-val">${f1}</span>
          <span class="tl-meta">${rSube.clave_colaborador} · ${rSube.base}</span>
        </div>
        <div class="tl-node ${status === 'finalizado' ? 'tl-down' : 'tl-active'}">
          <span class="tl-label">${status === 'finalizado' ? 'Retiro (bajada)' : 'Estado actual'}</span>
          <span class="tl-val">${f2}</span>
          <span class="tl-meta">${meta2}</span>
        </div>
      </div>
      <div class="hist-footer"><i class="fa-solid fa-hourglass-half"></i> Permanencia: ${duracion}</div>
    </div>`;
}

export function getCount() { return 0; }

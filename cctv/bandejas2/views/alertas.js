/**
 * alertas.js — Vista de Riesgos de Sobreescritura.
 * Equivalente a owalert.html
 */

import { getHistorialDesc, getFlota } from "../modules/dataStore.js";
import { calcularEstadoFlota, enriquecerConRiesgo } from "../modules/calculos.js";
import { filtrarPorBase, filtrarPorEstatus } from "../modules/filtros.js";
import { formatFechaCort } from "../modules/formato.js";

let _lista = []; // lista enriquecida de unidades
let _filtro = "todos";
let _base = "todas";
let _query = "";

export function getTemplate() {
    return `
    <div class="view-alertas">
      <div class="view-filters">
        <div class="chip-row">
          <button class="chip active" data-filtro="todos"><i class="fa-solid fa-grid-2"></i> Flota completa</button>
          <button class="chip chip-critico" data-filtro="critico"><i class="fa-solid fa-triangle-exclamation"></i> Críticos <span id="badge-critico" class="chip-badge">0</span></button>
          <button class="chip" data-filtro="vacio"><i class="fa-solid fa-hdd"></i> Sin disco</button>
        </div>
        <div class="base-picker" id="alertas-bases"></div>
      </div>
      <div class="view-status" id="alertas-status"></div>
      <div class="card-list" id="alertas-list"></div>
    </div>`;
}

export async function mount(container, query) {
    _query = query || "";
    _filtro = "todos";
    _base = "todas";

    container.innerHTML = getTemplate();
    _buildBasePicker(container);
    _bindEvents(container);
    _computeAndRender();
}

export function unmount() {}

export function onSearchChange(q) {
    _query = q;
    _render();
}

function _buildBasePicker(container) {
    const flota = getFlota();
    const bases = [...new Set(flota.map(u => u.base))].filter(Boolean).sort();
    const picker = container.querySelector("#alertas-bases");
    if (!picker) return;

    picker.innerHTML = `<button class="chip active" data-ab="todas">Todas</button>` +
        bases.map(b => `<button class="chip" data-ab="${b}">${b}</button>`).join("");

    picker.querySelectorAll("[data-ab]").forEach(btn => {
        btn.addEventListener("click", () => {
            picker.querySelectorAll("[data-ab]").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            _base = btn.dataset.ab;
            _render();
        });
    });
}

function _bindEvents(container) {
    container.querySelectorAll("[data-filtro]").forEach(btn => {
        btn.addEventListener("click", () => {
            container.querySelectorAll("[data-filtro]").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            _filtro = btn.dataset.filtro;
            _render();
        });
    });
}

function _computeAndRender() {
    const histDesc = getHistorialDesc();
    const flota = getFlota();

    const estadoMap = calcularEstadoFlota(histDesc);

    _lista = flota.map(unidad => {
        const busId = unidad.autobus?.toString().trim();
        if (!busId) return null;
        const estado = estadoMap.get(busId) || { tieneDisco: false };
        const enriquecido = enriquecerConRiesgo({ ...estado, eco: busId, base: unidad.base || "N/D" });
        return enriquecido;
    }).filter(Boolean);

    // Ordenar: más viejos primero, sin disco al final
    _lista.sort((a, b) => {
        if (a.dias === -1 && b.dias !== -1) return 1;
        if (a.dias !== -1 && b.dias === -1) return -1;
        return (a.fechaInstalacion?.getTime() || 0) - (b.fechaInstalacion?.getTime() || 0);
    });

    _render();
}

function _render() {
    const list = document.getElementById("alertas-list");
    const status = document.getElementById("alertas-status");
    if (!list) return;

    let resultado = _lista;
    if (_base !== "todas") resultado = filtrarPorBase(resultado, _base);
    resultado = filtrarPorEstatus(resultado, _filtro);
    if (_query) {
        const q = _query.toUpperCase();
        resultado = resultado.filter(i => i.eco?.toString().includes(q));
    }

    const nCriticos = _lista.filter(i => i.nivelRiesgo === "critico").length;
    const badgeEl = document.getElementById("badge-critico");
    if (badgeEl) badgeEl.textContent = nCriticos;

    if (status) status.textContent = `${resultado.length} unidades mostradas`;

    if (resultado.length === 0) {
        list.innerHTML = `<div class="empty-state"><i class="fa-solid fa-shield-check"></i><p>No hay unidades en este filtro</p></div>`;
        return;
    }

    list.innerHTML = resultado.map(item => _cardHTML(item)).join("");
}

function _cardHTML(item) {
    const colMap = {
        critico: { accent: "var(--s-critico)", bg: "var(--s-critico-bg)", label: "CRÍTICO", icon: "fa-triangle-exclamation" },
        alerta:  { accent: "var(--s-alerta)",  bg: "var(--s-alerta-bg)",  label: "ALERTA",  icon: "fa-circle-exclamation" },
        seguro:  { accent: "var(--s-seguro)",  bg: "var(--s-seguro-bg)",  label: "SEGURO",  icon: "fa-circle-check" },
        vacio:   { accent: "var(--s-vacio)",   bg: "var(--s-vacio-bg)",   label: "SIN DISCO", icon: "fa-hdd" },
    };
    const col = colMap[item.nivelRiesgo] || colMap.vacio;

    const pct = item.pctRiesgo || 0;
    const diasTxt = item.dias >= 0 ? `${item.dias} días` : "—";
    const fechaTxt = item.fechaInstalacion ? formatFechaCort(item.fechaInstalacion.toISOString()) : "Sin dato";
    const bandejaTxt = item.bandeja || "—";

    return `
    <div class="record-card" style="--card-accent: ${col.accent}">
      <div class="card-top">
        <div class="card-folio">
          <span class="folio-id">${item.eco}</span>
          <span class="folio-ts"><i class="fa-solid fa-location-dot"></i> ${item.base}</span>
        </div>
        <span class="status-pill" style="background:${col.bg}; color:${col.accent}">
          <i class="fa-solid ${col.icon}"></i> ${col.label}
        </span>
      </div>
      <div class="risk-bar-wrap">
        <div class="risk-bar-head" style="color:${col.accent}">
          <span>Riesgo de sobreescritura</span><span>${pct}%</span>
        </div>
        <div class="risk-bar-bg"><div class="risk-bar-fill" style="width:${pct}%; background:${col.accent}"></div></div>
      </div>
      <div class="card-grid">
        <div class="card-cell"><span class="cell-label">BANDEJA</span><span class="cell-val mono">${bandejaTxt}</span></div>
        <div class="card-cell"><span class="cell-label">DÍAS A BORDO</span><span class="cell-val ${item.dias >= 6 ? 'txt-critico' : ''}">${diasTxt}</span></div>
        <div class="card-cell"><span class="cell-label">BASE</span><span class="cell-val">${item.base}</span></div>
        <div class="card-cell"><span class="cell-label">INSTALADA</span><span class="cell-val">${fechaTxt}</span></div>
      </div>
    </div>`;
}

export function getCount() {
    return _lista.filter(i => i.nivelRiesgo === "critico").length;
}

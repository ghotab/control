/**
 * inventario.js — Vista de Inventario de Sitio (Escaneo Masivo).
 * Equivalente a inventario.html
 */

import { iniciar as scanStart, detener as scanStop, estaActivo as scanActivo } from "../modules/scanner.js";
import { recuperar, guardar } from "../modules/localPref.js";
import { enviarInventarioMasivo } from "../modules/registro.js";

const BASES = ["ATLA","COLI","GDLJ","GUZM","JILO","MORE","OFOC","TOLU","TSAT"];
const UBICACIONES = [
    { v: "OFICINA-OPERATIVO",    l: "Oficina TAB" },
    { v: "ANALISIS-OPERATIVO",   l: "Análisis Estadístico" },
    { v: "RESGUARDO-INOPERANTE", l: "Bajo Resguardo" },
    { v: "REVISION-INOPERANTE",  l: "En Revisión/Daño" },
];

let _escaneados = new Set();
let _modoInput = "camara"; // "camara" | "usb"

export function getTemplate() {
    const baseOpts = BASES.map(b => `<option value="${b}">${b}</option>`).join("");
    const ubOpts = UBICACIONES.map(u => `<option value="${u.v}">${u.l}</option>`).join("");

    return `
    <div class="view-inventario">
      <div class="inv-section">
        <p class="inv-section-title">Responsable del Inventario</p>
        <div class="form-card">
          <div class="form-row">
            <span class="form-label">Base</span>
            <select id="inv-base" class="form-ctrl">
              <option value="">Seleccionar...</option>${baseOpts}
            </select>
          </div>
          <div class="form-row">
            <span class="form-label">Colaborador</span>
            <input type="number" id="inv-tecnico" class="form-ctrl" placeholder="Clave">
          </div>
        </div>
      </div>

      <div class="inv-section">
        <p class="inv-section-title">Ubicación de las bandejas</p>
        <div class="form-card">
          <div class="form-row">
            <span class="form-label">Sitio</span>
            <select id="inv-sitio" class="form-ctrl">${ubOpts}</select>
          </div>
        </div>
      </div>

      <div class="inv-section">
        <p class="inv-section-title">Método de captura</p>
        <div class="chip-row" style="padding: 0 0 12px 0;">
          <button class="chip active" data-invmode="camara"><i class="fa-solid fa-camera"></i> Cámara</button>
          <button class="chip" data-invmode="usb"><i class="fa-solid fa-keyboard"></i> Escáner USB</button>
        </div>

        <div id="inv-camara-wrap">
          <div id="inv-qr-reader"></div>
          <button class="btn-camara" id="inv-btn-camara"><i class="fa-solid fa-qrcode"></i> Iniciar escaneo continuo</button>
        </div>

        <div id="inv-usb-wrap" style="display:none">
          <div class="form-card">
            <div class="form-row">
              <input type="text" id="inv-usb-input" class="form-ctrl" placeholder="Haz clic aquí y escanea...">
            </div>
          </div>
          <p class="filter-hint">El escáner debe enviar Enter después de cada lectura.</p>
        </div>
      </div>

      <div class="inv-section">
        <p class="inv-section-title">Bandejas detectadas <span class="inv-count" id="inv-count">0</span></p>
        <div class="form-card" id="inv-lista">
          <p class="inv-empty" id="inv-empty-msg">No hay bandejas escaneadas aún.</p>
        </div>
      </div>

      <div style="height: 90px"></div>
      <button class="btn-save-float" id="inv-btn-guardar" style="display:none" disabled>
        <i class="fa-solid fa-cloud-arrow-up"></i> Finalizar y enviar inventario
      </button>
    </div>`;
}

export async function mount(container) {
    _escaneados = new Set();
    _modoInput = "camara";

    container.innerHTML = getTemplate();
    _restorePrefs();
    _bindEvents(container);
}

export async function unmount() {
    if (scanActivo()) await scanStop();
}

export function onSearchChange() {}

function _restorePrefs() {
    const base = recuperar("base");
    const tecnico = recuperar("tecnico");
    if (base) document.getElementById("inv-base").value = base;
    if (tecnico) document.getElementById("inv-tecnico").value = tecnico;
}

function _bindEvents(container) {
    // Modo de captura
    container.querySelectorAll("[data-invmode]").forEach(btn => {
        btn.addEventListener("click", async () => {
            container.querySelectorAll("[data-invmode]").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            _modoInput = btn.dataset.invmode;

            if (_modoInput === "usb") {
                if (scanActivo()) await scanStop();
                document.getElementById("inv-btn-camara").textContent = "Iniciar escaneo continuo";
                document.getElementById("inv-camara-wrap").style.display = "none";
                document.getElementById("inv-usb-wrap").style.display = "block";
                document.getElementById("inv-usb-input").focus();
            } else {
                document.getElementById("inv-usb-wrap").style.display = "none";
                document.getElementById("inv-camara-wrap").style.display = "block";
            }
        });
    });

    // Botón cámara
    document.getElementById("inv-btn-camara").addEventListener("click", async () => {
        const btn = document.getElementById("inv-btn-camara");
        if (!scanActivo()) {
            try {
                await scanStart("inv-qr-reader", codigo => _agregarBandeja(codigo));
                btn.innerHTML = `<i class="fa-solid fa-stop"></i> Detener cámara`;
                btn.classList.add("btn-camara-stop");
            } catch (e) {
                alert("No se pudo acceder a la cámara: " + e.message);
            }
        } else {
            await scanStop();
            btn.innerHTML = `<i class="fa-solid fa-qrcode"></i> Iniciar escaneo continuo`;
            btn.classList.remove("btn-camara-stop");
        }
    });

    // Input USB
    document.getElementById("inv-usb-input").addEventListener("keypress", e => {
        if (e.key === "Enter") {
            const val = e.target.value.trim().toUpperCase();
            if (val) { _agregarBandeja(val); e.target.value = ""; }
        }
    });

    // Persistir base y técnico
    document.getElementById("inv-base").addEventListener("change", e => guardar("base", e.target.value));
    document.getElementById("inv-tecnico").addEventListener("input", e => guardar("tecnico", e.target.value));

    // Guardar inventario
    document.getElementById("inv-btn-guardar").addEventListener("click", _guardar);
}

function _agregarBandeja(codigo) {
    if (_escaneados.has(codigo)) return;
    _escaneados.add(codigo);

    document.getElementById("inv-empty-msg").style.display = "none";

    const item = document.createElement("div");
    item.className = "form-row inv-item";
    item.innerHTML = `<span class="cell-val mono">${codigo}</span><i class="fa-solid fa-circle-check" style="color:var(--s-seguro)"></i>`;
    const lista = document.getElementById("inv-lista");
    lista.insertBefore(item, lista.firstChild);

    document.getElementById("inv-count").textContent = _escaneados.size;
    const btn = document.getElementById("inv-btn-guardar");
    btn.style.display = "flex";
    btn.disabled = false;
}

async function _guardar() {
    if (_escaneados.size === 0) { alert("Escanea al menos una bandeja."); return; }

    const base = document.getElementById("inv-base").value;
    const tecnico = document.getElementById("inv-tecnico").value;
    const sitio = document.getElementById("inv-sitio").value;

    if (!base || !tecnico) { alert("Completa base y clave de colaborador primero."); return; }

    const btn = document.getElementById("inv-btn-guardar");
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Enviando...`;

    try {
        await enviarInventarioMasivo({ base, tecnico, sitio, listaBandejas: Array.from(_escaneados) });
        alert(`✅ Inventario de ${_escaneados.size} bandejas guardado.`);
        _escaneados = new Set();
        document.getElementById("inv-count").textContent = 0;
        document.getElementById("inv-lista").innerHTML = `<p class="inv-empty" id="inv-empty-msg">No hay bandejas escaneadas aún.</p>`;
        btn.style.display = "none";
    } catch (e) {
        alert("Error de conexión: " + e.message);
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Finalizar y enviar inventario`;
    }
}

export function getCount() { return _escaneados.size; }

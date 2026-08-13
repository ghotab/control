/**
 * registrar.js — Vista de Registro de Cambio de Bandeja.
 * Equivalente a registrarcambio.html
 */

import { iniciar as scanStart, detener as scanStop, estaActivo as scanActivo } from "../modules/scanner.js";
import { recuperar, guardar, borrar } from "../modules/localPref.js";
import { consultarUltimoDisco, enviarCambio } from "../modules/registro.js";

const BASES = [
    { c: "ATLA", n: "Atlacomulco" }, { c: "COLI", n: "Colima" },
    { c: "GDLJ", n: "Guadalajara" }, { c: "GUZM", n: "Ciudad Guzmán" },
    { c: "JILO", n: "Jilotepec" }, { c: "MORE", n: "Morelia" },
    { c: "OFOC", n: "Occidente" }, { c: "TOLU", n: "Toluca" },
    { c: "TSAT", n: "Saturno" },
];

let _discoActualBD = "";
let _campoActivo = null; // "bandejaSube" | "bandejaBaja"

export function getTemplate() {
    const baseOpts = BASES.map(b => `<option value="${b.c}">${b.n}</option>`).join("");

    return `
    <div class="view-registrar">
      <div id="reg-error-banner" class="reg-banner reg-banner-error" style="display:none">
        <i class="fa-solid fa-triangle-exclamation"></i> No hay conexión con la base de datos.
      </div>

      <div class="inv-section">
        <div class="section-header-row">
          <p class="inv-section-title">General</p>
          <button class="link-btn" id="reg-btn-cambiar-usuario">Cambiar usuario</button>
        </div>
        <div class="form-card">
          <div class="form-row">
            <span class="form-label">Ubicación</span>
            <select id="reg-base" class="form-ctrl">
              <option value="">Seleccionar...</option>${baseOpts}
            </select>
          </div>
          <div class="form-row">
            <span class="form-label">Colaborador</span>
            <input type="number" id="reg-tecnico" class="form-ctrl" placeholder="Clave">
          </div>
          <div class="form-row">
            <span class="form-label">Autobús</span>
            <input type="number" id="reg-eco" class="form-ctrl" placeholder="Económico (5 dígitos)">
          </div>
        </div>
      </div>

      <div id="reg-seccion-escaneo" class="inv-section reg-seccion-disabled">
        <p class="inv-section-title">Bandejas</p>
        <div id="reg-qr-reader"></div>
        <div class="form-card">
          <div class="form-row scan-row">
            <span class="form-label">Bandeja que subes</span>
            <button class="btn-scan" id="reg-scan-sube" title="Escanear"><i class="fa-solid fa-qrcode"></i></button>
          </div>
          <div class="form-row">
            <input type="text" id="reg-bandeja-sube" class="form-ctrl" placeholder="Escanear entrada" readonly>
          </div>
          <div class="form-row scan-row" style="border-top: 1px solid var(--border)">
            <span class="form-label">Bandeja que bajas</span>
            <button class="btn-scan" id="reg-scan-baja" title="Escanear"><i class="fa-solid fa-qrcode"></i></button>
          </div>
          <div class="form-row">
            <input type="text" id="reg-bandeja-baja" class="form-ctrl" placeholder="Escanear salida" readonly>
          </div>
        </div>

        <div id="reg-banner-inconsistencia" class="reg-banner reg-banner-warn" style="display:none">
          <p class="reg-banner-title"><i class="fa-solid fa-triangle-exclamation"></i> Disco no corresponde al registro</p>
          <p class="reg-disco-esperado">Esperábamos bajar: <strong id="reg-disco-esperado-val">—</strong></p>
          <div class="form-card" style="margin-top:10px">
            <div class="form-row">
              <input type="text" id="reg-justificacion" class="form-ctrl" placeholder="Explicar motivo de discrepancia" style="text-align:left">
            </div>
          </div>
        </div>
      </div>

      <div class="inv-section">
        <p class="inv-section-title">Diagnóstico</p>
        <div class="form-card">
          <div class="form-row">
            <span class="form-label">¿Formateado?</span>
            <select id="reg-formateo" class="form-ctrl">
              <option value="NO">No</option>
              <option value="SI">Sí</option>
            </select>
          </div>
          <div class="form-row" id="reg-div-motivo" style="display:none">
            <input type="text" id="reg-motivo" class="form-ctrl" placeholder="Razón del formateo" style="text-align:left">
          </div>
          <div class="form-row">
            <span class="form-label">LED</span>
            <select id="reg-led" class="form-ctrl">
              <option value="OK">🟢 Grabando</option>
              <option value="FALLA">🔴 Falla</option>
            </select>
          </div>
        </div>
      </div>

      <div style="height: 90px"></div>
      <button class="btn-save-float" id="reg-btn-enviar">
        <i class="fa-solid fa-floppy-disk"></i> Guardar Registro
      </button>
    </div>`;
}

export async function mount(container) {
    _discoActualBD = "";
    _campoActivo = null;

    container.innerHTML = getTemplate();
    _restorePrefs();
    _bindEvents();
    _validarProgreso();
}

export async function unmount() {
    if (scanActivo()) await scanStop();
}

export function onSearchChange() {}

function _restorePrefs() {
    const base = recuperar("base");
    const tecnico = recuperar("tecnico");
    if (base) document.getElementById("reg-base").value = base;
    if (tecnico) document.getElementById("reg-tecnico").value = tecnico;
}

function _bindEvents() {
    document.getElementById("reg-base").addEventListener("change", e => {
        guardar("base", e.target.value); _validarProgreso();
    });
    document.getElementById("reg-tecnico").addEventListener("input", e => {
        guardar("tecnico", e.target.value); _validarProgreso();
    });
    document.getElementById("reg-eco").addEventListener("input", async () => {
        _validarProgreso();
        const eco = document.getElementById("reg-eco").value.trim();
        if (eco.length === 5) await _consultarDisco(eco);
    });

    document.getElementById("reg-scan-sube").addEventListener("click", () => _iniciarScan("sube"));
    document.getElementById("reg-scan-baja").addEventListener("click", () => _iniciarScan("baja"));

    document.getElementById("reg-bandeja-baja").addEventListener("input", _validarInconsistencia);

    document.getElementById("reg-formateo").addEventListener("change", e => {
        document.getElementById("reg-div-motivo").style.display = e.target.value === "SI" ? "flex" : "none";
    });

    document.getElementById("reg-btn-cambiar-usuario").addEventListener("click", () => {
        if (confirm("¿Cambiar de Base o de Clave de Colaborador?")) {
            borrar("base", "tecnico");
            document.getElementById("reg-base").value = "";
            document.getElementById("reg-tecnico").value = "";
            _validarProgreso();
        }
    });

    document.getElementById("reg-btn-enviar").addEventListener("click", _enviar);
}

async function _consultarDisco(eco) {
    try {
        const disco = await consultarUltimoDisco(eco);
        _discoActualBD = disco;
        document.getElementById("reg-disco-esperado-val").textContent = disco || "Sin registro previo";
        _validarInconsistencia();
    } catch (e) {
        console.error("[Registrar] Error consultando disco:", e);
    }
}

async function _iniciarScan(campo) {
    const eco = document.getElementById("reg-eco").value.trim();
    if (eco.length !== 5) { alert("⚠️ Primero captura el número económico (5 dígitos)."); return; }

    _campoActivo = campo === "sube" ? "reg-bandeja-sube" : "reg-bandeja-baja";

    if (scanActivo()) await scanStop();

    try {
        await scanStart("reg-qr-reader", codigo => {
            document.getElementById(_campoActivo).value = codigo;
            scanStop().then(() => _validarInconsistencia());
        });
    } catch (e) {
        alert("No se pudo acceder a la cámara: " + e.message);
    }
}

function _validarInconsistencia() {
    const baja = document.getElementById("reg-bandeja-baja").value.trim().toUpperCase();
    const banner = document.getElementById("reg-banner-inconsistencia");
    if (baja && _discoActualBD && _discoActualBD !== "VACÍO") {
        banner.style.display = baja !== _discoActualBD ? "block" : "none";
    }
}

function _validarProgreso() {
    const base = document.getElementById("reg-base").value;
    const tecnico = document.getElementById("reg-tecnico").value;
    const eco = document.getElementById("reg-eco").value;
    const seccion = document.getElementById("reg-seccion-escaneo");

    const listo = base !== "" && tecnico.length >= 7 && eco.length === 5;
    seccion.classList.toggle("reg-seccion-disabled", !listo);
}

async function _enviar() {
    const bannerVisible = document.getElementById("reg-banner-inconsistencia").style.display === "block";
    const justificacion = document.getElementById("reg-justificacion")?.value.trim() || "";
    const btn = document.getElementById("reg-btn-enviar");

    if (bannerVisible && !justificacion) {
        alert("⚠️ Por favor, justifica por qué el disco no coincide.");
        return;
    }

    const datos = {
        base: document.getElementById("reg-base").value,
        tecnico: document.getElementById("reg-tecnico").value,
        eco: document.getElementById("reg-eco").value,
        bandejaSube: document.getElementById("reg-bandeja-sube").value,
        bandejaBaja: document.getElementById("reg-bandeja-baja").value,
        formateo: document.getElementById("reg-formateo").value,
        motivoFormateo: document.getElementById("reg-motivo").value || "N/A",
        ledStatus: document.getElementById("reg-led").value,
        justificacionCruce: justificacion,
    };

    if (!datos.base || !datos.tecnico || !datos.eco || !datos.bandejaSube) {
        alert("⚠️ Faltan campos obligatorios (Base, Técnico, Eco o Disco Sube).");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sincronizando...`;

    try {
        await enviarCambio(datos);

        // Limpiar campos del registro (mantener base y técnico)
        document.getElementById("reg-eco").value = "";
        document.getElementById("reg-bandeja-sube").value = "";
        document.getElementById("reg-bandeja-baja").value = "";
        document.getElementById("reg-justificacion").value = "";
        document.getElementById("reg-banner-inconsistencia").style.display = "none";
        _discoActualBD = "";
        _validarProgreso();

        alert("✅ Registro guardado correctamente.");
        document.getElementById("reg-eco").focus();
    } catch (e) {
        console.error("[Registrar] Error:", e);
        if (e.message?.toLowerCase().includes("fetch")) {
            alert(`⚠️ Error de red. Si usas Telcel:\n1. Ajustes → SIM → APN\n2. Cambiar Protocolo APN a IPv4\n3. Reiniciar datos móviles`);
        } else {
            alert("❌ Error al guardar:\n\n" + e.message);
        }
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Guardar Registro`;
    }
}

export function getCount() { return 0; }

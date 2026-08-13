/**
 * scanner.js — Wrapper de Html5Qrcode para escaneo QR.
 * La librería se carga globalmente (script tag en el HTML).
 */

let _instance = null;
let _elementId = null;

/**
 * Inicializa el escáner QR en el elemento dado.
 * @param {string} elementId - ID del div contenedor
 * @param {function} onScan - callback(codigo: string)
 */
export async function iniciar(elementId, onScan) {
    if (_instance && _instance.isScanning) {
        await detener();
    }

    _elementId = elementId;
    _instance = new Html5Qrcode(elementId);
    document.getElementById(elementId).style.display = "block";

    try {
        await _instance.start(
            { facingMode: "environment" },
            { fps: 15, qrbox: 250 },
            (text) => onScan(text.trim().toUpperCase())
        );
    } catch (err) {
        document.getElementById(elementId).style.display = "none";
        throw err;
    }
}

/**
 * Detiene el escáner y oculta el elemento.
 */
export async function detener() {
    if (!_instance) return;
    try {
        if (_instance.isScanning) await _instance.stop();
    } catch (_) {}
    if (_elementId) {
        const el = document.getElementById(_elementId);
        if (el) el.style.display = "none";
    }
    _instance = null;
}

/**
 * ¿Está el escáner activo actualmente?
 */
export function estaActivo() {
    return !!(  _instance && _instance.isScanning);
}

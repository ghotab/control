/**
 * localPref.js — Abstracción de localStorage para preferencias de usuario.
 */

const PREFIX = "ghob_";

export function guardar(key, valor) {
    try { localStorage.setItem(PREFIX + key, valor); } catch (_) {}
}

export function recuperar(key) {
    try { return localStorage.getItem(PREFIX + key) || localStorage.getItem(key) || ""; }
    catch (_) { return ""; }
}

export function borrar(...keys) {
    keys.forEach(k => {
        try {
            localStorage.removeItem(PREFIX + k);
            localStorage.removeItem(k); // compat con claves legacy
        } catch (_) {}
    });
}

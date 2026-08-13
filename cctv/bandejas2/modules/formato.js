/**
 * formato.js — Formateadores de fecha y texto.
 */

/**
 * Formatea un timestamp ISO a fecha legible corta en es-MX.
 * Ej: "28 abr, 20:58"
 */
export function formatFechaCort(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("es-MX", {
        timeZone: "UTC",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

/**
 * Formatea un timestamp ISO a fecha completa en es-MX.
 * Ej: "28/04/2026, 20:58"
 */
export function formatFechaLarg(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("es-MX", {
        timeZone: "UTC",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

/**
 * Convierte Date a string "YYYY-MM-DD HH:MM:SS" para queries Supabase.
 */
export function fechaSQL(fecha) {
    return fecha.getFullYear() + "-" +
        String(fecha.getMonth() + 1).padStart(2, "0") + "-" +
        String(fecha.getDate()).padStart(2, "0") + " " +
        String(fecha.getHours()).padStart(2, "0") + ":" +
        String(fecha.getMinutes()).padStart(2, "0") + ":" +
        String(fecha.getSeconds()).padStart(2, "0");
}

/**
 * Calcula la duración entre dos timestamps y retorna string legible.
 * Ej: "3d 14h en DVR"
 */
export function calcularDuracionStr(isoInicio, isoFin) {
    const diff = Math.abs(new Date(isoFin) - new Date(isoInicio));
    const dias = Math.floor(diff / 864e5);
    const horas = Math.floor((diff % 864e5) / 36e5);
    return `${dias}d ${horas}h en DVR`;
}

/**
 * filtros.js — Funciones puras de filtrado.
 */

import { fechaSQL } from "./formato.js";

/**
 * Filtra registros por base operativa.
 * @param {Array} datos
 * @param {string} base - código de base o "TODAS"
 */
export function filtrarPorBase(datos, base) {
    if (!base || base === "TODAS") return datos;
    return datos.filter(r => r.base === base);
}

/**
 * Filtra registros por periodo de tiempo.
 * @param {Array} datos
 * @param {"HOY"|"AYER"|"SEMANA"|"MES"} periodo
 */
export function filtrarPorPeriodo(datos, periodo) {
    const ahora = new Date();
    let desde = null;
    let hasta = null;

    switch (periodo) {
        case "HOY":
            desde = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
            break;
        case "AYER":
            desde = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 1);
            hasta = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
            break;
        case "SEMANA":
            desde = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 7);
            break;
        case "MES":
            desde = new Date(ahora.getFullYear(), ahora.getMonth() - 1, ahora.getDate());
            break;
        default:
            return datos;
    }

    return datos.filter(r => {
        const t = new Date(r.fecha_hora).getTime();
        if (desde && t < desde.getTime()) return false;
        if (hasta && t >= hasta.getTime()) return false;
        return true;
    });
}

/**
 * Filtra por texto libre: número económico, bandeja_sube, bandeja_baja, técnico, base.
 */
export function filtrarPorQuery(datos, query) {
    if (!query) return datos;
    const q = query.toUpperCase();
    return datos.filter(r =>
        (r.numero_economico?.toString().includes(q)) ||
        (r.bandeja_sube?.toUpperCase().includes(q)) ||
        (r.bandeja_baja?.toUpperCase().includes(q)) ||
        (r.clave_colaborador?.toString().includes(q)) ||
        (r.base?.toUpperCase().includes(q))
    );
}

/**
 * Filtra la lista de estados de flota según nivel de riesgo.
 * @param {Array} lista - objetos con nivelRiesgo
 * @param {"todos"|"critico"|"vacio"} tipo
 */
export function filtrarPorEstatus(lista, tipo) {
    if (tipo === "todos") return lista;
    if (tipo === "critico") return lista.filter(i => i.nivelRiesgo === "critico");
    if (tipo === "vacio") return lista.filter(i => i.nivelRiesgo === "vacio");
    return lista;
}

/**
 * Construye el rango de fechas SQL para Supabase según el periodo.
 * @returns {{ desde: string|null, hasta: string|null }}
 */
export function rangoFechasSQL(periodo) {
    const ahora = new Date();
    switch (periodo) {
        case "HOY":
            return { desde: fechaSQL(new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())), hasta: null };
        case "AYER": {
            const ini = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 1);
            const fin = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
            return { desde: fechaSQL(ini), hasta: fechaSQL(fin) };
        }
        case "SEMANA":
            return { desde: fechaSQL(new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 7)), hasta: null };
        case "MES":
            return { desde: fechaSQL(new Date(ahora.getFullYear(), ahora.getMonth() - 1, ahora.getDate())), hasta: null };
        default:
            return { desde: null, hasta: null };
    }
}

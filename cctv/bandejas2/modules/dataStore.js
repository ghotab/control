/**
 * dataStore.js — Cache en memoria y carga paginada de datos.
 */

import { getDB } from "./db.js";

const PAGE_SIZE = 1000;

let _historial = []; // tbl_cambiobandeja (ASC por fecha_hora — para ciclos)
let _historialDesc = []; // tbl_cambiobandeja (DESC — para estado actual)
let _flota = [];    // tbl_flota
let _cargado = false;

/**
 * Carga todos los registros de tbl_cambiobandeja paginando de PAGE_SIZE en PAGE_SIZE.
 * @param {"asc"|"desc"} orden
 */
async function paginarHistorial(orden = "asc") {
    const db = getDB();
    if (!db) throw new Error("Sin conexión Supabase");

    let todos = [];
    let desde = 0;
    let hayMas = true;

    while (hayMas) {
        const { data, error } = await db
            .from("tbl_cambiobandeja")
            .select("fecha_hora, base, clave_colaborador, numero_economico, bandeja_sube, bandeja_baja")
            .order("fecha_hora", { ascending: orden === "asc" })
            .range(desde, desde + PAGE_SIZE - 1);

        if (error) throw error;
        todos = todos.concat(data);
        hayMas = data.length === PAGE_SIZE;
        desde += PAGE_SIZE;
    }
    return todos;
}

/**
 * Carga el catálogo de flota desde tbl_flota.
 */
async function cargarFlota() {
    const db = getDB();
    if (!db) throw new Error("Sin conexión Supabase");
    const { data, error } = await db.from("tbl_flota").select("autobus, estatus, base");
    if (error) throw error;
    return data;
}

/**
 * Inicializa el store: carga historial (ambos órdenes) y flota en paralelo.
 * Solo carga una vez; llama a force=true para refrescar.
 */
export async function init(force = false) {
    if (_cargado && !force) return;
    const [asc, desc, flota] = await Promise.all([
        paginarHistorial("asc"),
        paginarHistorial("desc"),
        cargarFlota(),
    ]);
    _historial = asc;
    _historialDesc = desc;
    _flota = flota;
    _cargado = true;
}

/** Registros de tbl_cambiobandeja ordenados ASC (para calcular ciclos). */
export function getHistorialAsc() { return _historial; }

/** Registros de tbl_cambiobandeja ordenados DESC (para calcular estado actual). */
export function getHistorialDesc() { return _historialDesc; }

/** Registros de tbl_flota. */
export function getFlota() { return _flota; }

/** ¿Están los datos ya cargados? */
export function isCargado() { return _cargado; }

/**
 * Recarga solo movimientos recientes usando filtros de Supabase.
 * Más liviano para la vista de Movimientos con filtros activos.
 */
export async function cargarMovimientos({ base, periodo }) {
    const db = getDB();
    if (!db) throw new Error("Sin conexión Supabase");

    const { rangoFechasSQL } = await import("./filtros.js");
    const { desde, hasta } = rangoFechasSQL(periodo);

    let q = db.from("tbl_cambiobandeja").select("*");
    if (base && base !== "TODAS") q = q.eq("base", base);
    if (desde) q = q.gte("fecha_hora", desde);
    if (hasta) q = q.lt("fecha_hora", hasta);
    q = q.order("fecha_hora", { ascending: false });

    const { data, error } = await q;
    if (error) throw error;
    return data;
}

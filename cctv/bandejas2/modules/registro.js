/**
 * registro.js — Operaciones de escritura y lectura puntual en Supabase.
 */

import { getDB } from "./db.js";

/**
 * Consulta cuál fue la última bandeja instalada (bandeja_sube) para un autobús.
 * @param {string} eco - número económico (5 dígitos)
 * @returns {string} código de bandeja o "" si no hay registro
 */
export async function consultarUltimoDisco(eco) {
    const db = getDB();
    if (!db) throw new Error("Sin conexión Supabase");

    const { data, error } = await db
        .from("tbl_cambiobandeja")
        .select("bandeja_sube")
        .eq("numero_economico", eco)
        .order("fecha_hora", { ascending: false })
        .limit(1);

    if (error) throw error;
    if (data && data.length > 0 && data[0].bandeja_sube) {
        return data[0].bandeja_sube.toString().trim().toUpperCase();
    }
    return "";
}

/**
 * Inserta un registro de cambio de bandeja en tbl_cambiobandeja.
 * @param {object} datos
 * @param {string} datos.base
 * @param {string} datos.tecnico
 * @param {string} datos.eco
 * @param {string} datos.bandejaSube
 * @param {string} datos.bandejaBaja
 * @param {string} datos.formateo - "SI" | "NO"
 * @param {string} datos.motivoFormateo
 * @param {string} datos.ledStatus - "OK" | "FALLA"
 * @param {string} datos.justificacionCruce
 */
export async function enviarCambio(datos) {
    const db = getDB();
    if (!db) throw new Error("Sin conexión Supabase");

    const { error } = await db.from("tbl_cambiobandeja").insert({
        base: datos.base,
        clave_colaborador: datos.tecnico,
        numero_economico: datos.eco,
        bandeja_sube: datos.bandejaSube || null,
        bandeja_baja: datos.bandejaBaja || null,
        formateado: datos.formateo === "SI",
        motivo_formateo: datos.motivoFormateo || "N/A",
        led_status: datos.ledStatus,
        justificacion_discrepancia: datos.justificacionCruce || null,
    });

    if (error) throw error;
}

/**
 * Envía un inventario masivo de bandejas a Google Apps Script.
 * @param {object} datos
 * @param {string} datos.base
 * @param {string} datos.tecnico
 * @param {string} datos.sitio
 * @param {string[]} datos.listaBandejas
 */
export async function enviarInventarioMasivo(datos) {
    const GAS_URL = "https://script.google.com/macros/s/AKfycbzSSGiu0bZIJgHheutgfD0MiqFNGkB0jxga_hNJu8T5R4ZLe-_FdjxvUR2uGXl_e-YG/exec";

    const payload = {
        accion: "registrarInventarioMasivo",
        base: datos.base,
        tecnico: datos.tecnico,
        sitio: datos.sitio,
        listaBandejas: datos.listaBandejas,
        fecha: new Date().toISOString(),
    };

    await fetch(GAS_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(payload),
    });
}

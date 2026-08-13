/**
 * csvExport.js — Exportación de datos a CSV con BOM UTF-8.
 */

import { fechaSQL } from "./formato.js";

/**
 * Escapa un valor CSV según RFC 4180.
 */
function escapar(valor) {
    const texto = (valor === null || valor === undefined) ? "" : String(valor);
    if (texto.includes(",") || texto.includes('"') || texto.includes("\n")) {
        return '"' + texto.replace(/"/g, '""') + '"';
    }
    return texto;
}

/**
 * Genera y descarga un archivo CSV a partir de los datos de movimientos.
 * @param {Array} datos - Array de registros de tbl_cambiobandeja
 * @param {string} base - filtro de base para el nombre del archivo
 * @param {string} periodo - filtro de periodo para el nombre del archivo
 */
export function exportarCSV(datos, base = "TODAS", periodo = "CUSTOM") {
    if (!datos || datos.length === 0) {
        alert("No hay datos para exportar.");
        return;
    }

    const encabezados = ["Fecha", "Base", "Economico", "BandejaSube", "BandejaBaja", "Tecnico"];

    const filas = datos.map(r => [
        r.fecha_hora,
        r.base,
        r.numero_economico,
        r.bandeja_sube,
        r.bandeja_baja,
        r.clave_colaborador,
    ].map(escapar).join(","));

    const csv = [encabezados.join(","), ...filas].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const ts = fechaSQL(new Date()).replace(/[: ]/g, "-");
    const nombre = `movimientos_${base}_${periodo}_${ts}.csv`;

    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

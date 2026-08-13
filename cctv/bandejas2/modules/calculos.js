/**
 * calculos.js — Lógica de negocio central.
 * Funciones puras: sin efectos secundarios, sin dependencias de DOM.
 */

const DIAS_LIMITE = 7;

/**
 * A partir del historial completo (DESC por fecha_hora), calcula el estado
 * actual de cada autobús: si tiene bandeja instalada, cuántos días lleva,
 * y el nivel de riesgo.
 *
 * @param {Array} historial - Registros de tbl_cambiobandeja (más reciente primero)
 * @returns {Map<string, EstadoBandeja>} mapa eco → estado
 */
export function calcularEstadoFlota(historial) {
    const estado = new Map();

    historial.forEach(fila => {
        const eco = fila.numero_economico ? fila.numero_economico.toString().trim() : null;
        if (!eco || estado.has(eco)) return; // ya procesamos el estado más reciente

        const bSube = (fila.bandeja_sube || "").toString().trim();
        const bBaja = (fila.bandeja_baja || "").toString().trim();

        if (bSube !== "") {
            estado.set(eco, {
                eco,
                tieneDisco: true,
                bandeja: bSube,
                fechaInstalacion: new Date(fila.fecha_hora),
                registro: fila,
            });
        } else if (bBaja !== "") {
            estado.set(eco, {
                eco,
                tieneDisco: false,
                bandeja: null,
                fechaInstalacion: null,
                registro: fila,
            });
        }
    });

    return estado;
}

/**
 * Agrega métricas de riesgo a un EstadoBandeja.
 * @param {object} estadoBandeja
 * @returns {object} con dias, pctRiesgo y nivelRiesgo
 */
export function enriquecerConRiesgo(estadoBandeja) {
    if (!estadoBandeja.tieneDisco) {
        return { ...estadoBandeja, dias: -1, pctRiesgo: 0, nivelRiesgo: "vacio" };
    }
    const dias = Math.floor((Date.now() - estadoBandeja.fechaInstalacion.getTime()) / 864e5);
    const pct = Math.min((dias / DIAS_LIMITE) * 100, 100);
    let nivelRiesgo = "seguro";
    if (pct >= 90) nivelRiesgo = "critico";
    else if (pct >= 65) nivelRiesgo = "alerta";
    return { ...estadoBandeja, dias, pctRiesgo: Math.round(pct), nivelRiesgo };
}

/**
 * Calcula el nivel de riesgo para un número de días dado.
 */
export function calcularNivelRiesgo(dias) {
    if (dias < 0) return "vacio";
    const pct = (dias / DIAS_LIMITE) * 100;
    if (pct >= 90) return "critico";
    if (pct >= 65) return "alerta";
    return "seguro";
}

/**
 * Construye los ciclos sube-baja de una bandeja o autobús del historial.
 * Historial debe estar ordenado ASC por fecha_hora.
 *
 * @param {Array} historial - ASC
 * @param {string} query - valor buscado (número eco o código bandeja)
 * @param {"bus"|"disco"} modo
 * @returns {Array<CicloBandeja>}
 */
export function calcularCiclos(historial, query, modo) {
    const q = query.trim().toUpperCase();

    // Filtrar subidas relevantes
    const subidas = historial.filter(r => {
        if (modo === "bus") return r.numero_economico?.toString() === q && r.bandeja_sube;
        return r.bandeja_sube?.toUpperCase() === q;
    });

    subidas.sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora)); // más reciente primero

    return subidas.map(rSube => {
        const tSube = new Date(rSube.fecha_hora).getTime();
        const idBandeja = rSube.bandeja_sube;

        const rBaja = historial.find(r => {
            const bBaja = r.bandeja_baja?.toString().toUpperCase();
            const match = modo === "bus"
                ? bBaja === idBandeja?.toUpperCase()
                : bBaja === q;
            return match && new Date(r.fecha_hora).getTime() > tSube;
        });

        const proximaSubida = historial.find(r => {
            const tRef = new Date(r.fecha_hora).getTime();
            if (tRef <= tSube) return false;
            if (modo === "bus") return r.numero_economico?.toString() === q && r.bandeja_sube;
            return r.bandeja_sube?.toUpperCase() === q;
        });

        let status = "activo";
        if (rBaja) {
            const tBaja = new Date(rBaja.fecha_hora).getTime();
            if (proximaSubida && tBaja > new Date(proximaSubida.fecha_hora).getTime()) {
                status = "inconsistente";
            } else {
                status = "finalizado";
            }
        } else if (proximaSubida) {
            status = "inconsistente";
        }

        return { rSube, rBaja: status === "finalizado" ? rBaja : null, status };
    });
}

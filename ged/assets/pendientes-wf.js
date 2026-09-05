import { supabase } from "./supabaseClient.js";
import {
  CAMPO_BASE_USUARIO,
  TABLA_FLOTA,
  COL_FLOTA_AUTOBUS,
  COL_FLOTA_BASE,
  TABLA_BASE_ALIAS,
  COL_ALIAS_NOMBRE,
  COL_ALIAS_CLAVE,
  TABLA_BANDEJA,
  COL_BANDEJA_AUTOBUS,
  COL_BANDEJA_SUBE,
  COL_BANDEJA_BAJA,
  COL_BANDEJA_FECHA,
  HOJA_SOPORTE_TECNICO_CANDIDATOS,
  HOJA_REGISTRO_SINIESTRO_CANDIDATOS,
} from "./config.js";

// ============================================================================
// Utilidades de texto / encabezados
// ============================================================================

function quitarAcentos(s) {
  return String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Texto de base normalizado para comparar: sin acentos, mayúsculas, espacios
 * colapsados y sin espacios en los extremos. */
function normalizarTextoBase(s) {
  return quitarAcentos(s).trim().toUpperCase().replace(/\s+/g, " ");
}

/** Clave "compacta": sin acentos, sin puntuación/espacios, en minúsculas.
 * Así "  .     No. Económico" y ".     No. económico" dan el mismo resultado,
 * e igual "Fecha del incidente - siniestro" con "Fecha del incidente-siniestro *". */
function compactKey(s) {
  return quitarAcentos(s).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function textoCelda(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

/** Convierte un valor de "No. Económico" a texto comparable contra tbl_flota. */
function normalizarAutobus(v) {
  const s = textoCelda(v);
  if (s === "") return "";
  const n = Number(s);
  if (!isNaN(n) && Number.isInteger(n) && String(n) !== "NaN") return String(n);
  return s;
}

const CAMPOS = {
  idEjFlujo: (k) => k === "idejflujo",
  noEconomico: (k) => k === "noeconomico",
  clave: (k) => k === "clave",
  nombre: (k) => k === "nombre",
  codigoAccidente: (k) => k === "codigodelaccidente",
  fechaReporte: (k) => k === "fechadelreporte",
  fechaIncidente: (k) => k === "fechadelincidentesiniestro",
  horarioIncidente: (k) => k === "horariodelincidentesiniestro",
  tramoLugar: (k) => k === "tramoolugardelaccidente",
  hechosRelato: (k) => k === "hechosrelatodelconductor",
  observacionesSopTec: (k) => k.includes("soptec"),
  fechaInicio: (k) => k === "fechainicio",
  fechaFin: (k) => k === "fechafin",
};

function construirMapaColumnas(filaEncabezado) {
  const mapa = {};
  filaEncabezado.forEach((h, idx) => {
    const k = compactKey(h);
    if (!k) return;
    for (const [campo, prueba] of Object.entries(CAMPOS)) {
      if (mapa[campo] !== undefined) continue;
      if (prueba(k)) mapa[campo] = idx;
    }
  });
  return mapa;
}

function encontrarFilaEncabezado(filas) {
  const tope = Math.min(filas.length, 10);
  for (let i = 0; i < tope; i++) {
    const fila = filas[i] || [];
    if (fila.some((c) => compactKey(c) === "idejflujo")) return i;
  }
  return -1;
}

function encontrarHoja(workbook, candidatos) {
  const nombres = workbook.SheetNames;
  for (const candidato of candidatos) {
    const encontrado = nombres.find((n) => n.trim().toLowerCase() === candidato.trim().toLowerCase());
    if (encontrado) return encontrado;
  }
  // fallback: coincidencia parcial
  for (const candidato of candidatos) {
    const clave = compactKey(candidato);
    const encontrado = nombres.find((n) => compactKey(n).includes(clave.slice(0, 12)));
    if (encontrado) return encontrado;
  }
  return null;
}

function extraerRegistros(workbook, candidatosHoja) {
  const nombreHoja = encontrarHoja(workbook, candidatosHoja);
  if (!nombreHoja) return { registros: [], nombreHoja: null, sinEncabezado: false };

  const hoja = workbook.Sheets[nombreHoja];
  const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, raw: false, defval: "" });
  const idxEncabezado = encontrarFilaEncabezado(filas);
  if (idxEncabezado === -1) return { registros: [], nombreHoja, sinEncabezado: true };

  const mapa = construirMapaColumnas(filas[idxEncabezado]);
  const registros = [];
  let filasNoVaciasSinId = 0;

  for (let i = idxEncabezado + 1; i < filas.length; i++) {
    const fila = filas[i];
    if (!fila || fila.every((c) => textoCelda(c) === "")) continue;
    const idEjFlujo = textoCelda(fila[mapa.idEjFlujo]);
    if (!idEjFlujo) {
      filasNoVaciasSinId++;
      continue;
    }

    registros.push({
      idEjFlujo,
      noEconomico: normalizarAutobus(fila[mapa.noEconomico]),
      clave: textoCelda(fila[mapa.clave]),
      nombre: textoCelda(fila[mapa.nombre]),
      codigoAccidente: textoCelda(fila[mapa.codigoAccidente]),
      fechaReporte: textoCelda(fila[mapa.fechaReporte]),
      fechaIncidente: textoCelda(fila[mapa.fechaIncidente]),
      horarioIncidente: textoCelda(fila[mapa.horarioIncidente]),
      tramoLugar: textoCelda(fila[mapa.tramoLugar]),
      hechosRelato: textoCelda(fila[mapa.hechosRelato]),
      observacionesSopTec: textoCelda(fila[mapa.observacionesSopTec]),
      fechaInicio: textoCelda(fila[mapa.fechaInicio]),
      fechaFin: textoCelda(fila[mapa.fechaFin]),
    });
  }

  return { registros, nombreHoja, sinEncabezado: false, filasNoVaciasSinId };
}

/** Traduce el resultado de extraerRegistros en un error claro para el usuario
 * en vez de dejar pasar silenciosamente una lista vacía sin explicación. */
function validarExtraccion({ registros, nombreHoja, sinEncabezado, filasNoVaciasSinId }, nombreEsperado) {
  if (!nombreHoja) {
    throw new Error(`No encontré la hoja "${nombreEsperado}" (ni su equivalente ASJ) en este archivo.`);
  }
  if (sinEncabezado) {
    throw new Error(
      `Encontré la hoja "${nombreHoja}" pero no reconocí sus encabezados (no ubiqué la columna "ID Ej. Flujo"). ` +
        `Revisa que no se hayan movido filas o columnas al exportar desde Workflow.`
    );
  }
  if (registros.length === 0) {
    const detalle =
      filasNoVaciasSinId > 0
        ? ` (había ${filasNoVaciasSinId} fila${filasNoVaciasSinId === 1 ? "" : "s"} con datos pero sin "ID Ej. Flujo")`
        : "";
    throw new Error(`La hoja "${nombreHoja}" no tiene filas de datos utilizables${detalle}.`);
  }
}

function esIncompleto(r) {
  return !r.noEconomico && !r.codigoAccidente && !r.fechaIncidente;
}

function fusionarConSiniestro(registro, datosSiniestro) {
  if (!datosSiniestro) return { ...registro, _sinDatosSiniestro: true };
  return {
    ...registro,
    noEconomico: registro.noEconomico || datosSiniestro.noEconomico,
    clave: registro.clave || datosSiniestro.clave,
    nombre: registro.nombre || datosSiniestro.nombre,
    codigoAccidente: registro.codigoAccidente || datosSiniestro.codigoAccidente,
    fechaReporte: registro.fechaReporte || datosSiniestro.fechaReporte || registro.fechaInicio,
    fechaIncidente: registro.fechaIncidente || datosSiniestro.fechaIncidente,
    horarioIncidente: registro.horarioIncidente || datosSiniestro.horarioIncidente,
    tramoLugar: registro.tramoLugar || datosSiniestro.tramoLugar,
    hechosRelato: registro.hechosRelato || datosSiniestro.hechosRelato,
    _fusionado: true,
  };
}

// ============================================================================
// Fechas
// ============================================================================

function parseFechaDMY(s) {
  const m = textoCelda(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const dt = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return isNaN(dt.getTime()) ? null : dt;
}

function diferenciaDias(fechaReporte, fechaIncidente) {
  const a = parseFechaDMY(fechaReporte);
  const b = parseFechaDMY(fechaIncidente);
  if (!a || !b) return null;
  return Math.round((a - b) / 86400000);
}

/** Combina fecha (dd/mm/aaaa) + hora (hh:mm) del incidente en un Date.
 * Si no hay hora, usa mediodía para no rozar el borde del día. */
function construirFechaHoraIncidente(fechaStr, horaStr) {
  const base = parseFechaDMY(fechaStr);
  if (!base) return null;
  let horas = 12;
  let minutos = 0;
  const m = textoCelda(horaStr).match(/^(\d{1,2}):(\d{2})/);
  if (m) {
    horas = Number(m[1]);
    minutos = Number(m[2]);
  }
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), horas, minutos, 0);
}

// ============================================================================
// Consultas a Supabase
// ============================================================================

/** Divide un arreglo en grupos de tamaño fijo (para no mandar un .in()/.or()
 * con cientos de valores en una sola consulta — la vista de jefe junta TODAS
 * las bases, así que la lista de autobuses puede ser mucho más grande que en
 * la vista de una sola base). */
function enGrupos(arr, tam = 120) {
  const grupos = [];
  for (let i = 0; i < arr.length; i += tam) grupos.push(arr.slice(i, i + tam));
  return grupos;
}

async function obtenerBasesPorAutobus(numeros) {
  const mapa = {};
  if (numeros.length === 0) return mapa;
  const grupos = enGrupos(numeros);
  const resultados = await Promise.all(
    grupos.map((grupo) =>
      supabase
        .from(TABLA_FLOTA)
        .select(`${COL_FLOTA_AUTOBUS}, ${COL_FLOTA_BASE}`)
        .in(COL_FLOTA_AUTOBUS, grupo)
    )
  );
  for (const { data, error } of resultados) {
    if (error) {
      console.error("Error consultando " + TABLA_FLOTA + ":", error);
      throw new Error(`No se pudo consultar "${TABLA_FLOTA}" para obtener la base de cada autobús.`);
    }
    (data || []).forEach((r) => {
      mapa[textoCelda(r[COL_FLOTA_AUTOBUS])] = r[COL_FLOTA_BASE];
    });
  }
  return mapa;
}

/** Catálogo opcional que traduce nombres "raros" de tbl_flota.base (p.ej.
 * "MEX OCC") a la clave normalizada de tbl_usuarios.base (p.ej. "TOCC").
 * Si la tabla aún no existe, no truena: solo se queda sin traducciones. */
async function obtenerMapaAliasBase() {
  const mapa = {};
  try {
    const { data, error } = await supabase.from(TABLA_BASE_ALIAS).select(`${COL_ALIAS_NOMBRE}, ${COL_ALIAS_CLAVE}`);
    if (error) throw error;
    (data || []).forEach((r) => {
      mapa[normalizarTextoBase(r[COL_ALIAS_NOMBRE])] = normalizarTextoBase(r[COL_ALIAS_CLAVE]);
    });
  } catch (err) {
    console.warn(`No se pudo cargar "${TABLA_BASE_ALIAS}" (¿todavía no existe?). Se compara la base sin traducir.`, err.message || err);
  }
  return mapa;
}

/**
 * tbl_cambiobandeja es un LOG de eventos: cada fila dice que, en cierto
 * autobús y fecha/hora, se retiró "bandeja_baja" y se instaló "bandeja_sube".
 * Para saber qué disco grababa un autobús en una fecha dada:
 *  - se busca el último evento de ESE autobús con fecha_hora <= fecha del
 *    incidente → el disco vigente es su "bandeja_sube" (quedó instalado ahí
 *    y siguió operando hasta el siguiente cambio).
 *  - si no hay ningún evento anterior a esa fecha, se usa como respaldo la
 *    "bandeja_baja" del primer evento POSTERIOR (ese fue el disco que salió,
 *    o sea el que ya estaba puesto desde antes de que existiera registro).
 */
async function obtenerHistorialBandejaPorAutobus(numeros) {
  if (numeros.length === 0) return [];
  const grupos = enGrupos(numeros);
  const resultados = await Promise.all(
    grupos.map((grupo) =>
      supabase
        .from(TABLA_BANDEJA)
        .select(`${COL_BANDEJA_AUTOBUS}, ${COL_BANDEJA_SUBE}, ${COL_BANDEJA_BAJA}, ${COL_BANDEJA_FECHA}`)
        .in(COL_BANDEJA_AUTOBUS, grupo)
    )
  );
  const historial = [];
  for (const { data, error } of resultados) {
    if (error) {
      console.error("Error consultando " + TABLA_BANDEJA + ":", error);
      throw new Error(`No se pudo consultar "${TABLA_BANDEJA}" (historial de bandeja).`);
    }
    historial.push(...(data || []));
  }
  historial.sort((a, b) => new Date(a[COL_BANDEJA_FECHA]) - new Date(b[COL_BANDEJA_FECHA]));
  return historial;
}

function discoVigenteEnFecha(historial, autobus, fechaHoraIncidente) {
  if (!fechaHoraIncidente) return null;
  const delBus = historial.filter((r) => textoCelda(r[COL_BANDEJA_AUTOBUS]) === autobus);

  const anteriores = delBus.filter((r) => new Date(r[COL_BANDEJA_FECHA]) <= fechaHoraIncidente);
  if (anteriores.length > 0) {
    return anteriores[anteriores.length - 1][COL_BANDEJA_SUBE] || null; // ya viene ordenado asc
  }
  const posteriores = delBus.filter((r) => new Date(r[COL_BANDEJA_FECHA]) > fechaHoraIncidente);
  if (posteriores.length > 0 && posteriores[0][COL_BANDEJA_BAJA]) {
    return posteriores[0][COL_BANDEJA_BAJA];
  }
  return null;
}

/** Para cada disco, encuentra su evento más reciente (como sube o como baja)
 * en TODA la flota. Si el último evento lo tiene como "sube", sigue instalado
 * ahí; si lo tiene como "baja", fue retirado y no se ha vuelto a instalar. */
async function obtenerUbicacionActualDeDiscos(discos) {
  const mapa = {};
  const unicos = [...new Set(discos.filter(Boolean).map(String))];
  if (unicos.length === 0) return mapa;

  const grupos = enGrupos(unicos);
  const resultados = await Promise.all(
    grupos.map((grupo) => {
      const lista = grupo.map((d) => `"${d.replace(/"/g, '\\"')}"`).join(",");
      return supabase
        .from(TABLA_BANDEJA)
        .select(`${COL_BANDEJA_AUTOBUS}, ${COL_BANDEJA_SUBE}, ${COL_BANDEJA_BAJA}, ${COL_BANDEJA_FECHA}`)
        .or(`${COL_BANDEJA_SUBE}.in.(${lista}),${COL_BANDEJA_BAJA}.in.(${lista})`);
    })
  );

  const eventos = [];
  for (const { data, error } of resultados) {
    if (error) {
      console.error("Error consultando " + TABLA_BANDEJA + " (ubicación actual):", error);
      throw new Error(`No se pudo consultar "${TABLA_BANDEJA}" para ubicar el disco actualmente.`);
    }
    eventos.push(...(data || []));
  }
  eventos.sort((a, b) => new Date(a[COL_BANDEJA_FECHA]) - new Date(b[COL_BANDEJA_FECHA]));

  eventos.forEach((r) => {
    const autobus = textoCelda(r[COL_BANDEJA_AUTOBUS]);
    if (unicos.includes(String(r[COL_BANDEJA_SUBE]))) {
      mapa[r[COL_BANDEJA_SUBE]] = { estado: "instalado", autobus };
    }
    if (r[COL_BANDEJA_BAJA] && unicos.includes(String(r[COL_BANDEJA_BAJA]))) {
      mapa[r[COL_BANDEJA_BAJA]] = { estado: "retirado", autobus };
    }
  });
  // La sobreescritura en orden ascendente hace que quede el evento más
  // reciente que menciona a cada disco, sea como "sube" o como "baja".
  return mapa;
}

// ============================================================================
// Lectura de archivo
// ============================================================================

function leerWorkbook(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        resolve(XLSX.read(e.target.result, { type: "array" }));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

// ============================================================================
// Render + control del módulo
// ============================================================================

function badgeDias(dias) {
  if (dias === null || dias === undefined) return `<span class="badge muted">Sin fecha</span>`;
  let clase = "ok";
  if (dias >= 3 && dias < 7) clase = "warn";
  if (dias >= 7) clase = "danger";
  return `<span class="badge ${clase}">${dias} día${dias === 1 ? "" : "s"}</span>`;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ============================================================================
// UI compartida (dropzone, tarjetas)
// ============================================================================

function dropzoneHtml(inputId, file, titulo, subtitulo) {
  return `
    <label class="dropzone" for="${inputId}" data-dropzone>
      <input id="${inputId}" type="file" accept=".xlsx" data-file-input />
      <div class="dropzone-icon">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 15V4M12 4L7.5 8.5M12 4L16.5 8.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="dropzone-text">
        <span class="dropzone-title">${file ? esc(file.name) : titulo}</span>
        <span class="dropzone-sub">${file ? "Selecciona otro archivo para reemplazarlo" : subtitulo}</span>
      </div>
      <span class="dropzone-btn">${file ? "Cambiar archivo" : "Elegir archivo .xlsx"}</span>
    </label>`;
}

function cargandoHtml() {
  return `<div class="callout info"><span class="spinner" style="border-color:rgba(13,92,83,.35); border-top-color:#0d5c53;"></span> Procesando información…</div>`;
}

function severidad(dias) {
  if (dias === null || dias === undefined) return "muted";
  if (dias >= 7) return "danger";
  if (dias >= 3) return "warn";
  return "ok";
}

function campo(etiqueta, valor, opts = {}) {
  const cls = opts.mono ? "tabular" : "";
  return `
    <div class="pwf-field ${opts.ancho || ""}">
      <span class="pwf-label">${esc(etiqueta)}</span>
      <span class="pwf-value ${cls}">${valor ? esc(valor) : `<span class="cell-muted">—</span>`}</span>
    </div>`;
}

function textoLargo(etiqueta, valor) {
  return `
    <div class="pwf-field pwf-full">
      <span class="pwf-label">${esc(etiqueta)}</span>
      <p class="pwf-text">${valor ? esc(valor) : `<span class="cell-muted">Sin información capturada</span>`}</p>
    </div>`;
}

/** Tarjetas de pendientes/terminadas. opts.mostrarBase agrega un chip de base
 * en el encabezado (útil en la vista de jefe, que junta todas las bases). */
function tarjetasHtml(filas, opts = {}) {
  return `
    <div class="pwf-cards">
      ${filas
        .map((f) => {
          const sev = severidad(f.diasTranscurridos);
          const discoTxt = f.discoVigente
            ? `<span class="badge muted">${esc(f.discoVigente)}</span>`
            : `<span class="cell-muted">No disponible</span>`;
          return `
          <article class="pwf-card sev-${sev}">
            <header class="pwf-card-head">
              <div class="pwf-card-title">
                <span class="pwf-bus tabular">Autobús ${esc(f.noEconomico) || "—"}</span>
                <span class="pwf-driver">${esc(f.nombre) || "Sin nombre"} ${f.clave ? `· <span class="tabular">${esc(f.clave)}</span>` : ""}</span>
              </div>
              <div class="pwf-card-badges">
                ${opts.mostrarBase ? `<span class="badge muted">${esc(f.base || "Sin base")}</span>` : ""}
                ${badgeDias(f.diasTranscurridos)}
              </div>
            </header>

            <div class="pwf-card-grid">
              ${campo("Código del Accidente", f.codigoAccidente, { mono: true })}
              ${campo("ID Ej. Flujo", f.idEjFlujo, { mono: true })}
              ${campo("Fecha del reporte", f.fechaReporte, { mono: true })}
              ${campo("Fecha del incidente", f.fechaIncidente, { mono: true })}
              ${campo("Horario del incidente", f.horarioIncidente, { mono: true })}
              ${campo("Tramo o lugar del accidente", f.tramoLugar)}
            </div>

            ${textoLargo("Hechos - relato del conductor", f.hechosRelato)}
            ${textoLargo("Observaciones para Sop.Tec", f.observacionesSopTec)}

            <footer class="pwf-card-foot">
              <span>Disco grabado: ${discoTxt}</span>
              <span>Autobús donde está el disco: ${f.autobusActualDisco ? `<strong>${esc(f.autobusActualDisco)}</strong>` : `<span class="cell-muted">No disponible</span>`}</span>
            </footer>
          </article>`;
        })
        .join("")}
    </div>`;
}

/**
 * Toma registros crudos de una hoja de Workflow y:
 *  1) resuelve la base real de cada autobús (tbl_flota + tbl_base_alias),
 *  2) calcula días transcurridos, disco grabado y ubicación actual del disco.
 * No filtra por base — eso lo decide quien llama a esta función.
 */
async function enriquecerRegistros(registros) {
  const conAutobus = registros.filter((r) => r.noEconomico);
  const sinAutobus = registros.length - conAutobus.length;

  const numerosUnicos = [...new Set(conAutobus.map((r) => r.noEconomico))];
  const [mapaBases, mapaAliasBase] = await Promise.all([obtenerBasesPorAutobus(numerosUnicos), obtenerMapaAliasBase()]);

  const conBase = conAutobus.map((r) => {
    const baseRaw = mapaBases[r.noEconomico];
    const baseNorm = baseRaw ? normalizarTextoBase(baseRaw) : "";
    const baseResuelta = baseNorm ? mapaAliasBase[baseNorm] || baseNorm : "";
    return { ...r, base: baseResuelta || null };
  });

  let mapaDiscoVigente = {};
  let mapaUbicacionDisco = {};
  try {
    const historialBandeja = await obtenerHistorialBandejaPorAutobus(numerosUnicos);
    conBase.forEach((r) => {
      const fechaHora = construirFechaHoraIncidente(r.fechaIncidente, r.horarioIncidente);
      mapaDiscoVigente[r.idEjFlujo] = discoVigenteEnFecha(historialBandeja, r.noEconomico, fechaHora);
    });
    mapaUbicacionDisco = await obtenerUbicacionActualDeDiscos(Object.values(mapaDiscoVigente));
  } catch (errBandeja) {
    console.warn("Historial de bandeja no disponible:", errBandeja.message);
  }

  const filas = conBase.map((r) => {
    const disco = mapaDiscoVigente[r.idEjFlujo] || null;
    const ubicacion = disco ? mapaUbicacionDisco[disco] : null;
    return {
      ...r,
      diasTranscurridos: diferenciaDias(r.fechaReporte, r.fechaIncidente),
      discoVigente: disco,
      autobusActualDisco: ubicacion
        ? ubicacion.estado === "instalado"
          ? ubicacion.autobus
          : `Retirado (antes en ${ubicacion.autobus})`
        : null,
    };
  });

  filas.sort((a, b) => (b.diasTranscurridos ?? -1) - (a.diasTranscurridos ?? -1));

  return { filas, sinAutobus, sinBase: conBase.filter((r) => !r.base).length };
}

// ============================================================================
// Punto de entrada
// ============================================================================

export function montarPendientesWF(root, { usuario, esAuxiliar, esJefe }) {
  const baseUsuario = textoCelda(usuario[CAMPO_BASE_USUARIO]);

  if (!esAuxiliar && !esJefe) {
    root.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <div>
            <h3>Pendientes WF</h3>
            <p>Carga y seguimiento de pendientes de bitácora del accidente</p>
          </div>
        </div>
        <div class="panel-body">
          <div class="locked-note">
            La carga de archivos de Pendientes WF está disponible solo para los perfiles
            <strong>auxiliar</strong>, <strong>técnico</strong>, <strong>coordinador</strong>,
            <strong>jefe</strong> y <strong>gerente</strong>. Tu perfil actual no tiene esta opción habilitada.
          </div>
        </div>
      </div>`;
    return;
  }

  if (esJefe) {
    montarVistaJefe(root);
  } else {
    montarVistaBase(root, baseUsuario);
  }
}

// ============================================================================
// Vista: auxiliar / técnico / coordinador (una sola base, la propia)
// ============================================================================

function montarVistaBase(root, baseUsuario) {
  let archivoPrincipal = null;
  let archivoSiniestro = null;
  let registrosPrincipal = null;
  let totalLeidas = null;
  let necesitaSiniestro = false;
  let cargando = false;
  let errorMsg = null;
  let filasResultado = null;
  let resumenExclusion = null;

  render();

  function render() {
    root.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <div>
            <h3>1. Cargar exportación de Workflow</h3>
            <p>Excel con la hoja "BA Soporte Técnico GHO-Gestión" (o su equivalente ASJ)</p>
          </div>
          ${archivoPrincipal ? `<span class="badge ok">Cargado</span>` : ""}
        </div>
        <div class="panel-body">
          ${dropzoneHtml(
            "input-principal",
            archivoPrincipal,
            "Arrastra aquí tu archivo o haz clic para elegirlo",
            "Exportación de Workflow con la bitácora del accidente (.xlsx)"
          )}
          ${archivoPrincipal && !errorMsg && totalLeidas !== null
            ? `<div class="callout info">Archivo leído: <strong>${totalLeidas}</strong> fila${totalLeidas === 1 ? "" : "s"} encontradas.</div>`
            : ""}
          ${necesitaSiniestro ? bloqueSiniestroHtml() : ""}
          ${errorMsg ? `<div class="callout error">${esc(errorMsg)}</div>` : ""}
          ${cargando ? cargandoHtml() : ""}
        </div>
      </div>

      ${filasResultado ? panelResultadoHtml() : ""}
    `;
    wireEvents();
  }

  function bloqueSiniestroHtml() {
    return `
      <div class="callout warn">
        Encontramos tareas <strong>pendientes</strong> sin datos capturados todavía (es normal:
        Workflow no llena esos campos hasta que la tarea de captura del siniestro se termina).
        Para completarlos, filtra en Workflow las <strong>tareas terminadas</strong> del flujo
        "Registro del Siniestro", expórtalas y cárgalas aquí.
      </div>
      <div style="margin-top:12px;">
        ${dropzoneHtml(
          "input-siniestro",
          archivoSiniestro,
          "Arrastra aquí el archivo de tareas terminadas",
          "Exportación de Workflow del flujo Registro del Siniestro (.xlsx)"
        )}
      </div>`;
  }

  function panelResultadoHtml() {
    const filas = filasResultado;
    return `
      <div class="stat-row">
        <div class="stat-card">
          <div class="label">Pendientes de tu base (${esc(baseUsuario || "sin base")})</div>
          <div class="value">${filas.length}</div>
        </div>
        <div class="stat-card warn">
          <div class="label">3–6 días desde el incidente</div>
          <div class="value">${filas.filter((f) => f.diasTranscurridos !== null && f.diasTranscurridos >= 3 && f.diasTranscurridos < 7).length}</div>
        </div>
        <div class="stat-card danger">
          <div class="label">7+ días desde el incidente</div>
          <div class="value">${filas.filter((f) => f.diasTranscurridos !== null && f.diasTranscurridos >= 7).length}</div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div>
            <h3>2. Pendientes de tu base</h3>
            <p>${resumenExclusion}</p>
          </div>
        </div>
        <div class="panel-body" style="padding: ${filas.length === 0 ? "0" : "16px"};">
          ${filas.length === 0 ? `<div class="empty-state">No hay pendientes de tu base en este archivo.</div>` : tarjetasHtml(filas)}
        </div>
      </div>
    `;
  }

  function wireEvents() {
    const inputPrincipal = document.getElementById("input-principal");
    if (inputPrincipal) inputPrincipal.addEventListener("change", (e) => { const f = e.target.files[0]; if (f) manejarArchivoPrincipal(f); });
    const inputSiniestro = document.getElementById("input-siniestro");
    if (inputSiniestro) inputSiniestro.addEventListener("change", (e) => { const f = e.target.files[0]; if (f) manejarArchivoSiniestro(f); });

    document.querySelectorAll("[data-dropzone]").forEach((zona) => {
      const input = zona.querySelector("[data-file-input]");
      zona.addEventListener("dragover", (e) => { e.preventDefault(); zona.classList.add("drag"); });
      zona.addEventListener("dragleave", () => zona.classList.remove("drag"));
      zona.addEventListener("drop", (e) => {
        e.preventDefault();
        zona.classList.remove("drag");
        const f = e.dataTransfer?.files?.[0];
        if (!f) return;
        if (input.id === "input-principal") manejarArchivoPrincipal(f);
        else if (input.id === "input-siniestro") manejarArchivoSiniestro(f);
      });
    });
  }

  async function manejarArchivoPrincipal(file) {
    archivoPrincipal = file;
    archivoSiniestro = null;
    necesitaSiniestro = false;
    filasResultado = null;
    errorMsg = null;
    cargando = true;
    render();

    try {
      const wb = await leerWorkbook(file);
      const resultado = extraerRegistros(wb, HOJA_SOPORTE_TECNICO_CANDIDATOS);
      validarExtraccion(resultado, "BA Soporte Técnico GHO-Gestión");
      const { registros } = resultado;
      registrosPrincipal = registros;
      totalLeidas = registros.length;
      const incompletos = registros.filter(esIncompleto);

      if (incompletos.length > 0) {
        necesitaSiniestro = true;
        cargando = false;
        render();
        return;
      }
      await procesarYMostrar(registros);
    } catch (err) {
      console.error(err);
      errorMsg = err.message || "No se pudo procesar el archivo.";
      cargando = false;
      render();
    }
  }

  async function manejarArchivoSiniestro(file) {
    archivoSiniestro = file;
    cargando = true;
    errorMsg = null;
    render();

    try {
      const wb = await leerWorkbook(file);
      const resultadoSiniestro = extraerRegistros(wb, HOJA_REGISTRO_SINIESTRO_CANDIDATOS);
      validarExtraccion(resultadoSiniestro, "GHO BA Registro del Siniestro");
      const { registros: registrosSiniestro } = resultadoSiniestro;
      const indice = {};
      registrosSiniestro.forEach((r) => (indice[r.idEjFlujo] = r));
      const fusionados = registrosPrincipal.map((r) => (esIncompleto(r) ? fusionarConSiniestro(r, indice[r.idEjFlujo]) : r));
      await procesarYMostrar(fusionados);
    } catch (err) {
      console.error(err);
      errorMsg = err.message || "No se pudo procesar el archivo de tareas terminadas.";
      cargando = false;
      render();
    }
  }

  async function procesarYMostrar(registros) {
    try {
      const { filas: filasEnriquecidas, sinAutobus } = await enriquecerRegistros(registros);
      const baseUsuarioNorm = normalizarTextoBase(baseUsuario);
      const filas = filasEnriquecidas.filter((f) => f.base && normalizarTextoBase(f.base) === baseUsuarioNorm);
      const deOtraBase = filasEnriquecidas.length - filas.length;

      filasResultado = filas;
      const partes = [];
      partes.push(`${filasEnriquecidas.length} pendiente${filasEnriquecidas.length === 1 ? "" : "s"} en el archivo`);
      if (deOtraBase) partes.push(`${deOtraBase} de otra base (excluidos)`);
      if (sinAutobus) partes.push(`${sinAutobus} sin No. Económico identificado (excluidos)`);
      resumenExclusion = partes.join(" · ");
    } catch (err) {
      console.error(err);
      errorMsg = err.message || "Ocurrió un error consultando la base de datos.";
      filasResultado = null;
    } finally {
      cargando = false;
      render();
    }
  }
}

// ============================================================================
// Vista: jefe / gerente (todas las bases, pendientes + terminadas, KPIs)
// ============================================================================

function montarVistaJefe(root) {
  const estado = {
    pendientes: { archivo: null, archivoSiniestro: null, registrosCrudos: null, necesitaSiniestro: false, cargando: false, error: null, filas: null },
    terminadas: { archivo: null, archivoSiniestro: null, registrosCrudos: null, necesitaSiniestro: false, cargando: false, error: null, filas: null },
  };
  let baseSeleccionada = "TODAS";
  let pestañaActiva = "pendientes";

  const TITULOS = {
    pendientes: { archivo: "1. Cargar pendientes (todas las bases)", sub: "Exportación de Workflow · tareas pendientes" },
    terminadas: { archivo: "2. Cargar terminadas (todas las bases)", sub: "Exportación de Workflow · tareas terminadas" },
  };

  render();

  function render() {
    const datosPendientes = estado.pendientes.filas || [];
    const datosTerminadas = estado.terminadas.filas || [];
    const hayDatos = estado.pendientes.filas || estado.terminadas.filas;

    root.innerHTML = `
      ${panelCargaHtml("pendientes")}
      ${panelCargaHtml("terminadas")}
      ${hayDatos ? panelUniversoHtml(datosPendientes, datosTerminadas) : ""}
    `;
    wireEvents();
  }

  function panelCargaHtml(tipo) {
    const st = estado[tipo];
    const totalCrudo = st.registrosCrudos ? st.registrosCrudos.length : 0;
    const descartadas = st.sinAutobus || 0;
    return `
      <div class="panel">
        <div class="panel-header">
          <div>
            <h3>${TITULOS[tipo].archivo}</h3>
            <p>${TITULOS[tipo].sub}</p>
          </div>
          ${st.archivo ? `<span class="badge ok">Cargado</span>` : ""}
        </div>
        <div class="panel-body">
          ${dropzoneHtml(
            `input-${tipo}`,
            st.archivo,
            `Arrastra aquí el archivo de ${tipo}`,
            `Exportación de Workflow · tareas ${tipo} (.xlsx)`
          )}
          ${st.archivo && !st.error && st.totalLeidas !== undefined
            ? `<div class="callout info">Archivo leído: <strong>${st.totalLeidas}</strong> fila${st.totalLeidas === 1 ? "" : "s"} encontradas en la hoja de "${tipo}".</div>`
            : ""}
          ${st.necesitaSiniestro ? bloqueSiniestroHtml(tipo) : ""}
          ${st.error ? `<div class="callout error">${esc(st.error)}</div>` : ""}
          ${st.cargando ? cargandoHtml() : ""}
          ${
            st.filas && descartadas > 0
              ? `<div class="callout warn">
                  De ${totalCrudo} filas de "${tipo}" en el archivo, <strong>${descartadas}</strong> no se pudieron
                  identificar (sin No. Económico) y no aparecen abajo. Lo más común es que su "ID Ej. Flujo" no se
                  encontró en el archivo de Registro del Siniestro que subiste — confirma que ese archivo incluya
                  <strong>todas las bases</strong> y el periodo correspondiente a estos pendientes.
                </div>`
              : ""
          }
        </div>
      </div>`;
  }

  function bloqueSiniestroHtml(tipo) {
    const st = estado[tipo];
    return `
      <div class="callout warn">
        Encontramos tareas de <strong>${tipo}</strong> sin datos capturados todavía. Filtra en Workflow
        las <strong>tareas terminadas</strong> del flujo "Registro del Siniestro", expórtalas y cárgalas aquí.
      </div>
      <div style="margin-top:12px;">
        ${dropzoneHtml(
          `input-siniestro-${tipo}`,
          st.archivoSiniestro,
          "Arrastra aquí el archivo de tareas terminadas",
          "Exportación de Workflow del flujo Registro del Siniestro (.xlsx)"
        )}
      </div>`;
  }

  function panelUniversoHtml(datosPendientes, datosTerminadas) {
    const basesSet = new Set();
    [...datosPendientes, ...datosTerminadas].forEach((f) => { if (f.base) basesSet.add(f.base); });
    const bases = [...basesSet].sort();

    const activos = pestañaActiva === "pendientes" ? datosPendientes : datosTerminadas;
    const filtrados = baseSeleccionada === "TODAS" ? activos : activos.filter((f) => f.base === baseSeleccionada);

    const enRiesgo = datosPendientes.filter((f) => f.diasTranscurridos !== null && f.diasTranscurridos >= 3 && f.diasTranscurridos < 7).length;
    const criticos = datosPendientes.filter((f) => f.diasTranscurridos !== null && f.diasTranscurridos >= 7).length;

    return `
      <div class="stat-row">
        <div class="stat-card">
          <div class="label">Pendientes · todas las bases</div>
          <div class="value">${datosPendientes.length}</div>
        </div>
        <div class="stat-card ok">
          <div class="label">Terminadas · todas las bases</div>
          <div class="value">${datosTerminadas.length}</div>
        </div>
        <div class="stat-card warn">
          <div class="label">Pendientes 3–6 días</div>
          <div class="value">${enRiesgo}</div>
        </div>
        <div class="stat-card danger">
          <div class="label">Pendientes 7+ días</div>
          <div class="value">${criticos}</div>
        </div>
      </div>

      ${panelDesgloseBaseHtml(activos, bases)}

      <div class="panel">
        <div class="panel-header">
          <div>
            <h3>Detalle</h3>
            <p>${filtrados.length} ${pestañaActiva} ${baseSeleccionada === "TODAS" ? "· todas las bases" : `· base ${esc(baseSeleccionada)}`}</p>
          </div>
          <div class="panel-header-actions">
            <div class="tabs">
              <button type="button" class="tab-btn ${pestañaActiva === "pendientes" ? "active" : ""}" data-tab="pendientes">Pendientes (${datosPendientes.length})</button>
              <button type="button" class="tab-btn ${pestañaActiva === "terminadas" ? "active" : ""}" data-tab="terminadas">Terminadas (${datosTerminadas.length})</button>
            </div>
            <select id="selector-base" class="select-base">
              <option value="TODAS" ${baseSeleccionada === "TODAS" ? "selected" : ""}>Todas las bases</option>
              ${bases.map((b) => `<option value="${esc(b)}" ${baseSeleccionada === b ? "selected" : ""}>${esc(b)}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="panel-body" style="padding: ${filtrados.length === 0 ? "0" : "16px"};">
          ${filtrados.length === 0 ? `<div class="empty-state">No hay ${pestañaActiva} para esta selección.</div>` : tarjetasHtml(filtrados, { mostrarBase: true })}
        </div>
      </div>
    `;
  }

  function panelDesgloseBaseHtml(datos, bases) {
    if (bases.length === 0) return "";
    const conteos = bases
      .map((b) => ({ base: b, total: datos.filter((f) => f.base === b).length }))
      .sort((a, b) => b.total - a.total);
    const max = Math.max(1, ...conteos.map((c) => c.total));
    return `
      <div class="panel">
        <div class="panel-header">
          <div>
            <h3>Por base</h3>
            <p>${pestañaActiva === "pendientes" ? "Pendientes" : "Terminadas"} por base, de mayor a menor</p>
          </div>
        </div>
        <div class="panel-body">
          <div class="base-bars">
            ${conteos
              .map(
                (c) => `
              <div class="base-bar-row">
                <span class="base-bar-label">${esc(c.base)}</span>
                <div class="base-bar-track"><div class="base-bar-fill" style="width:${((c.total / max) * 100).toFixed(0)}%"></div></div>
                <span class="base-bar-value tabular">${c.total}</span>
              </div>`
              )
              .join("")}
          </div>
        </div>
      </div>`;
  }

  function wireEvents() {
    ["pendientes", "terminadas"].forEach((tipo) => {
      const input = document.getElementById(`input-${tipo}`);
      if (input) input.addEventListener("change", (e) => { const f = e.target.files[0]; if (f) manejarArchivo(tipo, f); });
      const inputSin = document.getElementById(`input-siniestro-${tipo}`);
      if (inputSin) inputSin.addEventListener("change", (e) => { const f = e.target.files[0]; if (f) manejarArchivoSiniestro(tipo, f); });
    });

    document.querySelectorAll("[data-dropzone]").forEach((zona) => {
      const input = zona.querySelector("[data-file-input]");
      zona.addEventListener("dragover", (e) => { e.preventDefault(); zona.classList.add("drag"); });
      zona.addEventListener("dragleave", () => zona.classList.remove("drag"));
      zona.addEventListener("drop", (e) => {
        e.preventDefault();
        zona.classList.remove("drag");
        const f = e.dataTransfer?.files?.[0];
        if (!f) return;
        if (input.id === "input-pendientes") manejarArchivo("pendientes", f);
        else if (input.id === "input-terminadas") manejarArchivo("terminadas", f);
        else if (input.id === "input-siniestro-pendientes") manejarArchivoSiniestro("pendientes", f);
        else if (input.id === "input-siniestro-terminadas") manejarArchivoSiniestro("terminadas", f);
      });
    });

    const selectorBase = document.getElementById("selector-base");
    if (selectorBase) selectorBase.addEventListener("change", (e) => { baseSeleccionada = e.target.value; render(); });

    document.querySelectorAll("[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => { pestañaActiva = btn.dataset.tab; render(); });
    });
  }

  async function manejarArchivo(tipo, file) {
    const st = estado[tipo];
    st.archivo = file;
    st.archivoSiniestro = null;
    st.necesitaSiniestro = false;
    st.filas = null;
    st.error = null;
    st.cargando = true;
    render();

    try {
      const wb = await leerWorkbook(file);
      const resultado = extraerRegistros(wb, HOJA_SOPORTE_TECNICO_CANDIDATOS);
      validarExtraccion(resultado, "BA Soporte Técnico GHO-Gestión");
      const { registros } = resultado;
      st.registrosCrudos = registros;
      st.totalLeidas = registros.length;
      const incompletos = registros.filter(esIncompleto);

      if (incompletos.length > 0) {
        st.necesitaSiniestro = true;
        st.cargando = false;
        render();
        return;
      }
      await procesarUniverso(tipo, registros);
    } catch (err) {
      console.error(err);
      st.error = err.message || "No se pudo procesar el archivo.";
      st.cargando = false;
      render();
    }
  }

  async function manejarArchivoSiniestro(tipo, file) {
    const st = estado[tipo];
    st.archivoSiniestro = file;
    st.cargando = true;
    st.error = null;
    render();

    try {
      const wb = await leerWorkbook(file);
      const resultadoSiniestro = extraerRegistros(wb, HOJA_REGISTRO_SINIESTRO_CANDIDATOS);
      validarExtraccion(resultadoSiniestro, "GHO BA Registro del Siniestro");
      const { registros: registrosSiniestro } = resultadoSiniestro;
      const indice = {};
      registrosSiniestro.forEach((r) => (indice[r.idEjFlujo] = r));
      const fusionados = st.registrosCrudos.map((r) => (esIncompleto(r) ? fusionarConSiniestro(r, indice[r.idEjFlujo]) : r));
      await procesarUniverso(tipo, fusionados);
    } catch (err) {
      console.error(err);
      st.error = err.message || "No se pudo procesar el archivo de tareas terminadas.";
      st.cargando = false;
      render();
    }
  }

  async function procesarUniverso(tipo, registros) {
    const st = estado[tipo];
    try {
      const { filas, sinAutobus, sinBase } = await enriquecerRegistros(registros);
      st.filas = filas;
      st.sinAutobus = sinAutobus;
      st.sinBase = sinBase;
    } catch (err) {
      console.error(err);
      st.error = err.message || "Ocurrió un error consultando la base de datos.";
      st.filas = null;
    } finally {
      st.cargando = false;
      render();
    }
  }
}

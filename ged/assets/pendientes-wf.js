import { supabase } from "./supabaseClient.js";
import {
  CAMPO_BASE_USUARIO,
  TABLA_FLOTA,
  COL_FLOTA_AUTOBUS,
  COL_FLOTA_BASE,
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
  if (!nombreHoja) return { registros: [], nombreHoja: null };

  const hoja = workbook.Sheets[nombreHoja];
  const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, raw: false, defval: "" });
  const idxEncabezado = encontrarFilaEncabezado(filas);
  if (idxEncabezado === -1) return { registros: [], nombreHoja };

  const mapa = construirMapaColumnas(filas[idxEncabezado]);
  const registros = [];

  for (let i = idxEncabezado + 1; i < filas.length; i++) {
    const fila = filas[i];
    if (!fila || fila.every((c) => textoCelda(c) === "")) continue;
    const idEjFlujo = textoCelda(fila[mapa.idEjFlujo]);
    if (!idEjFlujo) continue;

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
    });
  }

  return { registros, nombreHoja };
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

async function obtenerBasesPorAutobus(numeros) {
  const mapa = {};
  if (numeros.length === 0) return mapa;
  const { data, error } = await supabase
    .from(TABLA_FLOTA)
    .select(`${COL_FLOTA_AUTOBUS}, ${COL_FLOTA_BASE}`)
    .in(COL_FLOTA_AUTOBUS, numeros);
  if (error) {
    console.error("Error consultando " + TABLA_FLOTA + ":", error);
    throw new Error(`No se pudo consultar "${TABLA_FLOTA}" para obtener la base de cada autobús.`);
  }
  (data || []).forEach((r) => {
    mapa[textoCelda(r[COL_FLOTA_AUTOBUS])] = r[COL_FLOTA_BASE];
  });
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
  const historial = {};
  if (numeros.length === 0) return historial;

  const { data, error } = await supabase
    .from(TABLA_BANDEJA)
    .select(`${COL_BANDEJA_AUTOBUS}, ${COL_BANDEJA_SUBE}, ${COL_BANDEJA_BAJA}, ${COL_BANDEJA_FECHA}`)
    .in(COL_BANDEJA_AUTOBUS, numeros)
    .order(COL_BANDEJA_FECHA, { ascending: true });
  if (error) {
    console.error("Error consultando " + TABLA_BANDEJA + ":", error);
    throw new Error(`No se pudo consultar "${TABLA_BANDEJA}" (historial de bandeja).`);
  }
  return data || [];
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

  const lista = unicos.map((d) => `"${d.replace(/"/g, '\\"')}"`).join(",");
  const { data, error } = await supabase
    .from(TABLA_BANDEJA)
    .select(`${COL_BANDEJA_AUTOBUS}, ${COL_BANDEJA_SUBE}, ${COL_BANDEJA_BAJA}, ${COL_BANDEJA_FECHA}`)
    .or(`${COL_BANDEJA_SUBE}.in.(${lista}),${COL_BANDEJA_BAJA}.in.(${lista})`)
    .order(COL_BANDEJA_FECHA, { ascending: true });
  if (error) {
    console.error("Error consultando " + TABLA_BANDEJA + " (ubicación actual):", error);
    throw new Error(`No se pudo consultar "${TABLA_BANDEJA}" para ubicar el disco actualmente.`);
  }

  (data || []).forEach((r) => {
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

export function montarPendientesWF(root, { usuario, esAuxiliar }) {
  const baseUsuario = textoCelda(usuario[CAMPO_BASE_USUARIO]);

  if (!esAuxiliar) {
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
            <strong>auxiliar</strong>, <strong>técnico</strong> y <strong>coordinador</strong>.
            Tu perfil actual no tiene esta opción habilitada.
          </div>
        </div>
      </div>`;
    return;
  }

  let archivoPrincipal = null;
  let archivoSiniestro = null;
  let registrosPrincipal = null;
  let necesitaSiniestro = false;
  let cargando = false;
  let errorMsg = null;
  let filasResultado = null; // resultado final ya filtrado por base
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
          ${necesitaSiniestro ? bloqueSiniestroHtml() : ""}
          ${errorMsg ? `<div class="callout error">${esc(errorMsg)}</div>` : ""}
          ${
            cargando
              ? `<div class="callout info"><span class="spinner" style="border-color:rgba(13,92,83,.35); border-top-color:#0d5c53;"></span> Procesando información…</div>`
              : ""
          }
        </div>
      </div>

      ${filasResultado ? panelResultadoHtml() : ""}
    `;

    wireEvents();
  }

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

  function tarjetasHtml(filas) {
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

  function wireEvents() {
    const inputPrincipal = document.getElementById("input-principal");
    if (inputPrincipal) {
      inputPrincipal.addEventListener("change", (e) => {
        const f = e.target.files[0];
        if (f) manejarArchivoPrincipal(f);
      });
    }
    const inputSiniestro = document.getElementById("input-siniestro");
    if (inputSiniestro) {
      inputSiniestro.addEventListener("change", (e) => {
        const f = e.target.files[0];
        if (f) manejarArchivoSiniestro(f);
      });
    }

    document.querySelectorAll("[data-dropzone]").forEach((zona) => {
      const input = zona.querySelector("[data-file-input]");
      const onDrop = (accion) => (e) => {
        e.preventDefault();
        zona.classList.remove("drag");
        const f = e.dataTransfer?.files?.[0];
        if (f) accion(f);
      };
      const accion = input.id === "input-principal" ? manejarArchivoPrincipal : manejarArchivoSiniestro;
      zona.addEventListener("dragover", (e) => {
        e.preventDefault();
        zona.classList.add("drag");
      });
      zona.addEventListener("dragleave", () => zona.classList.remove("drag"));
      zona.addEventListener("drop", onDrop(accion));
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
      const { registros, nombreHoja } = extraerRegistros(wb, HOJA_SOPORTE_TECNICO_CANDIDATOS);
      if (!nombreHoja) {
        throw new Error(
          `No encontré la hoja "BA Soporte Técnico GHO-Gestión" (ni su equivalente ASJ) en este archivo.`
        );
      }
      registrosPrincipal = registros;
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
      const { registros: registrosSiniestro, nombreHoja } = extraerRegistros(wb, HOJA_REGISTRO_SINIESTRO_CANDIDATOS);
      if (!nombreHoja) {
        throw new Error(
          `No encontré la hoja "GHO BA Registro del Siniestro" (ni su equivalente ASJ) en este archivo.`
        );
      }
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
      const conAutobus = registros.filter((r) => r.noEconomico);
      const sinAutobus = registros.length - conAutobus.length;

      const numerosUnicos = [...new Set(conAutobus.map((r) => r.noEconomico))];
      const mapaBases = await obtenerBasesPorAutobus(numerosUnicos);

      const propiosDeBase = conAutobus.filter((r) => {
        const base = mapaBases[r.noEconomico];
        return base && textoCelda(base).toLowerCase() === baseUsuario.toLowerCase();
      });
      const deOtraBase = conAutobus.length - propiosDeBase.length;

      let mapaDiscoVigente = {}; // idEjFlujo -> disco
      let mapaUbicacionDisco = {}; // disco -> { estado, autobus }
      try {
        const historialBandeja = await obtenerHistorialBandejaPorAutobus(numerosUnicos);
        propiosDeBase.forEach((r) => {
          const fechaHora = construirFechaHoraIncidente(r.fechaIncidente, r.horarioIncidente);
          mapaDiscoVigente[r.idEjFlujo] = discoVigenteEnFecha(historialBandeja, r.noEconomico, fechaHora);
        });
        mapaUbicacionDisco = await obtenerUbicacionActualDeDiscos(Object.values(mapaDiscoVigente));
      } catch (errBandeja) {
        console.warn("Historial de bandeja no disponible:", errBandeja.message);
      }

      const filas = propiosDeBase.map((r) => {
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

      filasResultado = filas;
      const partes = [];
      partes.push(`${conAutobus.length} pendiente${conAutobus.length === 1 ? "" : "s"} en el archivo`);
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

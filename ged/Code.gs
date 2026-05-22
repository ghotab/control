// ============================================================
// SISTEMA CONTROL BITÁCORA EVIDENCIAS DIGITALES (GED)
// Google Apps Script Backend — Code.gs
// ============================================================

const SHEETS = {
  SOLICITUDES: 'Solicitudes',
  CADENA_CUSTODIA: 'CadenaCustodia',
  TRANSFERENCIAS: 'Transferencias',
  BITACORA_EXTRACCIONES: 'BitacoraExtracciones',
  COMPARTICION: 'Comparticion',
  INCIDENCIAS: 'Incidencias',
  PRESTAMO_BANDEJAS: 'PrestamoBandejas',
  USUARIOS: 'Usuarios',
  CONFIG: 'Config'
};

const HEADERS = {
  SOLICITUDES: [
    'Folio GED','Area Solicitante','Folio Solicitud','Medio Recepcion','Fecha Solicitud','Hora Solicitud','FechaHora Solicitud',
    'Unidad','Fecha Evento','Hora Evento','Tipo Evento','Prioridad','Ubicacion','Descripcion',
    'Auxiliar Asignado','Resultado','FechaHora Atencion','Observaciones',
    'Timestamp Registro'
  ],
  CADENA_CUSTODIA: [
    'Folio GED','Autobus','Bandeja',
    'FechaHora Extraccion','Auxiliar Extraccion','Metodo','Validacion CEIBA',
    'Estatus Final',
    'Timestamp Registro'
  ],
  TRANSFERENCIAS: [
    'Folio GED','Fecha','Hora','Entrega','Recibe','Area','Motivo','Condicion','Timestamp Registro'
  ],
  BITACORA_EXTRACCIONES: [
    'Folio GED','Fecha','Hora Inicio','Hora Fin','Auxiliar','Unidad',
    'Tipo Extraccion','Metodo','Resultado','Tiempo Atencion',
    'Se Compartio','Incidencia Detectada','Observaciones','Timestamp Registro'
  ],
  COMPARTICION: [
    'Folio GED','Fecha Comparticion','Hora Comparticion','Clave Compartido Por','Compartido Por','Autorizado Por',
    'Destinatario','Area Destino','Tipo Evento','Medio Comparticion','Link Generado',
    'Acceso Link','Observaciones','Timestamp Registro'
  ],
  INCIDENCIAS: [
    'Folio Incidencia','Fecha','Unidad','Tipo DVR','Tipo Falla','Canal Afectado',
    'Detectado Por','Durante','Reportado En','Folio Meipack','Criticidad','Observaciones','Timestamp Registro'
  ],
  PRESTAMO_BANDEJAS: [
    'Folio Prestamo','Fecha Salida','Hora Salida','Bandeja','Unidad','Entrego','Recibio',
    'Area Receptora','Motivo','Fecha Compromiso','Fecha Devolucion','Estatus',
    'Validacion Previa','Validacion Posterior','Observaciones','Timestamp Registro'
  ],
  USUARIOS: [
    'clave','nombre','rol','activo'
  ]
};

// ============================================================
// DOGET — Sirve el HTML principal
// ============================================================
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Control GED — Bitácora Evidencias Digitales')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============================================================
// DOPOST — API REST vía POST
// ============================================================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    let result;
    switch (action) {
      case 'init': result = initSheets(); break;
      case 'saveSolicitud': result = saveSolicitud(data.payload); break;
      case 'getSolicitudes': result = getSolicitudes(data.filters); break;
      case 'saveCadena': result = saveCadenaCustodia(data.payload); break;
      case 'getCadenas': result = getCadenasCustodia(data.filters); break;
      case 'saveTransferencia': result = saveTransferencia(data.payload); break;
      case 'getTransferencias': result = getTransferencias(data.folioGED); break;
      case 'saveBitacora': result = saveBitacoraExtraccion(data.payload); break;
      case 'getBitacora': result = getBitacoraExtracciones(data.filters); break;
      case 'saveComparticion': result = saveComparticion(data.payload); break;
      case 'getComparticiones': result = getComparticiones(data.filters); break;
      case 'saveIncidencia': result = saveIncidencia(data.payload); break;
      case 'getIncidencias': result = getIncidencias(data.filters); break;
      case 'savePrestamo': result = savePrestamo(data.payload); break;
      case 'getPrestamos': result = getPrestamos(data.filters); break;
      case 'getDashboard': result = getDashboardData(); break;
      case 'getUsuarios': result = getUsuarios(); break;
      case 'updateEstatus': result = updateEstatus(data.sheet, data.folio, data.campo, data.valor); break;
      default: result = { error: 'Acción no reconocida' };
    }
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// INICIALIZACIÓN DE HOJAS
// ============================================================
function initSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEETS).forEach(key => {
    const name = SHEETS[key];
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      if (HEADERS[key]) {
        sheet.getRange(1, 1, 1, HEADERS[key].length).setValues([HEADERS[key]]);
        sheet.getRange(1, 1, 1, HEADERS[key].length)
          .setBackground('#1a1a2e').setFontColor('#ffffff').setFontWeight('bold');
        sheet.setFrozenRows(1);
      }
    } else if (HEADERS[key]) {
      ensureHeaders(sheet, HEADERS[key]);
    }
  });
  return { ok: true, message: 'Hojas inicializadas correctamente' };
}

// ============================================================
// FOLIO GENERATOR
// ============================================================
function generateFolio(prefix, sheet) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(sheet);
  const lastRow = sh.getLastRow();
  const year = new Date().getFullYear().toString().slice(-2);
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const seq = String(lastRow).padStart(4, '0');
  return `${prefix}-${year}${month}-${seq}`;
}

function ensureHeaders(sheet, headers) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const current = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  headers.forEach(header => {
    if (!current.includes(header)) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header)
        .setBackground('#1a1a2e').setFontColor('#ffffff').setFontWeight('bold');
      current.push(header);
    }
  });
}

function appendByHeader(sheet, record) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  sheet.appendRow(headers.map(header => record[header] ?? ''));
}

// ============================================================
// SOLICITUDES
// ============================================================
function saveSolicitud(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.SOLICITUDES);
  ensureHeaders(sheet, HEADERS.SOLICITUDES);
  const folio = data.folioGED || generateFolio('GED', SHEETS.SOLICITUDES);
  const fechaHoraSolicitud = data.fechaHoraSolicitud || [data.fechaSolicitud, data.horaSolicitud].filter(Boolean).join(' ');
  const record = {
    'Folio GED': folio,
    'Folio Origen': data.folioSolicitud || data.folioOrigen,
    'Folio Solicitud': data.folioSolicitud || data.folioOrigen,
    'Fuente Solicitud': data.fuenteSolicitud || '',
    'Fecha Solicitud': data.fechaSolicitud,
    'Hora Solicitud': data.horaSolicitud,
    'FechaHora Solicitud': fechaHoraSolicitud,
    'Solicitante': data.solicitante || data.areaSolicitante,
    'Area Solicitante': data.areaSolicitante,
    'Medio Recepcion': data.medioRecepcion,
    'Unidad': data.unidad,
    'Fecha Evento': data.fechaEvento,
    'Hora Aproximada': data.horaEvento || data.horaAproximada,
    'Hora Evento': data.horaEvento || data.horaAproximada,
    'Ubicacion': data.ubicacion,
    'Tipo Evento': data.tipoEvento,
    'Prioridad': data.prioridad,
    'Descripcion': data.descripcion,
    'Auxiliar Asignado': data.auxiliarAsignado,
    'Fecha Atencion': data.fechaAtencion,
    'Hora Atencion': data.horaAtencion,
    'FechaHora Atencion': data.fechaHoraAtencion,
    'Resultado': data.resultado,
    'Observaciones': data.observaciones,
    'Timestamp Registro': new Date().toISOString()
  };
  appendByHeader(sheet, record);
  return { ok: true, folio: folio };
}

function getSolicitudes(filters = {}) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.SOLICITUDES);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  }).filter(row => {
    if (filters.resultado && row['Resultado'] !== filters.resultado) return false;
    if (filters.prioridad && row['Prioridad'] !== filters.prioridad) return false;
    if (filters.folio && !row['Folio GED'].includes(filters.folio)) return false;
    return true;
  });
}

// ============================================================
// CADENA DE CUSTODIA
// ============================================================
function saveCadenaCustodia(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.CADENA_CUSTODIA);
  ensureHeaders(sheet, HEADERS.CADENA_CUSTODIA);
  const folio = data.folioGED || generateFolio('GED', SHEETS.SOLICITUDES);
  const record = {
    'Folio GED': folio,
    'Tipo Evento': data.tipoEvento,
    'Prioridad': data.prioridad,
    'Unidad': data.autobus || data.unidad,
    'Autobus': data.autobus || data.unidad,
    'Bandeja': data.bandeja,
    'Fecha Evento': data.fechaEvento,
    'Fecha Extraccion': data.fechaExtraccion,
    'Hora Extraccion': data.horaExtraccion,
    'FechaHora Extraccion': data.fechaHoraExtraccion,
    'Responsable Extraccion': data.auxiliarExtraccion || data.responsableExtraccion,
    'Auxiliar Extraccion': data.auxiliarExtraccion || data.responsableExtraccion,
    'Metodo': data.metodo,
    'Software Utilizado': data.softwareUtilizado,
    'Condicion Medio': data.condicionMedio,
    'Validacion CEIBA': data.validacionCEIBA,
    'Estatus Final': data.estatusFinal,
    'Responsable Resguardo': data.responsableResguardo,
    'Observaciones Finales': data.observacionesFinales,
    'Timestamp Registro': new Date().toISOString()
  };
  appendByHeader(sheet, record);
  if (data.transferencias && data.transferencias.length > 0) {
    data.transferencias.forEach(t => {
      saveTransferencia({ ...t, folioGED: folio });
    });
  }
  return { ok: true, folio: folio };
}

function getCadenasCustodia(filters = {}) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.CADENA_CUSTODIA);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

// ============================================================
// TRANSFERENCIAS
// ============================================================
function saveTransferencia(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.TRANSFERENCIAS);
  const row = [
    data.folioGED, data.fecha, data.hora, data.entrega, data.recibe,
    data.area, data.motivo, data.condicion, new Date().toISOString()
  ];
  sheet.appendRow(row);
  return { ok: true };
}

function getTransferencias(folioGED) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.TRANSFERENCIAS);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1)
    .map(row => { const obj = {}; headers.forEach((h, i) => obj[h] = row[i]); return obj; })
    .filter(row => !folioGED || row['Folio GED'] === folioGED);
}

// ============================================================
// BITÁCORA EXTRACCIONES
// ============================================================
function saveBitacoraExtraccion(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.BITACORA_EXTRACCIONES);
  const folio = generateFolio('GED', SHEETS.SOLICITUDES);
  const tiempoAtencion = calcularTiempo(data.horaInicio, data.horaFin);
  const row = [
    folio, data.fecha, data.horaInicio, data.horaFin, data.auxiliar, data.unidad,
    data.tipoExtraccion, data.metodo, data.resultado, tiempoAtencion,
    data.seCompartio, data.incidenciaDetectada, data.observaciones,
    new Date().toISOString()
  ];
  sheet.appendRow(row);
  return { ok: true, folio: folio, tiempoAtencion: tiempoAtencion };
}

function calcularTiempo(inicio, fin) {
  try {
    const [hi, mi] = inicio.split(':').map(Number);
    const [hf, mf] = fin.split(':').map(Number);
    const minutos = (hf * 60 + mf) - (hi * 60 + mi);
    if (minutos < 0) return 'N/A';
    return `${Math.floor(minutos / 60)}h ${minutos % 60}m`;
  } catch (e) { return 'N/A'; }
}

function getBitacoraExtracciones(filters = {}) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.BITACORA_EXTRACCIONES);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

// ============================================================
// COMPARTICIÓN
// ============================================================
function saveComparticion(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.COMPARTICION);
  ensureHeaders(sheet, HEADERS.COMPARTICION);
  const folio = generateFolio('GED', SHEETS.SOLICITUDES);
  const record = {
    'Folio GED': folio,
    'Fecha Comparticion': data.fechaComparticion,
    'Hora Comparticion': data.horaComparticion,
    'Clave Compartido Por': data.claveCompartidoPor,
    'Compartido Por': data.compartidoPor,
    'Autorizado Por': data.autorizadoPor,
    'Destinatario': data.destinatario,
    'Area Destino': data.areaDestino,
    'Tipo Evento': data.tipoEvento,
    'Medio Comparticion': data.medioComparticion,
    'Link Generado': data.linkGenerado,
    'Acceso Link': data.accesoLink,
    'Observaciones': data.observaciones,
    'Timestamp Registro': new Date().toISOString()
  };
  appendByHeader(sheet, record);
  return { ok: true, folio: folio };
}

function getComparticiones(filters = {}) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.COMPARTICION);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function getUsuarios() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.USUARIOS);
  if (!sheet) return { ok: true, usuarios: [] };
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { ok: true, usuarios: [] };
  const headers = data[0].map(String);
  const usuarios = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  }).filter(u => {
    const rol = String(u.rol || u.Rol || u.perfil || u.Perfil || '').toLowerCase();
    return ['gestor', 'gestores', 'coordinador', 'coordinadores'].includes(rol);
  }).map(u => {
    delete u.password;
    delete u.Password;
    return u;
  });
  return { ok: true, usuarios };
}

// ============================================================
// INCIDENCIAS
// ============================================================
function saveIncidencia(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.INCIDENCIAS);
  const folio = generateFolio('INC', SHEETS.INCIDENCIAS);
  const row = [
    folio, data.fecha, data.unidad, data.tipoDVR, data.tipoFalla,
    data.canalAfectado, data.detectadoPor, data.durante, data.reportadoEn,
    data.folioMeipack, data.criticidad, data.observaciones,
    new Date().toISOString()
  ];
  sheet.appendRow(row);
  return { ok: true, folio: folio };
}

function getIncidencias(filters = {}) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.INCIDENCIAS);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  }).filter(row => {
    if (filters.criticidad && row['Criticidad'] !== filters.criticidad) return false;
    if (filters.tipoFalla && row['Tipo Falla'] !== filters.tipoFalla) return false;
    return true;
  });
}

// ============================================================
// PRÉSTAMO DE BANDEJAS
// ============================================================
function savePrestamo(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.PRESTAMO_BANDEJAS);
  const folio = generateFolio('PREST', SHEETS.PRESTAMO_BANDEJAS);
  const row = [
    folio, data.fechaSalida, data.horaSalida, data.bandeja, data.unidad,
    data.entrego, data.recibio, data.areaReceptora, data.motivo,
    data.fechaCompromiso, data.fechaDevolucion, data.estatus,
    data.validacionPrevia, data.validacionPosterior, data.observaciones,
    new Date().toISOString()
  ];
  sheet.appendRow(row);
  return { ok: true, folio: folio };
}

function getPrestamos(filters = {}) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.PRESTAMO_BANDEJAS);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  }).filter(row => {
    if (filters.estatus && row['Estatus'] !== filters.estatus) return false;
    return true;
  });
}

// ============================================================
// DASHBOARD STATS
// ============================================================
function getDashboardData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const result = {};

  const solicitudes = getSolicitudes();
  result.totalSolicitudes = solicitudes.length;
  result.solicitudesPendientes = solicitudes.filter(r => r['Resultado'] === 'Pendiente').length;
  result.solicitudesRecuperadas = solicitudes.filter(r => r['Resultado'] === 'Recuperado').length;
  result.solicitudesSinVideo = solicitudes.filter(r => r['Resultado'] === 'Sin video').length;
  result.solicitudesConIncidencia = solicitudes.filter(r => r['Resultado'] === 'Con incidencia técnica').length;

  const comparticiones = getComparticiones();
  result.totalComparticiones = comparticiones.length;

  result.tiposEventoCount = {};
  solicitudes.forEach(r => {
    const tipo = r['Tipo Evento'];
    if (tipo) result.tiposEventoCount[tipo] = (result.tiposEventoCount[tipo] || 0) + 1;
  });

  result.resultadosCount = {};
  solicitudes.forEach(r => {
    const res = r['Resultado'];
    result.resultadosCount[res] = (result.resultadosCount[res] || 0) + 1;
  });

  result.ultimasSolicitudes = solicitudes.slice(-5).reverse();

  return result;
}

// ============================================================
// ACTUALIZAR ESTATUS
// ============================================================
function updateEstatus(sheetName, folio, campo, valor) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const colIdx = headers.indexOf(campo);
  if (colIdx === -1) return { error: 'Campo no encontrado' };
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === folio) {
      sheet.getRange(i + 1, colIdx + 1).setValue(valor);
      return { ok: true };
    }
  }
  return { error: 'Folio no encontrado' };
}

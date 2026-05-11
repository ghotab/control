/**
 * GESTIÓN DE TURNOS — Google Apps Script Backend
 * Hoja de cálculo estructurada: Usuarios | Turnos | SolicitudesRH | Bases
 *
 * Despliega como: Web App > Ejecutar como: Yo > Acceso: Cualquiera
 */

// ── Constantes ────────────────────────────────────────────────
const SS_ID = '1g3QjgE0kBMnJNYXf03YsKB4E9wTVXKCzCaonTbzyCJ8';
const SHEETS = {
  USUARIOS: 'Usuarios',
  TURNOS: 'Turnos',
  SOLICITUDES: 'SolicitudesRH',
  BASES: 'Bases'
};

// ── Entry Point ───────────────────────────────────────────────
function doGet(e) {
  const params = e.parameter || {};
  const accion = params.accion || '';
  let result;

  try {
    switch (accion) {
      // Auth
      case 'login':           result = login(params); break;
      // Turnos
      case 'getTurnos':       result = getTurnos(params); break;
      case 'guardarTurnos':   result = guardarTurnos(params); break;
      // Usuarios
      case 'getUsuarios':     result = getUsuarios(params); break;
      case 'crearUsuario':    result = crearUsuario(params); break;
      case 'actualizarUsuario': result = actualizarUsuario(params); break;
      case 'cambiarEstatusUsuario': result = cambiarEstatusUsuario(params); break;
      // Bases
      case 'getBases':        result = getBases(params); break;
      case 'crearBase':       result = crearBase(params); break;
      case 'actualizarBase':  result = actualizarBase(params); break;
      // Solicitudes
      case 'getSolicitudes':  result = getSolicitudes(params); break;
      case 'crearSolicitud':  result = crearSolicitud(params); break;
      case 'resolverSolicitud': result = resolverSolicitud(params); break;
      // Indicadores
      case 'getIndicadores':  result = getIndicadores(params); break;

      default:
        result = { success: false, mensaje: 'Acción no reconocida: ' + accion };
    }
  } catch (err) {
    result = { success: false, mensaje: 'Error interno: ' + err.toString() };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Helpers ───────────────────────────────────────────────────
function getSheet(name) {
  const ss = SS_ID
    ? SpreadsheetApp.openById(SS_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name);
}

function sheetToObjects(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row =>
    Object.fromEntries(headers.map((h, i) => [h, String(row[i] ?? '')]))
  );
}

function validateRole(requiredRoles, clave) {
  const sheet = getSheet(SHEETS.USUARIOS);
  const users = sheetToObjects(sheet);
  const user = users.find(u => u.clave === clave);
  if (!user) return false;
  return requiredRoles.includes(user.rol);
}

function generateId() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 12);
}

// ── LOGIN ─────────────────────────────────────────────────────
function login(params) {
  const { clave, password } = params;
  if (!clave || !password) return { success: false, mensaje: 'Campos incompletos' };

  const sheet = getSheet(SHEETS.USUARIOS);
  const users = sheetToObjects(sheet);
  const user = users.find(u => u.clave === clave && u.password === password && u.activo !== '0');

  if (!user) return { success: false, mensaje: 'Credenciales incorrectas o usuario inactivo' };

  return {
    success: true,
    clave: user.clave,
    nombre: user.nombre,
    rol: user.rol,
    base: user.base
  };
}

// ── TURNOS ────────────────────────────────────────────────────
function getTurnos(params) {
  const { base, semana } = params;
  const sheet = getSheet(SHEETS.TURNOS);
  let turnos = sheetToObjects(sheet);

  function normalizeDate(value) {
    if (!value) return null;
    if (Object.prototype.toString.call(value) === '[object Date]') {
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }
    const text = String(value).trim();
    if (!text) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return new Date(text + 'T00:00:00');
    }
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
      return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }
    const parts = text.split(/[\/\-\.\s]+/).map(p => parseInt(p, 10)).filter(n => !Number.isNaN(n));
    if (parts.length === 3) {
      // Try dd/mm/yyyy or yyyy/mm/dd formats
      if (parts[0] > 31) {
        return new Date(parts[0], parts[1] - 1, parts[2]);
      }
      if (parts[2] > 31) {
        return new Date(parts[2], parts[1] - 1, parts[0]);
      }
    }
    return null;
  }

  function formatIsoDate(value) {
    const d = normalizeDate(value);
    if (!d) return null;
    return Utilities.formatDate(d, Session.getScriptTimeZone() || 'UTC', 'yyyy-MM-dd');
  }

  turnos = turnos.map(t => ({
    base: String(t.base || '').trim(),
    tecnico: String(t.tecnico || '').trim(),
    fecha: formatIsoDate(t.fecha) || String(t.fecha || '').trim(),
    turno: String(t.turno || '').trim().toUpperCase()
  }));

  if (semana) {
    const monday = new Date(semana + 'T00:00:00');
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    turnos = turnos.filter(t => {
      const d = normalizeDate(t.fecha);
      return d && d >= monday && d <= sunday;
    });
  }

  if (base) {
    const bases = parseBases(base);
    if (bases.length) {
      turnos = turnos.filter(t => bases.includes(t.base));
    }
  }

  return { success: true, turnos };
}

function parseBases(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).map(v => v.trim()).filter(Boolean);
  return String(value).split(/[,;|]+/).map(v => v.trim()).filter(Boolean);
}

function guardarTurnos(params) {
  let items;
  try { items = JSON.parse(params.data); } catch { return { success: false, mensaje: 'JSON inválido' }; }

  const sheet = getSheet(SHEETS.TURNOS);
  if (!sheet) return { success: false, mensaje: 'Hoja Turnos no encontrada' };

  const existing = sheetToObjects(sheet);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];

  for (const item of items) {
    const rowIdx = existing.findIndex(e => e.base === item.base && e.tecnico === item.tecnico && e.fecha === item.fecha);
    if (rowIdx >= 0) {
      // Update existing row (rowIdx + 2 because 1-indexed + header)
      const row = rowIdx + 2;
      const turnoCol = headers.indexOf('turno') + 1;
      if (turnoCol > 0) sheet.getRange(row, turnoCol).setValue(item.turno);
    } else {
      // Append new row
      sheet.appendRow([item.base, item.tecnico, item.fecha, item.turno]);
    }
  }

  return { success: true, mensaje: `${items.length} turno(s) guardado(s)` };
}

// ── USUARIOS ──────────────────────────────────────────────────
function getUsuarios(params) {
  const sheet = getSheet(SHEETS.USUARIOS);
  const usuarios = sheetToObjects(sheet).map(u => {
    const copy = { ...u };
    delete copy.password; // Never expose password
    return copy;
  });
  return { success: true, usuarios };
}

function crearUsuario(params) {
  let data;
  try { data = JSON.parse(params.data); } catch { return { success: false, mensaje: 'JSON inválido' }; }

  const sheet = getSheet(SHEETS.USUARIOS);
  const existing = sheetToObjects(sheet);

  if (existing.find(u => u.clave === data.clave)) {
    return { success: false, mensaje: 'Ya existe un usuario con esa clave' };
  }

  sheet.appendRow([data.clave, data.nombre, data.rol, data.base, data.password || '12345', data.activo || '1']);
  return { success: true, mensaje: 'Usuario creado' };
}

function actualizarUsuario(params) {
  let data;
  try { data = JSON.parse(params.data); } catch { return { success: false, mensaje: 'JSON inválido' }; }

  const sheet = getSheet(SHEETS.USUARIOS);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const claveCol = headers.indexOf('clave');

  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][claveCol]) === String(data.clave)) {
      headers.forEach((h, j) => {
        if (h !== 'password' && data[h] !== undefined) {
          sheet.getRange(i + 1, j + 1).setValue(data[h]);
        }
      });
      return { success: true, mensaje: 'Usuario actualizado' };
    }
  }

  return { success: false, mensaje: 'Usuario no encontrado' };
}

function cambiarEstatusUsuario(params) {
  const { clave, activo } = params;
  const sheet = getSheet(SHEETS.USUARIOS);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const claveCol = headers.indexOf('clave');
  const activoCol = headers.indexOf('activo');

  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][claveCol]) === String(clave)) {
      sheet.getRange(i + 1, activoCol + 1).setValue(activo);
      return { success: true, mensaje: 'Estatus actualizado' };
    }
  }

  return { success: false, mensaje: 'Usuario no encontrado' };
}

// ── BASES ─────────────────────────────────────────────────────
function getBases(params) {
  const sheet = getSheet(SHEETS.BASES);
  const bases = sheetToObjects(sheet);
  return { success: true, bases };
}

function crearBase(params) {
  let data;
  try { data = JSON.parse(params.data); } catch { return { success: false, mensaje: 'JSON inválido' }; }

  const sheet = getSheet(SHEETS.BASES);
  const id = generateId();
  sheet.appendRow([id, data.nombre, data.tipos || data.tipo || '', data.direccion || '', data.activo || '1', 0, data.horarios || '']);
  return { success: true, mensaje: 'Base creada', id };
}

function actualizarBase(params) {
  let data;
  try { data = JSON.parse(params.data); } catch { return { success: false, mensaje: 'JSON inválido' }; }

  const sheet = getSheet(SHEETS.BASES);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const nombreCol = headers.indexOf('nombre');

  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][nombreCol]) === String(data.nombre)) {
      headers.forEach((h, j) => {
        if (data[h] !== undefined) sheet.getRange(i + 1, j + 1).setValue(data[h]);
      });
      return { success: true, mensaje: 'Base actualizada' };
    }
  }

  return { success: false, mensaje: 'Base no encontrada' };
}

// ── SOLICITUDES ───────────────────────────────────────────────
function getSolicitudes(params) {
  const { clave, base } = params;
  const sheet = getSheet(SHEETS.SOLICITUDES);
  let solicitudes = sheetToObjects(sheet);

  const bases = parseBases(base);
  if (clave && bases.length) {
    solicitudes = solicitudes.filter(s => s.clave === clave || bases.includes(s.base));
  } else if (clave) {
    solicitudes = solicitudes.filter(s => s.clave === clave);
  } else if (bases.length) {
    solicitudes = solicitudes.filter(s => bases.includes(s.base));
  }

  // Most recent first by fecha_inicio
  solicitudes.sort((a, b) => (b.fecha_inicio || b.fecha || '').localeCompare(a.fecha_inicio || a.fecha || ''));

  return { success: true, solicitudes };
}

function crearSolicitud(params) {
  let data;
  try { data = JSON.parse(params.data); } catch { return { success: false, mensaje: 'JSON inválido' }; }

  const { clave, nombre, base, tipo, fecha_inicio, fecha_fin, dias, comentario } = data;
  if (!clave || !tipo || !fecha_inicio) return { success: false, mensaje: 'Campos incompletos' };

  const sheet = getSheet(SHEETS.SOLICITUDES);
  const inicio = new Date(fecha_inicio);
  const fin = fecha_fin ? new Date(fecha_fin) : inicio;
  const numDias = dias || 1;

  // Validaciones por tipo
  if (tipo === 'vacaciones') {
    if (numDias > 6) return { success: false, mensaje: 'Vacaciones no pueden exceder 6 días consecutivos' };

    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    const anticipacion = Math.ceil((inicio - hoy) / (1000 * 60 * 60 * 24));
    let reqAnticipacion;
    if (numDias === 6) reqAnticipacion = 30;
    else if (numDias >= 4) reqAnticipacion = 14;
    else reqAnticipacion = 7;
    if (anticipacion < reqAnticipacion) return { success: false, mensaje: `Vacaciones requieren ${reqAnticipacion} días de anticipación` };

    const allSolicitudes = sheetToObjects(sheet);
    const baseVacaciones = allSolicitudes.filter(s => 
      s.base === base && s.tipo === 'vacaciones' && s.estatus === 'Aprobado' && s.clave !== clave
    );

    for (const v of baseVacaciones) {
      const vFin = new Date(v.fecha_fin || v.fecha_inicio || v.fecha);
      const vInicio = new Date(v.fecha_inicio || v.fecha);

      const minStart = new Date(vFin);
      minStart.setDate(minStart.getDate() + 1);
      const maxStart = new Date(vFin);
      maxStart.setDate(maxStart.getDate() + 14);
      if (inicio >= minStart && inicio <= maxStart) {
        return { success: false, mensaje: 'Vacaciones no pueden ser consecutivas con otro colaborador de la misma base (margen de 14 días)' };
      }

      const minExisting = new Date(fin);
      minExisting.setDate(minExisting.getDate() + 1);
      const maxExisting = new Date(fin);
      maxExisting.setDate(maxExisting.getDate() + 14);
      if (vInicio >= minExisting && vInicio <= maxExisting) {
        return { success: false, mensaje: 'Vacaciones no pueden ser consecutivas con otro colaborador de la misma base (margen de 14 días)' };
      }
    }

    const concurrentBase = baseVacaciones.filter(v => {
      const vInicio = new Date(v.fecha_inicio || v.fecha);
      const vFin = new Date(v.fecha_fin || v.fecha_inicio || v.fecha);
      return inicio <= vFin && fin >= vInicio;
    });
    if (concurrentBase.length > 0) {
      return { success: false, mensaje: 'Solo se permite 1 colaborador de la misma base en vacaciones al mismo tiempo' };
    }

    const allVacaciones = allSolicitudes.filter(s => 
      s.tipo === 'vacaciones' && s.estatus === 'Aprobado' && s.base !== base
    );
    const concurrentOther = allVacaciones.filter(v => {
      const vInicio = new Date(v.fecha_inicio || v.fecha);
      const vFin = new Date(v.fecha_fin || v.fecha_inicio || v.fecha);
      return inicio <= vFin && fin >= vInicio;
    });
    if (concurrentOther.length > 2) {
      return { success: false, mensaje: 'Máximo 3 colaboradores de diferentes bases en vacaciones al mismo tiempo' };
    }
  } else if (tipo === 'dias_personales') {
    if (numDias > 1) return { success: false, mensaje: 'Días económicos son individuales' };

    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    const anticipacion = Math.ceil((inicio - hoy) / (1000 * 60 * 60 * 24));
    if (anticipacion < 7) return { success: false, mensaje: 'Días económicos requieren 7 días de anticipación' };

    const mes = inicio.getMonth() + 1;
    const año = inicio.getFullYear();
    const existing = sheetToObjects(sheet).filter(s => s.clave === clave && s.estatus !== 'Rechazado');
    const diasEconomicosMes = existing.filter(s => 
      s.tipo === 'dias_personales' && 
      new Date(s.fecha_inicio || s.fecha).getMonth() + 1 === mes &&
      new Date(s.fecha_inicio || s.fecha).getFullYear() === año
    );
    if (diasEconomicosMes.length >= 1) return { success: false, mensaje: 'Solo se permite 1 día económico por mes' };
  } else if (['cumpleaños', 'aniversario'].includes(tipo)) {
    if (numDias > 1) return { success: false, mensaje: 'Cumpleaños/aniversario son para un día' };

    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    const anticipacion = Math.ceil((inicio - hoy) / (1000 * 60 * 60 * 24));
    if (anticipacion < 7) return { success: false, mensaje: 'Cumpleaños/aniversario requieren 7 días de anticipación' };
  }

  const existing = sheetToObjects(sheet)
    .filter(s => s.clave === clave && s.estatus !== 'Rechazado');

  for (const s of existing) {
    const sInicio = new Date(s.fecha_inicio || s.fecha);
    const sFin = new Date(s.fecha_fin || s.fecha);
    if (inicio <= sFin && fin >= sInicio) {
      if (
        (tipo === 'dias_personales' && ['vacaciones', 'cumpleaños', 'aniversario'].includes(s.tipo)) ||
        (tipo === 'vacaciones' && ['dias_personales', 'cumpleaños', 'aniversario'].includes(s.tipo)) ||
        (['cumpleaños', 'aniversario'].includes(tipo) && ['dias_personales', 'vacaciones'].includes(s.tipo))
      ) {
        return { success: false, mensaje: 'Conflicto con solicitud existente en el mismo período' };
      }
    }
  }

  const id = generateId();
  const ts = new Date().toISOString();
  sheet.appendRow([id, clave, nombre, base, tipo, fecha_inicio, fecha_fin || '', numDias, 'Pendiente', comentario || '', ts]);

  return { success: true, mensaje: 'Solicitud creada', id };
}

function resolverSolicitud(params) {
  const { id, estatus, comentario } = params;
  if (!['Aprobado', 'Rechazado'].includes(estatus)) {
    return { success: false, mensaje: 'Estatus inválido' };
  }

  const sheet = getSheet(SHEETS.SOLICITUDES);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const idCol = headers.indexOf('id');
  const estatusCol = headers.indexOf('estatus');
  const comentarioCol = headers.indexOf('comentario');

  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][idCol]) === String(id)) {
      sheet.getRange(i + 1, estatusCol + 1).setValue(estatus);
      if (comentario && comentarioCol >= 0) {
        sheet.getRange(i + 1, comentarioCol + 1).setValue(comentario);
      }
      return { success: true, mensaje: `Solicitud ${estatus.toLowerCase()}` };
    }
  }

  return { success: false, mensaje: 'Solicitud no encontrada' };
}

// ── INDICADORES ───────────────────────────────────────────────
function getIndicadores(params) {
  const usuariosSheet = getSheet(SHEETS.USUARIOS);
  const turnosSheet = getSheet(SHEETS.TURNOS);
  const solicitudesSheet = getSheet(SHEETS.SOLICITUDES);
  const basesSheet = getSheet(SHEETS.BASES);

  const usuarios = sheetToObjects(usuariosSheet);
  const tecnicos = usuarios.filter(u => u.rol === 'tecnico' && u.activo !== '0');

  const bases = sheetToObjects(basesSheet).filter(b => b.activo !== '0');

  // Get this week's turnos
  const now = new Date();
  const day = now.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const turnos = sheetToObjects(turnosSheet).filter(t => {
    const d = new Date(t.fecha + 'T00:00:00');
    return d >= monday && d <= sunday;
  });

  const horasTotal = turnos.filter(t => t.turno !== 'R').length * 8;

  const solicitudes = sheetToObjects(solicitudesSheet)
    .filter(s => s.estatus === 'Pendiente');

  const totalPossible = tecnicos.length * 7;
  const cobertura = totalPossible > 0
    ? Math.round(turnos.filter(t => t.turno !== 'R').length / totalPossible * 100)
    : 0;

  const turnosM = turnos.filter(t => t.turno === 'M').length;
  const turnosT = turnos.filter(t => t.turno === 'T').length;
  const turnosN = turnos.filter(t => t.turno === 'N').length;
  const turnosR = turnos.filter(t => t.turno === 'R').length;

  return {
    success: true,
    indicadores: {
      tecnicos: tecnicos.length,
      horas: horasTotal,
      bases: bases.length,
      cobertura,
      solicitudes: solicitudes.length,
      turnosM: totalPossible > 0 ? Math.round(turnosM/totalPossible*100) : 0,
      turnosT: totalPossible > 0 ? Math.round(turnosT/totalPossible*100) : 0,
      turnosN: totalPossible > 0 ? Math.round(turnosN/totalPossible*100) : 0,
      turnosR: totalPossible > 0 ? Math.round(turnosR/totalPossible*100) : 0,
    }
  };
}

// ── SETUP HELPER (run once to create sheet structure) ──────────
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  function ensureSheet(name, headers) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    return sheet;
  }

  function ensureHeader(sheet, header) {
    if (!sheet) return;
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
    if (!headers.includes(header)) {
      sheet.getRange(1, headers.length + 1).setValue(header).setFontWeight('bold');
    }
  }

  ensureSheet(SHEETS.USUARIOS, ['clave', 'nombre', 'rol', 'base', 'password', 'activo']);
  ensureSheet(SHEETS.TURNOS, ['base', 'tecnico', 'fecha', 'turno']);
  ensureSheet(SHEETS.SOLICITUDES, ['id', 'clave', 'nombre', 'base', 'tipo', 'fecha', 'estatus', 'comentario', 'timestamp']);
  ensureSheet(SHEETS.BASES, ['id', 'nombre', 'tipo', 'direccion', 'activo', 'tecnicos']);
  ensureHeader(ss.getSheetByName(SHEETS.BASES), 'horarios');
  ensureHeader(ss.getSheetByName(SHEETS.BASES), 'horarios');

  // Seed default jefe user if none exists
  const usuariosSheet = ss.getSheetByName(SHEETS.USUARIOS);
  const data = usuariosSheet.getDataRange().getValues();
  if (data.length < 2) {
    usuariosSheet.appendRow(['JEFE001', 'Carlos Ramírez', 'jefe', '', 'admin123', '1']);
    usuariosSheet.appendRow(['COORD001', 'María Gómez', 'coordinador', 'Centro Técnico Norte', 'coord123', '1']);
    usuariosSheet.appendRow(['TEC001', 'Juan Pérez', 'tecnico', 'Centro Técnico Norte', 'tec123', '1']);
  }

  SpreadsheetApp.getUi().alert('✅ Hojas creadas correctamente.\n\nUsuarios de prueba:\n• JEFE001 / admin123\n• COORD001 / coord123\n• TEC001 / tec123');
}

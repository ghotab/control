// api.js — All API calls to Google Apps Script backend

const API = (() => {
  const BASE_URL_AUTH = 'https://script.google.com/macros/s/AKfycbzt059aIGqjtv5s5oIDksB2LliIwtl9HqWfz-XF5M13e1XYStSfdQQ-xjpGbdlrW6s5/exec'; // Login & Usuarios
  const BASE_URL = 'https://script.google.com/macros/s/AKfycbxBIHaRx6_Blmj_JRqfyGLfNAHakDrt2bzvGlm9Wv97EtCzGmPXilzD7BbDjJYxsmQFYA/exec'; // Turnos, Bases, Solicitudes
  const CACHE_KEY = 'turnos_cache';
  const CACHE_TTL = 5 * 60 * 1000; // 5 min

  // ── Cache helpers ──────────────────────────────────────
  function getCache(key) {
    try {
      const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      const entry = raw[key];
      if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
    } catch { }
    return null;
  }

  function setCache(key, data) {
    try {
      const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      raw[key] = { data, ts: Date.now() };
      localStorage.setItem(CACHE_KEY, JSON.stringify(raw));
    } catch { }
  }

  function clearCache(prefix) {
    try {
      const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      Object.keys(raw).forEach(k => { if (!prefix || k.startsWith(prefix)) delete raw[k]; });
      localStorage.setItem(CACHE_KEY, JSON.stringify(raw));
    } catch { }
  }

  // ── Core fetch ─────────────────────────────────────────
  async function call(params, options = {}) {
    const baseUrl = options.useAuth ? BASE_URL_AUTH : BASE_URL;
    const isPost = options.method === 'POST';
    const qs = isPost ? '' : new URLSearchParams(params).toString();
    const url = isPost ? baseUrl : `${baseUrl}?${qs}`;

    const cacheKey = options.cacheKey || null;
    if (cacheKey && !options.forceRefresh && !isPost) {
      const cached = getCache(cacheKey);
      if (cached) return cached;
    }

    const fetchOptions = isPost ? {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(params)
    } : {};

    const res = await fetch(url, fetchOptions);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (cacheKey && data.success !== false) {
      setCache(cacheKey, data);
    }

    return data;
  }

  // ── Auth ──────────────────────────────────────────────
  async function login(clave, password) {
    return call({ accion: 'login', clave, password }, { useAuth: true });
  }

  // ── Turnos ────────────────────────────────────────────
  async function getTurnos(base, semana, force = false) {
    const session = Auth.getSession();
    const params = { accion: 'getTurnos', semana };
    if (session.rol !== 'jefe') {
      if (session.base) params.base = session.base;
      else return { success: true, turnos: [] };
    } else if (base) params.base = base;

    return call(params, { cacheKey: `turnos_${base}_${semana}`, forceRefresh: force });
  }

  async function guardarTurnos(turnos) {
    clearCache('turnos_');
    return call({ accion: 'guardarTurnos', data: JSON.stringify(turnos) });
  }

  // ── Usuarios ──────────────────────────────────────────
  async function getUsuarios(force = false) {
    return call({ accion: 'getUsuarios' }, { cacheKey: 'usuarios', forceRefresh: force, useAuth: true });
  }

  async function crearUsuario(usuario) {
    clearCache('usuarios');
    return call({ accion: 'crearUsuario', data: JSON.stringify(usuario) }, { useAuth: true });
  }

  async function actualizarUsuario(usuario) {
    clearCache('usuarios');
    return call({ accion: 'actualizarUsuario', data: JSON.stringify(usuario) }, { useAuth: true });
  }

  async function cambiarEstatusUsuario(clave, activo) {
    clearCache('usuarios');
    return call({ accion: 'cambiarEstatusUsuario', clave, activo: activo ? '1' : '0' }, { useAuth: true });
  }

  // ── Bases ─────────────────────────────────────────────
  async function getBases(force = false) {
    return call({ accion: 'getBases' }, { cacheKey: 'bases', forceRefresh: force });
  }

  async function crearBase(base) {
    clearCache('bases');
    return call({ accion: 'crearBase', data: JSON.stringify(base) });
  }

  async function actualizarBase(base) {
    clearCache('bases');
    return call({ accion: 'actualizarBase', data: JSON.stringify(base) });
  }

  // ── Solicitudes ───────────────────────────────────────
  async function getSolicitudes(force = false) {
    const session = Auth.getSession();
    const params = { accion: 'getSolicitudes' };
    if (session.rol === 'tecnico' || session.rol === 'auxiliar') {
      params.clave = session.clave;
    } else if (session.rol === 'coordinador') {
      params.clave = session.clave;
      if (session.base) params.base = session.base;
    }

    return call(params, { forceRefresh: force });
  }

  async function crearSolicitud(solicitud) {
    clearCache('solicitudes_');
    return call({ accion: 'crearSolicitud', data: JSON.stringify(solicitud) });
  }

  async function resolverSolicitud(id, estatus, comentario = '') {
    const session = Auth.getSession();
    clearCache('solicitudes_');
    return call({ accion: 'resolverSolicitud', id, estatus, comentario, clave: session?.clave || '', rol: session?.rol || '' });
  }

  // ── Indicadores ───────────────────────────────────────
  async function getIndicadores() {
    return call({ accion: 'getIndicadores' }, { cacheKey: 'indicadores' });
  }

  // ── Asistencias ───────────────────────────────────────
  async function subirAsistencia(imageBase64, fecha) {
    const session = Auth.getSession();
    return call({
      accion: 'subirAsistencia',
      clave: session.clave,
      nombre: session.nombre,
      base: session.base,
      fecha,
      imageBase64
    }, { method: 'POST' });
  }

  async function getAsistencias(fecha, force = false) {
    const session = Auth.getSession();
    const params = { accion: 'getAsistencias', fecha };
    if (session.rol !== 'jefe') {
      if (session.base) params.base = session.base;
    }
    return call(params, { cacheKey: `asistencias_${fecha}_${session.base || 'all'}`, forceRefresh: force });
  }

  async function conciliarAsistencia(id, estatus) {
    const session = Auth.getSession();
    clearCache('asistencias_');
    return call({ accion: 'conciliarAsistencia', id, estatus, rol: session.rol });
  }

  return {
    login, getTurnos, guardarTurnos,
    getUsuarios, crearUsuario, actualizarUsuario, cambiarEstatusUsuario,
    getBases, crearBase, actualizarBase,
    getSolicitudes, crearSolicitud, resolverSolicitud,
    getIndicadores, clearCache,
    subirAsistencia, getAsistencias, conciliarAsistencia
  };
})();

window.API = API;

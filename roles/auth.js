// auth.js — Session management and access control

const Auth = (() => {
  const SESSION_KEY = 'gt_session';

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function setSession(data) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('turnos_cache');
  }

  function logout() {
    clearSession();
    window.location.href = 'login.html';
  }

  function requireAuth() {
    const session = getSession();
    if (!session) {
      window.location.href = 'login.html';
      return null;
    }
    return session;
  }

  function hasRole(...roles) {
    const s = getSession();
    return s && roles.includes(s.rol);
  }

  function isJefe() { return hasRole('jefe'); }
  function isCoordinador() { return hasRole('coordinador', 'jefe'); }
  function isTecnico() { return hasRole('tecnico'); }

  function parseBases(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(String).map(v => v.trim()).filter(Boolean);
    return String(value).split(/[,;|]+/).map(v => v.trim()).filter(Boolean);
  }

  // Check if user can see a given base
  function canViewBase(base) {
    const s = getSession();
    if (!s) return false;
    if (s.rol === 'jefe') return true;
    const bases = parseBases(s.base);
    return bases.includes(base);
  }

  // Enforce base restriction: returns filtered list
  function filterByBase(items, baseKey = 'base') {
    const s = getSession();
    if (!s || s.rol === 'jefe') return items;
    const bases = parseBases(s.base);
    if (!bases.length) return [];
    return items.filter(i => bases.includes(i[baseKey]));
  }

  return {
    getSession, setSession, clearSession,
    logout, requireAuth,
    hasRole, isJefe, isCoordinador, isTecnico,
    canViewBase, filterByBase
  };
})();

window.Auth = Auth;

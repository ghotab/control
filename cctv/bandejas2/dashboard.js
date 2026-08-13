const state = {
  recent: [],
  alerts: [],
  history: [],
  inventory: [],
  user: null,
  flota: []
};

const sections = document.querySelectorAll('.section');
const navButtons = document.querySelectorAll('.nav-btn');
const globalSearch = document.getElementById('globalSearch');
const toast = document.getElementById('toast');
const recentList = document.getElementById('recentList');
const priorityList = document.getElementById('priorityList');
const historyTable = document.getElementById('historyTable');
const alertsTable = document.getElementById('alertsTable');

function setActiveSection(name) {
  sections.forEach((section) => section.classList.toggle('active', section.id === name));
  navButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.section === name));
}

navButtons.forEach((btn) => {
  btn.addEventListener('click', () => setActiveSection(btn.dataset.section));
});

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

async function getDb() {
  if (window.db) return window.db;

  if (window.supabase && typeof window.supabase.createClient === 'function') {
    const db = window.supabase.createClient(
      'https://zygisljwmxoqdplsuzjw.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5Z2lzbGp3bXhvcWRwbHN1emp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4NTE0OTYsImV4cCI6MjA5ODQyNzQ5Nn0.XeHFgDPGN5t0-6Fo1asEXD_XjGRK_N4Jiz706A3u6yg'
    );
    window.db = db;
    return db;
  }

  throw new Error('Supabase no está disponible');
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function formatDate(dateString) {
  if (!dateString) return 'Sin fecha';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function computeRiskLevel(days, hasDisco) {
  if (!hasDisco) return { key: 'danger', label: 'Sin disco', badge: 'danger', score: 100, days: 0 };
  if (days >= 11) return { key: 'danger', label: 'Crítico', badge: 'danger', score: 90, days };
  if (days >= 5) return { key: 'warn', label: 'Alerta', badge: 'warn', score: 65, days };
  return { key: 'ok', label: 'Seguro', badge: 'ok', score: 25, days };
}

function buildAlerts(history, flota) {
  const flotaMap = new Map((flota || []).map((item) => [String(item.autobus), item]));
  const latestByEco = new Map();

  (history || []).forEach((row) => {
    const eco = normalizeText(row.numero_economico);
    if (!eco) return;
    const current = latestByEco.get(eco);
    if (!current || new Date(row.fecha_hora) > new Date(current.fecha_hora)) {
      latestByEco.set(eco, row);
    }
  });

  const alerts = [];
  latestByEco.forEach((row, eco) => {
    const latestDate = row.fecha_hora ? new Date(row.fecha_hora) : null;
    const days = latestDate ? Math.max(0, Math.floor((Date.now() - latestDate.getTime()) / 86400000)) : 0;
    const base = normalizeText(row.base) || normalizeText(flotaMap.get(eco)?.base) || 'N/D';
    const hasDisco = !!normalizeText(row.bandeja_sube);
    const risk = computeRiskLevel(days, hasDisco);
    alerts.push({
      eco,
      base,
      dias: risk.days,
      riesgo: risk.label,
      motivo: hasDisco ? (days >= 11 ? 'Límite excedido' : 'Próximo a límite') : 'Sin disco',
      estado: risk.badge,
      score: risk.score
    });
  });

  return alerts.sort((a, b) => {
    if (a.estado === 'danger' && b.estado !== 'danger') return -1;
    if (a.estado !== 'danger' && b.estado === 'danger') return 1;
    return b.dias - a.dias;
  }).slice(0, 6);
}

async function loadDashboardData() {
  try {
    const db = await getDb();

    const [recentRes, historyRes, flotaRes] = await Promise.all([
      db.from('tbl_cambiobandeja').select('numero_economico, base, bandeja_sube, bandeja_baja, fecha_hora, clave_colaborador').order('fecha_hora', { ascending: false }).limit(6),
      db.from('tbl_cambiobandeja').select('numero_economico, base, bandeja_sube, bandeja_baja, fecha_hora, clave_colaborador').order('fecha_hora', { ascending: false }).limit(20),
      db.from('tbl_flota').select('autobus, base, estatus').limit(200)
    ]);

    if (recentRes.error) throw recentRes.error;
    if (historyRes.error) throw historyRes.error;
    if (flotaRes.error) throw flotaRes.error;

    state.history = historyRes.data || [];
    state.recent = (recentRes.data || []).map((row) => ({
      eco: normalizeText(row.numero_economico),
      base: normalizeText(row.base),
      bandejaSube: normalizeText(row.bandeja_sube),
      bandejaBaja: normalizeText(row.bandeja_baja),
      fecha: formatDate(row.fecha_hora),
      estado: normalizeText(row.bandeja_baja) ? 'OK' : 'WARN'
    }));

    state.flota = flotaRes.data || [];
    state.alerts = buildAlerts(state.history, state.flota);

    renderOverview();
    renderHistory();
    renderAlerts();
    renderStats();
    showToast('Datos actualizados');
  } catch (error) {
    console.error('Dashboard data load failed:', error);
    renderOverview([], 'Sin conexión a la base de datos');
    renderHistory([], 'No se pudo consultar la información');
    renderAlerts([], 'No se pudo consultar la información');
     
    document.getElementById('kpiToday').textContent = '0';
    document.getElementById('kpiCritical').textContent = '0';
    document.getElementById('kpiInventory').textContent = '0';
    document.getElementById('kpiReviewed').textContent = '0';

    showToast('No se pudo cargar la información');
  }
}

function renderStats() {
  const criticalCount = state.alerts.filter((item) => item.estado === 'danger').length;
  const totalMovements = state.recent.length;
  const inventoryCount = state.history.length > 0 ? Math.max(1, Math.min(99, state.history.length)) : 0;

  document.getElementById('kpiToday').textContent = String(totalMovements);
  document.getElementById('kpiCritical').textContent = String(criticalCount);
  document.getElementById('kpiInventory').textContent = String(inventoryCount);
  document.getElementById('kpiReviewed').textContent = String(Math.max(10, state.history.length));
}

function renderOverview(filter = '') {
  const data = (state.recent || []).filter((item) => {
    if (!filter) return true;
    return [String(item.eco), item.base, item.bandejaSube, item.bandejaBaja].join(' ').toLowerCase().includes(filter);
  });

  recentList.innerHTML = data.length
    ? data.map((item) => {
        const badgeClass = item.estado === 'OK' ? 'ok' : 'warn';
        const label = item.estado === 'OK' ? 'OK' : 'Aviso';
        return `
          <li class="activity-item">
            <div class="activity-main">
              <div class="activity-key">Eco ${item.eco} · ${item.base}</div>
              <div class="muted">${item.bandejaSube || '—'} → ${item.bandejaBaja || '—'}</div>
              <div class="muted">${item.fecha}</div>
            </div>
            <span class="status-badge ${badgeClass}">${label}</span>
          </li>
        `;
      }).join('')
    : '<li class="activity-item"><div class="activity-main"><div class="activity-key">Sin resultados</div><div class="muted">No hay movimientos para esta búsqueda.</div></div></li>';

  const alerts = (state.alerts || []).filter((item) => {
    if (!filter) return true;
    return [String(item.eco), item.base, item.riesgo, item.motivo].join(' ').toLowerCase().includes(filter);
  });

  priorityList.innerHTML = alerts.length
    ? alerts.map((item) => `
      <li class="alert-item">
        <div class="alert-main">
          <div class="alert-key">Eco ${item.eco} · ${item.base}</div>
          <div class="muted">${item.motivo}</div>
          <div class="score-bar"><div class="score-fill" style="width:${item.score}%"></div></div>
        </div>
        <span class="risk-tag">${item.riesgo}</span>
        <span class="status-badge ${item.estado === 'danger' ? 'danger' : item.estado === 'warn' ? 'warn' : 'neutral'}">${item.dias}d</span>
      </li>
    `).join('')
    : '<li class="alert-item"><div class="alert-main"><div class="alert-key">Sin alertas</div><div class="muted">Sin coincidencias para el término actual.</div></div></li>';

  const count = alerts.length || 0;
  document.getElementById('navAlertsCount').textContent = String(count);
}

function renderHistory(filter = '') {
  const items = (state.history || []).filter((item) => {
    if (!filter) return true;
    return [
      normalizeText(item.base),
      normalizeText(item.numero_economico),
      normalizeText(item.bandeja_sube),
      normalizeText(item.bandeja_baja),
      normalizeText(item.clave_colaborador)
    ].join(' ').toLowerCase().includes(filter);
  }).slice(0, 10);

  historyTable.innerHTML = items.length
    ? items.map((item) => {
        const eco = normalizeText(item.numero_economico);
        const base = normalizeText(item.base);
        const estado = normalizeText(item.bandeja_baja) ? 'OK' : 'WARN';
        const badge = estado === 'OK' ? 'ok' : 'warn';
        return `
          <tr>
            <td class="mono">${formatDate(item.fecha_hora)}</td>
            <td>${base || 'N/D'}</td>
            <td class="mono">${eco || '—'}</td>
            <td class="mono">${normalizeText(item.bandeja_sube) || '—'}</td>
            <td class="mono">${normalizeText(item.bandeja_baja) || '—'}</td>
            <td class="mono">${normalizeText(item.clave_colaborador) || '—'}</td>
            <td><span class="status-badge ${badge}">${estado === 'OK' ? 'OK' : 'Aviso'}</span></td>
          </tr>
        `;
      }).join('')
    : '<tr><td colspan="7" style="text-align:center; color: var(--text-soft); padding: 18px;">Sin registros para la búsqueda.</td></tr>';
}

function renderAlerts(filter = '') {
  const items = (state.alerts || []).filter((item) => {
    if (!filter) return true;
    return [String(item.eco), item.base, item.riesgo, item.motivo].join(' ').toLowerCase().includes(filter);
  });

  alertsTable.innerHTML = items.length
    ? items.map((item) => `
      <tr>
        <td class="mono">${item.eco}</td>
        <td>${item.base}</td>
        <td>${item.riesgo}</td>
        <td class="mono">${item.dias}</td>
        <td>${item.motivo}</td>
        <td><span class="status-badge ${item.estado === 'danger' ? 'danger' : item.estado === 'warn' ? 'warn' : 'neutral'}">${item.riesgo}</span></td>
      </tr>
    `).join('')
    : '<tr><td colspan="6" style="text-align:center; color: var(--text-soft); padding: 18px;">Sin alertas para la búsqueda.</td></tr>';
}

function syncDashboardTables() {
  const q = globalSearch.value.trim().toLowerCase();
  renderOverview(q);
  renderHistory(q);
  renderAlerts(q);
}

globalSearch.addEventListener('input', syncDashboardTables);

document.getElementById('logoutBtn').addEventListener('click', async () => {
  if (window.supabaseAuth && window.supabaseAuth.signOut) {
    await window.supabaseAuth.signOut();
  } else {
    window.location.href = 'login.html';
  }
});

async function loadUser() {
  try {
    if (window.supabaseAuth && window.supabaseAuth.getProfile) {
      const profile = await window.supabaseAuth.getProfile();
      if (profile) {
        const nombre = profile.nombre || profile.clave_colaborador || 'Operador';
        const base = profile.base || 'Base';
        document.getElementById('userName').textContent = nombre;
        document.getElementById('userAvatar').textContent = nombre.charAt(0).toUpperCase();
        localStorage.setItem('base', base);
      }
    }
  } catch (error) {
    console.warn('User profile unavailable:', error);
  }
}

async function saveCapture() {
  const form = document.getElementById('captureForm');
  const formData = new FormData(form);

  const payload = {
    base: normalizeText(formData.get('base') || document.getElementById('base').value),
    clave_colaborador: normalizeText(formData.get('tecnico') || document.getElementById('tecnico').value),
    numero_economico: normalizeText(formData.get('numero_economico') || document.getElementById('numero_economico').value),
    bandeja_sube: normalizeText(formData.get('bandeja_sube') || document.getElementById('bandeja_sube').value),
    bandeja_baja: normalizeText(formData.get('bandeja_baja') || document.getElementById('bandeja_baja').value),
    led_status: normalizeText(formData.get('led_status') || document.getElementById('led_status').value),
    formateado: (formData.get('formateado') || document.getElementById('formateado').value) === 'true',
    motivo_formateo: normalizeText(formData.get('motivo_formateo') || document.getElementById('motivo_formateo').value) || 'N/A',
    justificacion_discrepancia: normalizeText(formData.get('justificacion_discrepancia') || document.getElementById('justificacion_discrepancia').value) || null
  };

  if (!payload.base || !payload.clave_colaborador || !payload.numero_economico || !payload.bandeja_sube) {
    showToast('Faltan campos obligatorios');
    return;
  }

  try {
    const db = await getDb();
    const { error } = await db.from('tbl_cambiobandeja').insert(payload);
    if (error) throw error;

    form.reset();
    showToast('Cambio registrado');
    await loadDashboardData();
  } catch (error) {
    console.error('Error saving change:', error);
    showToast('Error al guardar');
  }
}

async function saveInventory() {
  const base = document.getElementById('inventoryBase').value;
  const sitio = document.getElementById('inventorySiteSelect').value;
  const codes = document.getElementById('inventoryCodes').value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!base || codes.length === 0) {
    showToast('Completa base y bandejas');
    return;
  }

  try {
    const db = await getDb();
    const tecnico = normalizeText(document.getElementById('tecnico')?.value || localStorage.getItem('tecnico') || '');
    const payload = {
      base,
      tecnico,
      sitio,
      lista_bandejas: codes,
      fecha: new Date().toISOString()
    };

    const { error } = await db.from('tbl_inventario').insert(payload);
    if (error) {
      if (error.message && error.message.toLowerCase().includes('does not exist')) {
        showToast('Inventario no disponible');
        return;
      }
      throw error;
    }
    showToast('Inventario guardado');
  } catch (error) {
    console.error('Inventory save failed:', error);
    showToast('Inventario no guardado');
  }
}

async function initializeDashboard() {
  await loadUser();
  await loadDashboardData();

  if (window.supabaseAuth && window.supabaseAuth.requireAuth) {
    try {
      await window.supabaseAuth.requireAuth();
    } catch (error) {
      console.error('Forced auth failed:', error);
    }
  }
}

document.getElementById('captureForm').addEventListener('submit', (event) => {
  event.preventDefault();
  saveCapture();
});

document.getElementById('inventorySaveBtn').addEventListener('click', () => {
  saveInventory();
});

document.getElementById('inventorySampleBtn').addEventListener('click', () => {
  document.getElementById('inventoryCodes').value = 'B-001, B-002, B-003, B-004';
  document.getElementById('inventorySiteSelect').value = 'OFICINA-OPERATIVO';
  showToast('Ejemplo cargado');
});

initializeDashboard();

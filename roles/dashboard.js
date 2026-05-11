// dashboard.js — Main SPA router and module renderer

const Dashboard = (() => {
  let session = null;
  let weekOffset = 0;
  let currentDates = [];
  let currentView = 'dashboard';

  // ── Init ──────────────────────────────────────────────
  function init() {
    session = Auth.requireAuth();
    if (!session) return;

    buildLayout();
    setupNavigation();
    setupWeekNav();

    // Check URL for initial view
    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get('view') || 'dashboard';

    navigate(view === 'admin' ? 'dashboard' : view);
    UI.hideLoader();
  }

  // ── Layout ────────────────────────────────────────────
  function buildLayout() {
    document.getElementById('user-name').textContent = session.nombre;
    document.getElementById('user-role').textContent = capitalize(session.rol);

    const av = document.getElementById('user-avatar');
    av.className = `user-avatar avatar-${session.rol}`;
    av.textContent = getInitials(session.nombre);

    // Build nav based on role
    const nav = document.getElementById('sidebar-nav');
    nav.innerHTML = buildNav();
  }

  function buildNav() {
    const isJefe = session.rol === 'jefe';
    const isCoord = session.rol === 'coordinador';
    const isTech = session.rol === 'tecnico';

    let html = '';

    html += `<div class="nav-section-label">Principal</div>`;
    html += navItem('dashboard', '📊', 'Dashboard');

    if (isTech) {
      html += navItem('mis-turnos', '📅', 'Mis turnos');
      html += navItem('mi-horario', '🕐', 'Mi horario semanal');
      html += navItem('mis-centros', '🏢', 'Mis centros');
      html += navItem('solicitudes', '📩', 'Mis solicitudes');
    }

    if (isCoord) {
      html += navItem('planeacion', '📅', 'Planeación de turnos');
      html += navItem('calendario', '📆', 'Calendario semanal');
      html += navItem('tecnicos', '👥', 'Técnicos a mi cargo');
      html += navItem('centros', '🏢', 'Centros de trabajo');
      html += navItem('solicitudes', '📩', 'Solicitudes');
      html += navItem('reportes', '📈', 'Reportes');
    }

    if (isJefe) {
      html += `<div class="nav-section-label" style="margin-top:8px">Gestión</div>`;
      html += navItem('usuarios', '👤', 'Usuarios y roles');
      html += navItem('centros', '🏢', 'Centros de trabajo');
      html += navItem('planeacion', '📅', 'Planeación de turnos');
      html += navItem('calendario-global', '🌐', 'Calendario global');
      html += `<div class="nav-section-label" style="margin-top:8px">Análisis</div>`;
      html += navItem('reportes', '📈', 'Reportes y métricas');
      html += navItem('config', '⚙️', 'Configuración');
    }

    html += `<div class="nav-section-label" style="margin-top:8px">Ayuda</div>`;
    html += navItem('ayuda', '❓', 'Ayuda');

    return html;
  }

  function navItem(view, icon, label) {
    return `<button class="nav-item" data-view="${view}" onclick="Dashboard.navigate('${view}')">
      <span class="nav-icon">${icon}</span>${label}
    </button>`;
  }

  // ── Navigation ────────────────────────────────────────
  function navigate(view) {
    currentView = view;

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.view === view);
    });

    // Render view
    const content = document.getElementById('main-content');
    content.innerHTML = `<div class="page-content" id="page-content"><div class="empty-state"><div class="loader-ring"></div><p>Cargando...</p></div></div>`;

    switch (view) {
      case 'dashboard': renderDashboard(); break;
      case 'planeacion': renderPlaneacion(); break;
      case 'calendario':
      case 'calendario-global': renderCalendario(); break;
      case 'mis-turnos': renderMisTurnos(); break;
      case 'mi-horario': renderMiHorario(); break;
      case 'mis-centros': renderMisCentros(); break;
      case 'solicitudes': renderSolicitudes(); break;
      case 'tecnicos': renderTecnicos(); break;
      case 'usuarios': renderUsuarios(); break;
      case 'centros': renderCentros(); break;
      case 'reportes': renderReportes(); break;
      default: renderDashboard();
    }

    // Close mobile sidebar
    const sb = document.getElementById('sidebar');
    if (window.innerWidth <= 768) sb.classList.remove('open');
  }

  // ── Week Navigation ───────────────────────────────────
  function setupWeekNav() {
    updateWeekDisplay();
    document.getElementById('week-prev').onclick = () => { weekOffset--; updateWeekDisplay(); refreshCalendar(); };
    document.getElementById('week-next').onclick = () => { weekOffset++; updateWeekDisplay(); refreshCalendar(); };
  }

  function updateWeekDisplay() {
    currentDates = Calendar.getWeekDates(weekOffset);
    const weekNum = Calendar.getWeekNum(currentDates[0]);
    const start = Calendar.formatDate(currentDates[0]);
    const end = Calendar.formatDate(currentDates[6]);
    document.getElementById('week-num').textContent = `Semana ${weekNum}`;
    document.getElementById('week-dates').textContent = `${start} – ${end}`;
  }

  function refreshCalendar() {
    if (['planeacion', 'calendario', 'calendario-global', 'mi-horario', 'mis-turnos'].includes(currentView)) {
      navigate(currentView);
    }
  }

  function setupNavigation() {
    document.getElementById('menu-toggle').onclick = () => {
      const sb = document.getElementById('sidebar');
      sb.classList.toggle('open');
    };

    document.getElementById('logout-btn').onclick = () => {
      if (confirm('¿Cerrar sesión?')) Auth.logout();
    };
  }

  // ── DASHBOARD VIEW ────────────────────────────────────
  async function renderDashboard() {
    const pc = document.getElementById('page-content');
    if (!pc) return;

    pc.innerHTML = `
      <h1 class="page-title">Hola, ${session.nombre.split(' ')[0]}</h1>
      <p class="page-sub">${capitalize(session.rol)}${session.base ? ' · ' + session.base : ''}</p>
      <div id="kpi-container"><div class="kpi-grid">${[1,2,3,4].map(() => skeletonKpi()).join('')}</div></div>
      <div id="dash-lower"></div>
    `;

    try {
      if (session.rol === 'jefe') {
        await renderJefeDashboard(pc);
      } else if (session.rol === 'coordinador') {
        await renderCoordDashboard(pc);
      } else {
        await renderTechDashboard(pc);
      }
    } catch (e) {
      pc.innerHTML += `<div class="empty-state"><p>Error cargando datos: ${e.message}</p></div>`;
    }
  }

  async function renderTechDashboard(pc) {
    const dates = currentDates;
    let turnos = {};
    let baseInfo = {};

    try {
      const res = await API.getTurnos(session.base, Calendar.getWeekKey(dates));
      if (res.success && res.turnos) {
        res.turnos.forEach(t => {
          turnos[`${String(t.tecnico || '').trim()}_${String(t.fecha || '').trim()}`] = String(t.turno || '').trim().toUpperCase();
        });
      }
    } catch {}

    try {
      const bRes = await API.getBases();
      if (bRes.success && bRes.bases) {
        baseInfo = bRes.bases.find(b => b.nombre === session.base) || {};
      }
    } catch {}

    Calendar.setAvailableShifts(parseShiftDefinitions(baseInfo.horarios));

    const misHoy = Object.entries(turnos)
      .filter(([k]) => k.startsWith(session.clave + '_')).length;

    const proxTurnoEntry = Object.entries(turnos)
      .filter(([k, v]) => k.startsWith(session.clave + '_') && v !== 'R')
      .sort(([a], [b]) => a.localeCompare(b))[0];

    const proxFecha = proxTurnoEntry ? proxTurnoEntry[0].split('_')[1] : null;
    const proxTurno = proxTurnoEntry ? proxTurnoEntry[1] : null;

    const baseType = baseInfo.tipo || '—';
    const proxDateObj = proxFecha ? new Date(proxFecha) : null;
    const proxFechaFmt = proxDateObj && !Number.isNaN(proxDateObj.getTime())
      ? proxDateObj.toLocaleDateString('es-MX', { weekday:'short', day:'numeric', month:'short' })
      : '—';

    document.getElementById('kpi-container').innerHTML = `
      <div class="kpi-grid">
        ${kpiCard('📅', 'blue', misHoy, 'Mis turnos esta semana', 'turnos asignados')}
        ${kpiCard('⏰', 'green', misHoy * 8 + 'h', 'Total horas semana', 'horas programadas')}
        ${kpiCard('🔔', 'amber', proxFechaFmt, 'Próximo turno', proxTurno ? Calendar.getShiftDefinition(proxTurno)?.title || proxTurno : 'Sin asignar')}
        ${kpiCard('🏢', 'purple', session.base || '—', 'Centro de trabajo', baseType)}
      </div>`;

    const baseAddress = baseInfo.direccion || 'Ubicación no disponible';

    document.getElementById('dash-lower').innerHTML = `
      <div class="section-card">
        <div class="section-card-title">📅 Mi horario semanal</div>
        <div id="personal-cal"></div>
        <div class="shift-legend">
          <div class="legend-item"><div class="legend-dot M"></div>Mañana (06:00–14:00)</div>
          <div class="legend-item"><div class="legend-dot T"></div>Tarde (14:00–22:00)</div>
          <div class="legend-item"><div class="legend-dot I"></div>Intermedio (09:00–18:00)</div>
          <div class="legend-item"><div class="legend-dot D"></div>Descanso</div>
        </div>
      </div>
      <div class="section-card">
        <div class="section-card-title">🏢 Mis centros de trabajo</div>
        <div class="center-card">
          <div class="center-icon">🏭</div>
          <div class="center-info">
            <div class="name">${session.base || 'Sin asignar'}</div>
            <div class="sub">${baseType}</div>
            <div class="sub" style="margin-top:4px;font-size:11px;color:var(--muted)">${baseAddress}</div>
          </div>
        </div>
      </div>`;

    Calendar.renderCalendar('personal-cal', [session], turnos, false);
  }

  async function renderCoordDashboard(pc) {
    let users = []; let turnos = {};
    try {
      const [uRes, tRes, bRes] = await Promise.all([
        API.getUsuarios(),
        API.getTurnos(session.base, Calendar.getWeekKey(currentDates)),
        API.getBases()
      ]);
      if (uRes.success) users = uRes.usuarios.filter(u => u.rol === 'tecnico' && u.activo !== '0' && Auth.canViewBase(u.base));
      if (tRes.success && tRes.turnos) tRes.turnos.forEach(t => {
        turnos[`${String(t.tecnico || '').trim()}_${String(t.fecha || '').trim()}`] = String(t.turno || '').trim().toUpperCase();
      });
      if (bRes.success && bRes.bases) {
        const baseInfo = bRes.bases.find(b => b.nombre === session.base) || {};
        Calendar.setAvailableShifts(parseShiftDefinitions(baseInfo.horarios));
      }
    } catch {}

    const assignedShifts = Object.keys(turnos).length;
    const totalPossible = users.length * 7;
    const coverage = totalPossible > 0 ? Math.round(assignedShifts / totalPossible * 100) : 0;
    const calendarUsers = [...users];
    if (session.rol === 'coordinador' && session.base && Auth.canViewBase(session.base) && !calendarUsers.some(u => u.clave === session.clave)) {
      calendarUsers.unshift(session);
    }

    document.getElementById('kpi-container').innerHTML = `
      <div class="kpi-grid">
        ${kpiCard('👥', 'blue', users.length, 'Técnicos activos', 'en mi base')}
        ${kpiCard('📅', 'green', assignedShifts, 'Turnos asignados', 'esta semana')}
        ${kpiCard('📊', 'amber', coverage + '%', 'Cobertura', 'de puestos')}
        ${kpiCard('🏢', 'purple', session.base, 'Mi base', 'asignada')}
      </div>`;

    document.getElementById('dash-lower').innerHTML = `
      <div class="section-card">
        <div class="section-card-title" style="justify-content:space-between">
          <span>📅 Calendario semanal — Vista de planeación</span>
          <button class="btn btn-primary btn-sm" onclick="Dashboard.navigate('planeacion')">+ Nuevo turno</button>
        </div>
        <div id="coord-cal"></div>
      </div>
      <div class="section-card mt-16">
        <div class="section-card-title">👥 Técnicos a mi cargo</div>
        <div class="team-grid" id="team-grid"></div>
      </div>`;

    Calendar.renderGrid('coord-cal', calendarUsers, turnos, currentDates, false);

    const teamGrid = document.getElementById('team-grid');
    if (teamGrid) {
      teamGrid.innerHTML = users.slice(0, 6).map(u => `
        <div class="team-card">
          <div class="avatar avatar-tecnico">${getInitials(u.nombre)}</div>
          <div class="name">${u.nombre}</div>
          <div class="role-sub">Técnico</div>
          <div class="center">${u.base}</div>
        </div>
      `).join('') + (users.length > 6 ? `<div class="team-card" style="justify-content:center;cursor:pointer" onclick="Dashboard.navigate('tecnicos')"><div style="font-size:24px">👥</div><div class="name" style="color:var(--blue-bright)">Ver todos (${users.length})</div></div>` : '');
    }
  }

  async function renderJefeDashboard(pc) {
    let stats = { tecnicos: 0, horas: 0, bases: 0, cobertura: 98 };
    let basesData = [];
    try {
      const [iRes, bRes] = await Promise.all([API.getIndicadores(), API.getBases()]);
      if (iRes.success) stats = { ...stats, ...iRes.indicadores };
      if (bRes.success) basesData = bRes.bases;
    } catch {}

    document.getElementById('kpi-container').innerHTML = `
      <div class="kpi-grid">
        ${kpiCard('👥', 'blue', stats.tecnicos || '—', 'Total técnicos', 'activos')}
        ${kpiCard('⏱️', 'green', (stats.horas || '—') + ' h', 'Total horas semana', 'programadas')}
        ${kpiCard('🏢', 'amber', basesData.length || stats.bases || '—', 'Centros de trabajo', 'activos')}
        ${kpiCard('📊', 'purple', (stats.cobertura || '—') + '%', 'Cobertura', 'de puestos')}
      </div>`;

    document.getElementById('dash-lower').innerHTML = `
      <div class="two-col">
        <div class="section-card">
          <div class="section-card-title">🌐 Calendario global — Todos los técnicos</div>
          <div id="global-cal"></div>
        </div>
        <div>
          <div class="section-card">
            <div class="section-card-title">🏢 Centros de trabajo</div>
            <div id="bases-list"></div>
          </div>
          <div class="section-card mt-16">
            <div class="section-card-title">⚡ Accesos rápidos</div>
            <div class="team-grid" style="grid-template-columns:repeat(4,1fr)">
              ${quickLink('👤', 'Usuarios y roles', 'usuarios')}
              ${quickLink('📅', 'Configurar turnos', 'planeacion')}
              ${quickLink('📊', 'Reportes', 'reportes')}
              ${quickLink('🏢', 'Centros', 'centros')}
            </div>
          </div>
        </div>
      </div>`;

    // Bases list
    const basesList = document.getElementById('bases-list');
    if (basesList && basesData.length) {
      basesList.innerHTML = basesData.slice(0, 5).map(b => `
        <div class="center-card" style="margin-bottom:8px">
          <div class="center-icon">🏭</div>
          <div class="center-info">
            <div class="name">${b.nombre}</div>
            <div class="sub">${b.tipo || 'Operativo'}</div>
          </div>
          <div class="center-badge">${b.tecnicos || 0} técnicos</div>
        </div>`).join('') +
        (basesData.length > 5 ? `<button class="btn btn-ghost btn-sm" style="width:100%;margin-top:6px" onclick="Dashboard.navigate('centros')">Ver todas →</button>` : '');
    }

    // Global calendar (simplified)
    try {
      const [uRes, tRes] = await Promise.all([
        API.getUsuarios(),
        API.getTurnos(null, Calendar.getWeekKey(currentDates))
      ]);
      let users = [], turnos = {};
      if (uRes.success) users = uRes.usuarios.filter(u => u.rol === 'tecnico' && u.activo !== '0').slice(0, 8);
      if (tRes.success && tRes.turnos) tRes.turnos.forEach(t => {
        turnos[`${String(t.tecnico || '').trim()}_${String(t.fecha || '').trim()}`] = String(t.turno || '').trim().toUpperCase();
      });
      Calendar.renderGrid('global-cal', users, turnos, currentDates, false);
    } catch {}
  }

  function quickLink(icon, label, view) {
    return `<div class="team-card" style="cursor:pointer" onclick="Dashboard.navigate('${view}')">
      <div style="font-size:24px">${icon}</div>
      <div class="role-sub" style="text-align:center;font-size:11px">${label}</div>
    </div>`;
  }

  // ── PLANEACIÓN (Coordinator/Jefe) ─────────────────────
  async function renderPlaneacion() {
    const pc = document.getElementById('page-content');
    if (!pc) return;

    if (!Auth.isCoordinador() && !Auth.isJefe()) { pc.innerHTML = forbidden(); return; }

    const isJefe = session.rol === 'jefe';
    const displayBase = isJefe ? 'Todas las bases' : (session.base || 'Base asignada');

    pc.innerHTML = `
      <div class="flex items-center gap-12 mb-16">
        <div>
          <h1 class="page-title">Planeación de turnos</h1>
          <p class="page-sub">${displayBase}</p>
        </div>
        <button class="btn btn-primary" style="margin-left:auto" onclick="Dashboard.openNewTurnoModal()">+ Nuevo turno</button>
        <button class="btn btn-ghost" onclick="">Filtros</button>
      </div>
      <div class="calendar-section">
        <div class="calendar-header">
          <span class="calendar-title">Calendario semanal — Vista de planeación</span>
        </div>
        <div id="planeacion-cal"><div class="empty-state"><div class="loader-ring"></div></div></div>
      </div>`;

    try {
      const [uRes, tRes, bRes] = await Promise.all([
        API.getUsuarios(),
        API.getTurnos(isJefe ? null : session.base, Calendar.getWeekKey(currentDates)),
        API.getBases()
      ]);
      let users = [], turnos = {};
      if (uRes.success) {
        users = uRes.usuarios.filter(u => {
          const isSelf = String(u.clave || '').trim() === String(session.clave || '').trim();
          const includeUser = u.rol === 'tecnico' || u.rol === 'coordinador' || isSelf;
          return includeUser &&
            u.activo !== '0' &&
            (isSelf || session.rol === 'jefe' || Auth.canViewBase(u.base));
        });
        users = users.filter(u => !(session.rol === 'jefe' && String(u.clave || '').trim() === String(session.clave || '').trim()));
        users.sort((a, b) => (a.base || '').localeCompare(b.base || ''));
      }
      if (tRes.success && tRes.turnos) {
        tRes.turnos.forEach(t => {
          turnos[`${String(t.tecnico || '').trim()}_${String(t.fecha || '').trim()}`] = String(t.turno || '').trim().toUpperCase();
        });
      }
      if (bRes.success && bRes.bases) {
        const baseInfo = isJefe 
          ? (bRes.bases[0] || {})
          : (bRes.bases.find(b => b.nombre === session.base) || {});
        Calendar.setAvailableShifts(parseShiftDefinitions(baseInfo.horarios));
      }
      Calendar.renderGrid('planeacion-cal', users, turnos, currentDates, true);
    } catch (e) {
      document.getElementById('planeacion-cal').innerHTML = `<div class="empty-state"><p>Error: ${e.message}</p></div>`;
    }
  }

  // ── CALENDARIO (read-only) ────────────────────────────
  async function renderCalendario() {
    const pc = document.getElementById('page-content');
    if (!pc) return;

    const isJefe = session.rol === 'jefe';
    const displayBase = isJefe ? 'Vista global' : (session.base || 'Vista de coordinación');

    pc.innerHTML = `
      <h1 class="page-title">Calendario semanal</h1>
      <p class="page-sub">${displayBase}</p>
      <div class="calendar-section">
        <div class="calendar-header"><span class="calendar-title">Vista de coordinación</span></div>
        <div id="readonly-cal"><div class="empty-state"><div class="loader-ring"></div></div></div>
      </div>`;

    try {
      const [uRes, tRes] = await Promise.all([
        API.getUsuarios(),
        API.getTurnos(isJefe ? null : session.base, Calendar.getWeekKey(currentDates))
      ]);
      let users = [], turnos = {};
      if (uRes.success) {
        users = uRes.usuarios.filter(u => {
          const isSelf = String(u.clave || '').trim() === String(session.clave || '').trim();
          const includeUser = u.rol === 'tecnico' || u.rol === 'coordinador' || isSelf;
          return includeUser &&
            u.activo !== '0' &&
            (isSelf || session.rol === 'jefe' || Auth.canViewBase(u.base));
        });
        users = users.filter(u => !(session.rol === 'jefe' && String(u.clave || '').trim() === String(session.clave || '').trim()));
        users.sort((a, b) => (a.base || '').localeCompare(b.base || ''));
      }
      if (tRes.success && tRes.turnos) {
        tRes.turnos.forEach(t => {
          turnos[`${String(t.tecnico || '').trim()}_${String(t.fecha || '').trim()}`] = String(t.turno || '').trim().toUpperCase();
        });
      }
      Calendar.renderGrid('readonly-cal', users, turnos, currentDates, false);
    } catch {}
  }

  // ── MIS TURNOS (técnico) ──────────────────────────────
  async function renderMisTurnos() {
    const pc = document.getElementById('page-content');
    if (!pc) return;

    if (!Auth.isTecnico()) { pc.innerHTML = forbidden(); return; }

    pc.innerHTML = `
      <h1 class="page-title">Mis turnos</h1>
      <p class="page-sub">Semana actual · ${session.base}</p>
      <div class="calendar-section">
        <div class="calendar-header"><span class="calendar-title">Mi horario semanal</span></div>
        <div id="mis-turnos-cal"><div class="empty-state"><div class="loader-ring"></div></div></div>
      </div>`;

    try {
      const [res, bRes] = await Promise.all([
        API.getTurnos(session.base, Calendar.getWeekKey(currentDates)),
        API.getBases()
      ]);
      if (bRes.success && bRes.bases) {
        const baseInfo = bRes.bases.find(b => b.nombre === session.base) || {};
        Calendar.setAvailableShifts(parseShiftDefinitions(baseInfo.horarios));
      }

      let turnos = {};
      if (res.success && res.turnos) {
        console.log('Turnos obtenidos:', res.turnos);
        console.log('Session clave:', session.clave);
        res.turnos.filter(t => String(t.tecnico || '').trim() === String(session.clave || '').trim())
          .forEach(t => {
            turnos[`${String(t.tecnico || '').trim()}_${String(t.fecha || '').trim()}`] = String(t.turno || '').trim().toUpperCase();
          });
        console.log('Turnos mapeados:', turnos);
      }
      Calendar.renderGrid('mis-turnos-cal', [{ clave: session.clave, nombre: session.nombre }], turnos, currentDates, false);
    } catch {}
  }

  // ── MI HORARIO (técnico) ──────────────────────────────
  async function renderMiHorario() {
    const pc = document.getElementById('page-content');
    if (!pc) return;

    pc.innerHTML = `
      <h1 class="page-title">Mi horario semanal</h1>
      <p class="page-sub">Vista de bloques · ${session.base}</p>
      <div class="section-card">
        <div id="mi-horario-grid"><div class="empty-state"><div class="loader-ring"></div></div></div>
        <div class="shift-legend">
          <div class="legend-item"><div class="legend-dot M"></div>Mañana (06:00–14:00)</div>
          <div class="legend-item"><div class="legend-dot T"></div>Tarde (14:00–22:00)</div>
          <div class="legend-item"><div class="legend-dot I"></div>Intermedio (09:00–18:00)</div>
          <div class="legend-item"><div class="legend-dot D"></div>Descanso</div>
        </div>
      </div>`;

    try {
      const [res, bRes] = await Promise.all([
        API.getTurnos(session.base, Calendar.getWeekKey(currentDates)),
        API.getBases()
      ]);
      if (bRes.success && bRes.bases) {
        const baseInfo = bRes.bases.find(b => b.nombre === session.base) || {};
        Calendar.setAvailableShifts(parseShiftDefinitions(baseInfo.horarios));
      }

      let turnos = {};
      if (res.success && res.turnos) {
        console.log('Turnos obtenidos personal:', res.turnos);
        console.log('Session clave personal:', session.clave);
        res.turnos.filter(t => String(t.tecnico || '').trim() === String(session.clave || '').trim())
          .forEach(t => {
            turnos[`${String(t.tecnico || '').trim()}_${String(t.fecha || '').trim()}`] = String(t.turno || '').trim().toUpperCase();
          });
        console.log('Turnos mapeados personal:', turnos);
      }
      Calendar.renderPersonalSchedule('mi-horario-grid', turnos, currentDates);
    } catch {}
  }

  // ── MIS CENTROS (técnico) ─────────────────────────────
  function formatSolicitudDate(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function parseShiftDefinitions(text = '') {
    const raw = String(text || '').trim();
    if (!raw) return [];

    const known = {
      M: { code: 'M', label: 'M', title: 'Mañana', hours: '06:00–14:00', cls: 'shift-M' },
      T: { code: 'T', label: 'T', title: 'Tarde', hours: '14:00–22:00', cls: 'shift-T' },
      I: { code: 'I', label: 'I', title: 'Intermedio', hours: '09:00–18:00', cls: 'shift-N' },
      N: { code: 'I', label: 'I', title: 'Intermedio', hours: '09:00–18:00', cls: 'shift-N' },
      D: { code: 'D', label: 'D', title: 'Descanso', hours: '', cls: 'shift-R' },
      R: { code: 'D', label: 'D', title: 'Descanso', hours: '', cls: 'shift-R' }
    };

    return raw.split(/[,;]+/)
      .map(item => item.trim())
      .filter(Boolean)
      .map(item => {
        const [codePart, detailPart] = item.split(':').map(part => part.trim());
        const code = String(codePart || '').toUpperCase();
        if (!code) return null;

        if (known[code]) {
          return known[code];
        }

        let title = code;
        let hours = '';
        if (detailPart) {
          if (/\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}/.test(detailPart)) {
            hours = detailPart.replace(/\s+/g, '');
            title = code;
          } else {
            title = detailPart;
          }
        }

        return { code, title, hours, cls: 'shift-custom' };
      })
      .filter(Boolean);
  }

  function getShiftCount(horarios) {
    return parseShiftDefinitions(horarios).length;
  }

  function formatSolicitudRange(s) {
    const inicio = s.fecha_inicio || s.fecha;
    const fin = s.fecha_fin || s.fecha;
    const inicioFmt = formatSolicitudDate(inicio);
    const finFmt = formatSolicitudDate(fin);
    const dias = Number(s.dias) || 1;
    if (!s.fecha_fin || fin === inicio || finFmt === inicioFmt) {
      return `${inicioFmt} (${dias} día${dias > 1 ? 's' : ''})`;
    }
    return `${inicioFmt} - ${finFmt} (${dias} día${dias > 1 ? 's' : ''})`;
  }

  function getSolicitudStatusClass(status) {
    const map = {
      'Aprobado': 'status-approved',
      'Rechazado': 'status-rejected',
      'Pendiente': 'status-pending'
    };
    return map[status] || `status-${String(status || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  }

  function getSolicitudTypeClass(tipo) {
    const map = {
      vacaciones: 'type-vacaciones',
      dias_personales: 'type-dias-personales',
      paternidad: 'type-permiso',
      matrimonio: 'type-permiso',
      defuncion: 'type-permiso',
      cumplea\u00f1os: 'type-cumpleanos',
      aniversario: 'type-aniversario',
      sin_goce: 'type-sin-goce'
    };
    return map[tipo] || 'type-default';
  }

  function formatSolicitudType(tipo) {
    if (!tipo) return '—';
    return tipo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  async function renderMisCentros() {
    const pc = document.getElementById('page-content');
    if (!pc) return;

    let baseInfo = {};
    try {
      const bRes = await API.getBases();
      if (bRes.success && bRes.bases) {
        baseInfo = bRes.bases.find(b => b.nombre === session.base) || {};
      }
    } catch {}

    const baseType = baseInfo.tipo || '—';
    const baseAddress = baseInfo.direccion || 'Ubicación no disponible';

    pc.innerHTML = `
      <h1 class="page-title">Mis centros de trabajo</h1>
      <p class="page-sub">Centros asignados a tu perfil</p>
      <div class="section-card">
        <div class="center-card">
          <div class="center-icon">🏭</div>
          <div class="center-info">
            <div class="name">${session.base || 'Sin asignar'}</div>
            <div class="sub">${baseType}</div>
            <div class="sub" style="margin-top:4px;font-size:11px;color:var(--muted)">${baseAddress}</div>
          </div>
        </div>
        <hr class="divider">
        <div style="font-size:13px;color:var(--text-2)">
          <div class="flex items-center gap-8 mb-16">
            <span>👥 Compañeros:</span> <strong>12 técnicos</strong>
          </div>
          <div class="flex items-center gap-8">
            <span>🗂 Área:</span> <strong>${baseType}</strong>
          </div>
        </div>
      </div>`;
  }

  // ── SOLICITUDES ───────────────────────────────────────
  async function renderSolicitudes() {
    const pc = document.getElementById('page-content');
    if (!pc) return;

    const isTech = session.rol === 'tecnico';
    const isCoord = session.rol === 'coordinador';
    const isJefe = session.rol === 'jefe';
    const canCreate = isTech || isCoord;

    pc.innerHTML = `
      <div class="flex items-center gap-12 mb-16">
        <div>
          <h1 class="page-title">Solicitudes${isTech ? ' personales' : isCoord ? ' de mi base' : ''}</h1>
          <p class="page-sub">Gestión de permisos y ausencias</p>
        </div>
        ${canCreate ? `<button class="btn btn-primary" style="margin-left:auto" onclick="Dashboard.openSolicitudModal()">+ Nueva solicitud</button>` : ''}
      </div>
      <div class="data-table-wrap">
        <div class="data-table-head">
          <span class="title">Historial de solicitudes</span>
          <input class="search-input" placeholder="Buscar..." oninput="Dashboard.filterTable(this.value,'solicitudes-body')">
        </div>
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr>
                ${!isTech ? '<th>Técnico</th><th>Base</th>' : ''}
                <th>Tipo</th><th>Fecha</th><th>Comentario</th><th>Estado</th>
                ${(isCoord || isJefe) ? '<th>Acciones</th>' : ''}
              </tr>
            </thead>
            <tbody id="solicitudes-body"><tr><td colspan="8" style="text-align:center;padding:32px"><div class="spinner-sm"></div></td></tr></tbody>
          </table>
        </div>
      </div>`;

    try {
      const res = await API.getSolicitudes();
      const tbody = document.getElementById('solicitudes-body');
      if (!tbody) return;

      let solicitudes = (res.success && res.solicitudes) ? res.solicitudes : [];

      if (isTech) {
        solicitudes = solicitudes.filter(s => s.clave === session.clave);
      } else if (isCoord) {
        const users = await API.getUsuarios();
        const tecnicoClaves = users.success && users.usuarios
          ? users.usuarios.filter(u => u.rol === 'tecnico' && u.base === session.base).map(u => u.clave)
          : [];
        solicitudes = solicitudes.filter(s => tecnicoClaves.includes(s.clave));
      }

      if (!solicitudes.length) {
        tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="icon">📩</div><p>No hay solicitudes</p></div></td></tr>`;
        return;
      }

      tbody.innerHTML = solicitudes.map(s => `
        <tr>
          ${!isTech ? `<td>${s.nombre || s.clave}</td><td>${s.base}</td>` : ''}
          <td><span class="type-badge ${getSolicitudTypeClass(s.tipo)}">${formatSolicitudType(s.tipo)}</span></td>
          <td style="font-family:'Space Mono',monospace;font-size:12px">${formatSolicitudRange(s)}</td>
          <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.comentario || '—'}</td>
          <td><span class="status-badge ${getSolicitudStatusClass(s.estatus)}">${s.estatus}</span></td>
          ${(isCoord || isJefe) && s.estatus === 'Pendiente' ? `
            <td class="table-actions">
              <button class="btn btn-sm" style="background:var(--green-dim);color:var(--green);border:1px solid rgba(34,197,94,.3)" onclick="Dashboard.resolverSolicitud('${s.id}','Aprobado')">✓ Aprobar</button>
              <button class="btn btn-sm btn-danger" onclick="Dashboard.resolverSolicitud('${s.id}','Rechazado')">✗ Rechazar</button>
            </td>` : `<td></td>`}
        </tr>`).join('');
    } catch (e) {
      document.getElementById('solicitudes-body').innerHTML = `<tr><td colspan="8"><div class="empty-state"><p>Error: ${e.message}</p></div></td></tr>`;
    }
  }

  // ── TÉCNICOS (coordinador) ────────────────────────────
  async function renderTecnicos() {
    const pc = document.getElementById('page-content');
    if (!pc) return;

    if (session.rol === 'tecnico') { pc.innerHTML = forbidden(); return; }

    pc.innerHTML = `
      <h1 class="page-title">Técnicos a mi cargo</h1>
      <p class="page-sub">Base: ${session.base}</p>
      <div class="data-table-wrap">
        <div class="data-table-head">
          <span class="title">Técnicos activos</span>
          <input class="search-input" placeholder="Buscar técnico..." oninput="Dashboard.filterTable(this.value,'tecnicos-body')">
        </div>
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead><tr><th>Nombre</th><th>Clave</th><th>Base</th><th>Estado</th></tr></thead>
            <tbody id="tecnicos-body"><tr><td colspan="4" style="text-align:center;padding:32px"><div class="spinner-sm"></div></td></tr></tbody>
          </table>
        </div>
      </div>`;

    try {
      const res = await API.getUsuarios();
      const tbody = document.getElementById('tecnicos-body');
      if (!tbody) return;

      let users = (res.success && res.usuarios) ? res.usuarios : [];
      users = Auth.filterByBase(users.filter(u => u.rol === 'tecnico'));

      if (!users.length) {
        tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><div class="icon">👥</div><p>No hay técnicos</p></div></td></tr>`;
        return;
      }

      tbody.innerHTML = users.map(u => `
        <tr>
          <td><div class="tech-cell"><div class="tech-avatar">${getInitials(u.nombre)}</div>${u.nombre}</div></td>
          <td style="font-family:'Space Mono',monospace;font-size:12px">${u.clave}</td>
          <td>${u.base}</td>
          <td><span class="status-badge ${u.activo === '0' ? 'status-inactive' : 'status-active'}">${u.activo === '0' ? 'Inactivo' : 'Activo'}</span></td>
        </tr>`).join('');
    } catch {}
  }

  // ── USUARIOS (jefe only) ──────────────────────────────
  async function renderUsuarios() {
    const pc = document.getElementById('page-content');
    if (!pc) return;

    if (!Auth.isJefe()) { pc.innerHTML = forbidden(); return; }

    pc.innerHTML = `
      <div class="flex items-center gap-12 mb-16">
        <div>
          <h1 class="page-title">Usuarios y roles</h1>
          <p class="page-sub">Gestión global de accesos</p>
        </div>
        <button class="btn btn-primary" style="margin-left:auto" onclick="Dashboard.openUserModal()">+ Crear usuario</button>
      </div>
      <div class="data-table-wrap">
        <div class="data-table-head">
          <span class="title">Todos los usuarios</span>
          <input class="search-input" placeholder="Buscar..." oninput="Dashboard.filterTable(this.value,'users-body')">
        </div>
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead><tr><th>Nombre</th><th>Clave</th><th>Rol</th><th>Base</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody id="users-body"><tr><td colspan="6" style="text-align:center;padding:32px"><div class="spinner-sm"></div></td></tr></tbody>
          </table>
        </div>
      </div>`;

    try {
      const res = await API.getUsuarios();
      const tbody = document.getElementById('users-body');
      if (!tbody) return;

      const users = (res.success && res.usuarios) ? res.usuarios : [];

      if (!users.length) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="icon">👤</div><p>No hay usuarios</p></div></td></tr>`;
        return;
      }

      tbody.innerHTML = users.map(u => `
        <tr>
          <td><div class="tech-cell"><div class="tech-avatar avatar-${u.rol}">${getInitials(u.nombre)}</div>${u.nombre}</div></td>
          <td style="font-family:'Space Mono',monospace;font-size:12px">${u.clave}</td>
          <td><span class="role-badge role-${u.rol}">${capitalize(u.rol)}</span></td>
          <td>${u.base || '—'}</td>
          <td><span class="status-badge ${u.activo === '0' ? 'status-inactive' : 'status-active'}">${u.activo === '0' ? 'Inactivo' : 'Activo'}</span></td>
          <td class="table-actions">
            <button class="btn btn-ghost btn-sm" onclick="Dashboard.openUserModal(${JSON.stringify(u).replace(/"/g,'&quot;')})">Editar</button>
            <button class="btn btn-sm ${u.activo === '0' ? '' : 'btn-danger'}" 
              style="${u.activo === '0' ? 'background:var(--green-dim);color:var(--green);border:1px solid rgba(34,197,94,.3)' : ''}"
              onclick="Dashboard.toggleUser('${u.clave}', ${u.activo === '0'})">
              ${u.activo === '0' ? 'Activar' : 'Suspender'}
            </button>
          </td>
        </tr>`).join('');
    } catch (e) {
      document.getElementById('users-body').innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>Error: ${e.message}</p></div></td></tr>`;
    }
  }

  // ── CENTROS (jefe) ────────────────────────────────────
  async function renderCentros() {
    const pc = document.getElementById('page-content');
    if (!pc) return;

    if (!Auth.isJefe()) { pc.innerHTML = forbidden(); return; }

    pc.innerHTML = `
      <div class="flex items-center gap-12 mb-16">
        <div>
          <h1 class="page-title">Centros de trabajo</h1>
          <p class="page-sub">Gestión de bases operativas</p>
        </div>
        <button class="btn btn-primary" style="margin-left:auto" onclick="Dashboard.openBaseModal()">+ Nueva base</button>
      </div>
      <div id="centros-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
        <div class="empty-state"><div class="loader-ring"></div></div>
      </div>`;

    try {
      const res = await API.getBases();
      const grid = document.getElementById('centros-grid');
      if (!grid) return;

      const bases = (res.success && res.bases) ? res.bases : [];

      if (!bases.length) {
        grid.innerHTML = `<div class="empty-state"><div class="icon">🏢</div><p>No hay bases registradas</p></div>`;
        return;
      }

      grid.innerHTML = bases.map(b => `
        <div class="section-card" style="margin:0">
          <div class="flex items-center gap-12 mb-16">
            <div class="center-icon">🏭</div>
            <div>
              <div style="font-size:15px;font-weight:700">${b.nombre}</div>
              <div style="font-size:12px;color:var(--muted)">${b.tipo || 'Operativo'}</div>
            </div>
            <span class="status-badge ${b.activo === '0' ? 'status-inactive' : 'status-active'}" style="margin-left:auto">${b.activo === '0' ? 'Inactivo' : 'Activo'}</span>
          </div>
          <div style="font-size:13px;color:var(--text-2);display:flex;gap:16px;flex-wrap:wrap">
            <span>👥 ${b.tecnicos || 0} técnicos</span>
            <span>📍 ${b.direccion || 'Sin dirección'}</span>
          </div>
          <hr class="divider">
          <div class="table-actions">
            <button class="btn btn-ghost btn-sm" onclick="Dashboard.openBaseModal(${JSON.stringify(b).replace(/"/g,'&quot;')})">Editar</button>
            <button class="btn btn-sm btn-danger">Suspender</button>
          </div>
        </div>`).join('');
    } catch {}
  }

  // ── REPORTES ──────────────────────────────────────────
  async function renderReportes() {
    const pc = document.getElementById('page-content');
    if (!pc) return;

    if (!Auth.isCoordinador()) { pc.innerHTML = forbidden(); return; }

    pc.innerHTML = `
      <h1 class="page-title">Reportes y métricas</h1>
      <p class="page-sub">${session.rol === 'jefe' ? 'Vista global' : session.base}</p>
      <div id="kpi-container"><div class="kpi-grid">${[1,2,3,4].map(() => skeletonKpi()).join('')}</div></div>
      <div class="two-col mt-24" id="report-charts">
        <div class="section-card">
          <div class="section-card-title">📈 Distribución de turnos</div>
          <div id="shift-dist" style="padding:20px 0"></div>
        </div>
        <div class="section-card">
          <div class="section-card-title">📊 Técnicos por base</div>
          <div id="base-dist" style="padding:20px 0"></div>
        </div>
      </div>`;

    try {
      const res = await API.getIndicadores();
      const ind = (res.success && res.indicadores) ? res.indicadores : {};
      document.getElementById('kpi-container').innerHTML = `<div class="kpi-grid">
        ${kpiCard('👥', 'blue', ind.tecnicos || '—', 'Técnicos activos', '')}
        ${kpiCard('⏱️', 'green', (ind.horas || '—') + ' h', 'Horas asignadas', 'esta semana')}
        ${kpiCard('📊', 'amber', (ind.cobertura || '—') + '%', 'Cobertura', 'de turnos')}
        ${kpiCard('📩', 'purple', ind.solicitudes || '—', 'Solicitudes pendientes', '')}
      </div>`;

      // Simple bar charts using CSS
      renderBarChart('shift-dist', [
        { label: 'Mañana', val: ind.turnosM || 40, color: 'var(--shift-morning)' },
        { label: 'Tarde', val: ind.turnosT || 35, color: 'var(--shift-afternoon)' },
        { label: 'Noche', val: ind.turnosN || 20, color: 'var(--shift-night)' },
        { label: 'Descanso', val: ind.turnosR || 5, color: 'var(--muted)' }
      ]);
    } catch {}
  }

  function renderBarChart(containerId, data) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const max = Math.max(...data.map(d => d.val));
    el.innerHTML = data.map(d => `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
        <div style="width:70px;font-size:12px;color:var(--text-2);text-align:right">${d.label}</div>
        <div style="flex:1;background:var(--surface-3);border-radius:4px;height:20px;overflow:hidden">
          <div style="width:${Math.round(d.val/max*100)}%;background:${d.color};height:100%;border-radius:4px;transition:width 0.8s ease"></div>
        </div>
        <div style="width:40px;font-size:12px;font-family:'Space Mono',monospace;color:var(--text-2)">${d.val}%</div>
      </div>`).join('');
  }

  // ── MODALS ────────────────────────────────────────────
  async function openUserModal(user = null) {
    if (!Auth.isJefe()) return;
    const isEdit = !!user;

    try {
      const basesRes = await API.getBases();
      const bases = basesRes.success ? (basesRes.bases || []) : [];
      const basesOptions = bases
        .map(b => `<option value="${b.nombre}" ${user?.base === b.nombre ? 'selected' : ''}>${b.nombre}</option>`)
        .join('');

      UI.showModal({
        title: isEdit ? 'Editar usuario' : 'Crear usuario',
        body: `
          <div class="form-row">
            <div class="form-field">
              <label>Nombre completo</label>
              <input type="text" id="m-nombre" value="${user?.nombre || ''}" placeholder="Ej. Germán Cruz Rueda">
            </div>
            <div class="form-field">
              <label>Clave de acceso</label>
              <input type="text" id="m-clave" value="${user?.clave || ''}" placeholder="Ej. 1003597" ${isEdit ? 'readonly' : ''}>
            </div>
          </div>
          <div class="form-row">
            <div class="form-field">
              <label>Rol</label>
              <select id="m-rol">
                <option value="tecnico" ${user?.rol==='tecnico'?'selected':''}>Técnico</option>
                <option value="coordinador" ${user?.rol==='coordinador'?'selected':''}>Coordinador</option>
                <option value="jefe" ${user?.rol==='jefe'?'selected':''}>Jefe</option>
              </select>
            </div>
            <div class="form-field">
              <label>Base asignada</label>
              <select id="m-base">
                <option value="">— Sin base —</option>
                ${basesOptions}
              </select>
            </div>
          </div>
          ${!isEdit ? `<div class="form-field">
            <label>Contraseña inicial</label>
            <input type="password" id="m-password" placeholder="••••••••">
          </div>` : ''}`,
        onConfirm: async () => {
          const data = {
            clave: document.getElementById('m-clave').value.trim(),
            nombre: document.getElementById('m-nombre').value.trim(),
            rol: document.getElementById('m-rol').value,
            base: document.getElementById('m-base').value,
            password: document.getElementById('m-password')?.value || undefined,
            activo: user?.activo ?? '1'
          };
          if (!data.clave || !data.nombre) { UI.showToast('Completa todos los campos', 'error'); return; }

          try {
            const res = isEdit ? await API.actualizarUsuario(data) : await API.crearUsuario(data);
            if (res.success) {
              UI.closeModal();
              UI.showToast(`Usuario ${isEdit ? 'actualizado' : 'creado'} correctamente`, 'success');
              renderUsuarios();
            } else {
              UI.showToast(res.mensaje || 'Error al guardar', 'error');
            }
          } catch {
            UI.showToast('Error de conexión', 'error');
          }
        }
      });
    } catch (e) {
      UI.showToast('Error al cargar bases: ' + e.message, 'error');
    }
  }

  function openBaseModal(base = null) {
    if (!Auth.isJefe()) return;

    UI.showModal({
      title: base ? 'Editar base' : 'Nueva base',
      body: `
        <div class="form-field">
          <label>Nombre de la base</label>
          <input type="text" id="m-nombre" value="${base?.nombre || ''}" placeholder="Ej. GDLJ Central Nueva">
        </div>
        <div class="form-row">
          <div class="form-field">
            <label>Tipo</label>
            <select id="m-tipo">
              <option value="Taller" ${base?.tipo==='Taller'?'selected':''}>Taller</option>
              <option value="Terminal" ${base?.tipo==='Terminal'?'selected':''}>Terminal</option>
              <option value="Corporativo" ${base?.tipo==='Corporativo'?'selected':''}>Corporativo</option>
            </select>
          </div>
          <div class="form-field">
            <label>Dirección</label>
            <input type="text" id="m-dir" value="${base?.direccion || ''}" placeholder="Av. Industrial 123">
          </div>
        </div>
        <div class="form-field">
          <label>Turnos disponibles</label>
          <textarea id="m-horarios" rows="4" placeholder="Ej. M:06:00-14:00, T:14:00-22:00, I:09:00-18:00, D:Descanso">${base?.horarios || ''}</textarea>
          <small class="form-help">Define los códigos y horas para esta base. Usa formato CÓDIGO:DESCRIPCIÓN o CÓDIGO:HH:MM-HH:MM separados por comas.</small>
        </div>`,
      onConfirm: async () => {
        const data = {
          nombre: document.getElementById('m-nombre').value.trim(),
          tipo: document.getElementById('m-tipo').value,
          direccion: document.getElementById('m-dir').value.trim(),
          horarios: document.getElementById('m-horarios').value.trim(),
          activo: base?.activo ?? '1'
        };
        if (!data.nombre) { UI.showToast('Ingresa el nombre de la base', 'error'); return; }
        try {
          const res = base ? await API.actualizarBase(data) : await API.crearBase(data);
          if (res.success) {
            UI.closeModal();
            UI.showToast('Base guardada', 'success');
            renderCentros();
          } else {
            UI.showToast(res.mensaje || 'Error', 'error');
          }
        } catch {
          UI.showToast('Error de conexión', 'error');
        }
      }
    });
  }

  function openSolicitudModal() {
    if (!Auth.isTecnico() && session.rol !== 'coordinador') return;

    UI.showModal({
      title: 'Nueva solicitud',
      body: `
        <div class="form-field">
          <label>Tipo de solicitud</label>
          <select id="m-tipo">
            <option value="dias_personales">Días Personales (Con Goce)</option>
            <option value="paternidad">Permiso de Paternidad (Con Goce)</option>
            <option value="cumpleaños">Cumpleaños (Con Goce)</option>
            <option value="aniversario">Aniversario de Empleados (Con Goce)</option>
            <option value="matrimonio">Permiso por Matrimonio (Con Goce)</option>
            <option value="defuncion">Permiso por Defunción (Con Goce)</option>
            <option value="sin_goce">Permiso Sin Goce de Sueldo</option>
            <option value="vacaciones">Vacaciones</option>
          </select>
        </div>
        <div class="form-field">
          <label>Fecha de inicio</label>
          <input type="date" id="m-fecha-inicio" value="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-field">
          <label>Fecha de fin</label>
          <input type="date" id="m-fecha-fin" value="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-field">
          <label>Días solicitados</label>
          <input type="text" id="m-dias" readonly placeholder="Se calcula automáticamente">
        </div>
        <div class="form-field">
          <label>Comentario</label>
          <textarea id="m-comentario" rows="3" placeholder="Motivo o detalle adicional..."></textarea>
        </div>`,
      onConfirm: async () => {
        const tipo = document.getElementById('m-tipo').value;
        const fechaInicio = document.getElementById('m-fecha-inicio').value;
        const fechaFin = document.getElementById('m-fecha-fin').value;
        const comentario = document.getElementById('m-comentario').value.trim();

        if (!fechaInicio || !fechaFin) { UI.showToast('Selecciona fechas de inicio y fin', 'error'); return; }

        const inicio = new Date(fechaInicio + 'T00:00');
        const fin = new Date(fechaFin + 'T00:00');
        if (inicio > fin) { UI.showToast('Fecha de inicio debe ser anterior a la de fin', 'error'); return; }

        // Calcular días inclusive
        const dias = Math.round((fin - inicio) / (1000 * 60 * 60 * 24)) + 1;

        // Validaciones por tipo
        if (tipo === 'vacaciones') {
          if (dias > 6) {
            UI.showToast('Vacaciones no pueden exceder 6 días consecutivos', 'error');
            return;
          }
          const hoy = new Date();
          hoy.setHours(0,0,0,0);
          const anticipacion = Math.ceil((inicio - hoy) / (1000 * 60 * 60 * 24));
          let reqAnticipacion;
          if (dias === 6) reqAnticipacion = 30;
          else if (dias >= 4) reqAnticipacion = 14;
          else reqAnticipacion = 7;
          if (anticipacion < reqAnticipacion) {
            UI.showToast(`Vacaciones requieren ${reqAnticipacion} días de anticipación`, 'error');
            return;
          }
          // Nota: Otras validaciones requieren backend (períodos de actividad, otros colaboradores)
        } else if (tipo === 'dias_personales') {
          if (dias > 1) {
            UI.showToast('Días económicos son individuales', 'error');
            return;
          }
          const hoy = new Date();
          hoy.setHours(0,0,0,0);
          const anticipacion = Math.ceil((inicio - hoy) / (1000 * 60 * 60 * 24));
          if (anticipacion < 7) {
            UI.showToast('Días económicos requieren 7 días de anticipación', 'error');
            return;
          }
          // Nota: Validar no más de 1 por mes, no en períodos de actividad
        } else if (['cumpleaños', 'aniversario'].includes(tipo)) {
          if (dias > 1) {
            UI.showToast('Cumpleaños/aniversario son para un día', 'error');
            return;
          }
          const hoy = new Date();
          hoy.setHours(0,0,0,0);
          const anticipacion = Math.ceil((inicio - hoy) / (1000 * 60 * 60 * 24));
          if (anticipacion < 7) {
            UI.showToast('Cumpleaños/aniversario requieren 7 días de anticipación', 'error');
            return;
          }
          // Nota: Validar reprogramación dentro de la semana
        }
        // Otros tipos pueden no tener validaciones específicas por ahora

        try {
          const res = await API.crearSolicitud({
            clave: session.clave,
            nombre: session.nombre,
            base: session.base,
            tipo, fecha_inicio: fechaInicio, fecha_fin: fechaFin, dias, comentario,
            estatus: 'Pendiente'
          });
          if (res.success) {
            UI.closeModal();
            UI.showToast('Solicitud enviada correctamente', 'success');
            renderSolicitudes();
          } else {
            UI.showToast(res.mensaje || 'Error', 'error');
          }
        } catch {
          UI.showToast('Error de conexión', 'error');
        }
      }
    });

    // Calcular días automáticamente al cambiar fechas
    document.getElementById('m-fecha-inicio').addEventListener('change', calcularDias);
    document.getElementById('m-fecha-fin').addEventListener('change', calcularDias);
    function calcularDias() {
      const fi = document.getElementById('m-fecha-inicio').value;
      const ff = document.getElementById('m-fecha-fin').value;
      if (fi && ff) {
        const inicio = new Date(fi + 'T00:00');
        const fin = new Date(ff + 'T00:00');
        const dias = Math.round((fin - inicio) / (1000 * 60 * 60 * 24)) + 1;
        document.getElementById('m-dias').value = dias > 0 ? dias : '';
      }
    }
  }

  function openNewTurnoModal() {
    navigate('planeacion');
  }

  async function resolverSolicitud(id, estatus) {
    if (!confirm(`¿${estatus} esta solicitud?`)) return;
    try {
      const res = await API.resolverSolicitud(id, estatus);
      if (res.success) {
        UI.showToast(`Solicitud ${estatus.toLowerCase()}`, 'success');
        renderSolicitudes();
      } else {
        UI.showToast(res.mensaje || 'Error', 'error');
      }
    } catch {
      UI.showToast('Error de conexión', 'error');
    }
  }

  async function toggleUser(clave, activate) {
    if (!confirm(`¿${activate ? 'Activar' : 'Suspender'} este usuario?`)) return;
    try {
      const res = await API.cambiarEstatusUsuario(clave, activate);
      if (res.success) {
        UI.showToast(`Usuario ${activate ? 'activado' : 'suspendido'}`, 'success');
        renderUsuarios();
      } else {
        UI.showToast(res.mensaje || 'Error', 'error');
      }
    } catch {
      UI.showToast('Error de conexión', 'error');
    }
  }

  // ── Search filter ─────────────────────────────────────
  function filterTable(query, tbodyId) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    const q = query.toLowerCase();
    Array.from(tbody.rows).forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  }

  // ── Helpers ───────────────────────────────────────────
  function kpiCard(icon, color, value, label, sub) {
    return `<div class="kpi-card">
      <div class="kpi-header">
        <div class="kpi-icon ${color}">${icon}</div>
      </div>
      <div class="kpi-value">${value}</div>
      <div class="kpi-label">${label}</div>
      ${sub ? `<div class="kpi-sub">${sub}</div>` : ''}
    </div>`;
  }

  function skeletonKpi() {
    return `<div class="kpi-card" style="opacity:0.4">
      <div style="width:36px;height:36px;background:var(--surface-3);border-radius:8px;margin-bottom:12px"></div>
      <div style="width:60%;height:28px;background:var(--surface-3);border-radius:6px;margin-bottom:8px"></div>
      <div style="width:80%;height:14px;background:var(--surface-3);border-radius:4px"></div>
    </div>`;
  }

  function getInitials(name = '') {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  }

  function forbidden() {
    return `<div class="page-content"><div class="empty-state"><div class="icon">🚫</div><p>No tienes permisos para ver esta sección</p></div></div>`;
  }

  return {
    init, navigate, refreshCalendar,
    openUserModal, openBaseModal, openSolicitudModal, openNewTurnoModal,
    resolverSolicitud, toggleUser, filterTable
  };
})();

window.Dashboard = Dashboard;

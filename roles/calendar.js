// calendar.js — Calendar rendering and shift management

const Calendar = (() => {
  const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const SHIFT_N = { label: 'I', title: 'Intermedio', hours: '09:00–18:00', cls: 'shift-N', color: '#f59e0b' };
  const SHIFT_R = { label: 'D', title: 'Descanso', hours: '', cls: 'shift-R', color: '#64748b' };
  const SHIFTS = {
    M: { label: 'M', title: 'Mañana', hours: '06:00–14:00', cls: 'shift-M', color: '#00984d' },
    T: { label: 'T', title: 'Tarde', hours: '14:00–22:00', cls: 'shift-T', color: '#0f325a' },
    I: SHIFT_N,
    D: SHIFT_R
  };

  let availableShifts = { ...SHIFTS };
  let currentWeek = null;

  function setAvailableShifts(defs = []) {
    availableShifts = { ...SHIFTS };
    defs.forEach(def => {
      const code = String(def.code || '').trim().toUpperCase();
      if (!code) return;
      availableShifts[code] = {
        label: code,
        title: def.title || code,
        hours: def.hours || '',
        cls: def.cls || 'shift-custom',
        color: def.color || '#d97706'
      };
    });
  }

  function getAvailableShiftDefinitions() {
    return Object.values(availableShifts);
  }

  function getShiftDefinition(code) {
    if (!code) return null;
    const key = String(code).trim().toUpperCase();
    if (availableShifts[key]) return availableShifts[key];
    if (key === 'N') return availableShifts['I'];
    if (key === 'R') return availableShifts['D'];
    return null;
  }
  let pendingChanges = {}; // { "tecnico_fecha": turno }

  // ── Week Helpers ───────────────────────────────────────
  function getWeekDates(weekOffset = 0) {
    const now = new Date();
    const day = now.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff + weekOffset * 7);
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d);
    }
    return dates;
  }

  function getWeekKey(dates) {
    return dates[0].toISOString().split('T')[0];
  }

  function getWeekNum(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  function formatDate(d) {
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  }

  function toISO(d) {
    return d.toISOString().split('T')[0];
  }

  // ── Coordinator/Jefe Grid ──────────────────────────────
  function renderGrid(containerId, technicians, turnosMap, dates, canEdit = false) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const week = getWeekNum(dates[0]);

    let html = `
      <div class="cal-grid">
        <table class="cal-table">
          <thead>
            <tr>
              <th>Técnico</th>
              ${DAYS.map((d, i) => `<th>${d} ${formatDate(dates[i])}</th>`).join('')}
              <th>Total h</th>
              ${canEdit ? '<th></th>' : ''}
            </tr>
          </thead>
          <tbody>
    `;

    if (!technicians.length) {
      html += `<tr><td colspan="10"><div class="empty-state"><div class="icon">👥</div><p>No hay técnicos en esta base</p></div></td></tr>`;
    }

    let currentBase = null;
    for (const tech of technicians) {
      // Insert base separator row if base changes
      if (tech.base && tech.base !== currentBase) {
        currentBase = tech.base;
        html += `<tr style="background:var(--bg-2);height:32px;border:none">
          <td colspan="${7 + (canEdit ? 1 : 0)}" style="padding:8px 12px;font-weight:600;color:var(--text-2);font-size:13px">📍 ${tech.base}</td>
          <td colspan="2"></td>
        </tr>`;
      }

      const initials = tech.nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      let totalHours = 0;

      html += `<tr>
        <td>
          <div class="tech-cell">
            <div class="tech-avatar">${initials}</div>
            <span class="tech-name">${tech.nombre}</span>
          </div>
        </td>`;

      for (const date of dates) {
        const iso = toISO(date);
        const key = `${tech.clave}_${iso}`;
        const turno = pendingChanges[key] !== undefined
          ? pendingChanges[key]
          : (turnosMap[key] || null);

        if (turno && turno !== 'R' && getShiftDefinition(turno)) {
          totalHours += 8;
        }

        const shift = turno ? getShiftDefinition(turno) : null;

        if (canEdit) {
          html += `<td>
            <div class="shift-cell" data-tech="${tech.clave}" data-date="${iso}">
              ${shift
                ? `<span class="shift-badge ${shift.cls}" onclick="Calendar.openShiftPicker(this,'${tech.clave}','${iso}')" title="${shift.title} ${shift.hours}">${shift.label}</span>`
                : `<span class="shift-badge shift-empty" onclick="Calendar.openShiftPicker(this,'${tech.clave}','${iso}')" title="Sin turno">+</span>`
              }
            </div>
          </td>`;
        } else {
          html += `<td>
            ${shift
              ? `<span class="shift-badge ${shift.cls}" title="${shift.title} ${shift.hours}">${shift.label}</span>`
              : `<span class="shift-badge shift-empty" title="Sin turno">—</span>`
            }
          </td>`;
        }
      }

      html += `<td><span class="hours-cell">${totalHours}h</span></td>`;
      if (canEdit) html += `<td></td>`;
      html += `</tr>`;
    }

    html += `</tbody></table></div>`;

    // Legend
    html += `<div class="shift-legend">
      ${getAvailableShiftDefinitions().map(v =>
        `<div class="legend-item"><div class="legend-dot ${v.cls.replace('shift-', '')}"></div>${v.title}${v.hours ? ' (' + v.hours + ')' : ''}</div>`
      ).join('')}
    </div>`;

    // Save button if editable and has changes
    if (canEdit && Object.keys(pendingChanges).length > 0) {
      html += `<div style="padding:14px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:10px;">
        <button class="btn btn-ghost btn-sm" onclick="Calendar.discardChanges('${containerId}')">Descartar cambios</button>
        <button class="btn btn-primary btn-sm" onclick="Calendar.saveChanges()">
          💾 Guardar ${Object.keys(pendingChanges).length} cambio(s)
        </button>
      </div>`;
    }

    container.innerHTML = html;
  }

  // ── Shift Picker Popup ─────────────────────────────────
  let activePicker = null;

  function openShiftPicker(el, clave, fecha) {
    if (!Auth.isCoordinador()) return;
    closePicker();

    const picker = document.createElement('div');
    picker.className = 'shift-selector';
    picker.innerHTML = Object.entries(availableShifts).map(([k, v]) =>
      `<div class="shift-option ${v.cls}" title="${v.title}${v.hours ? ' ' + v.hours : ''}" onclick="Calendar.selectShift('${clave}','${fecha}','${k}')">${v.label || k}</div>`
    ).join('') +
    `<div class="shift-option" style="background:var(--red-dim);color:var(--red)" title="Quitar turno" onclick="Calendar.selectShift('${clave}','${fecha}',null)">✕</div>`;

    const rect = el.getBoundingClientRect();
    picker.style.position = 'fixed';
    picker.style.top = (rect.bottom + 6) + 'px';
    picker.style.left = rect.left + 'px';

    document.body.appendChild(picker);
    activePicker = picker;

    setTimeout(() => {
      document.addEventListener('click', closePicker, { once: true });
    }, 0);
  }

  function closePicker() {
    if (activePicker) {
      activePicker.remove();
      activePicker = null;
    }
  }

  function selectShift(clave, fecha, turno) {
    const key = `${clave}_${fecha}`;
    if (turno === null) {
      delete pendingChanges[key];
    } else {
      pendingChanges[key] = turno;
    }
    closePicker();
    // Re-render
    if (window.Dashboard) Dashboard.refreshCalendar();
  }

  async function saveChanges() {
    if (!Object.keys(pendingChanges).length) return;

    UI.showToast('Guardando cambios...', 'info');
    try {
      const session = Auth.getSession();
      const payload = Object.entries(pendingChanges).map(([key, turno]) => {
        const [clave, fecha] = key.split('_');
        return { base: session.base, tecnico: clave, fecha, turno };
      });

      const res = await API.guardarTurnos(payload);
      if (res.success) {
        pendingChanges = {};
        UI.showToast(res.mensaje || 'Turnos guardados correctamente', 'success');
        API.clearCache('turnos_');
        if (window.Dashboard) {
          Dashboard.refreshCalendar();
          setTimeout(() => Dashboard.refreshCalendar(), 250);
        }
      } else {
        UI.showToast(res.mensaje || 'Error al guardar', 'error');
      }
    } catch {
      UI.showToast('Error de conexión', 'error');
    }
  }

  function discardChanges(containerId) {
    pendingChanges = {};
    if (window.Dashboard) Dashboard.refreshCalendar();
  }

  // ── Técnico's personal schedule ────────────────────────
  function renderPersonalSchedule(containerId, turnosMap, dates) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = `<div class="schedule-grid">
      <div class="sched-header"></div>
      ${DAYS.map((d, i) => `<div class="sched-header">${d}<br><small>${formatDate(dates[i])}</small></div>`).join('')}
      <div class="sched-time">Turno</div>`;

    dates.forEach(date => {
      const iso = toISO(date);
      const clave = Auth.getSession()?.clave;
      const key = `${clave}_${iso}`;
      const turno = turnosMap[key];
      const shift = getShiftDefinition(turno);
      const block = shift
        ? `<div class="shift-block ${shift.cls}">${shift.title}${shift.hours ? `<br><small>${shift.hours}</small>` : ''}</div>`
        : '';
      html += `<div class="sched-cell">${block}</div>`;
    });

    html += `</div>`;
    container.innerHTML = html;
  }

  return {
    getWeekDates, getWeekKey, getWeekNum, formatDate, toISO,
    renderGrid, renderPersonalSchedule,
    openShiftPicker, closePicker, selectShift,
    saveChanges, discardChanges,
    setAvailableShifts, getAvailableShiftDefinitions, getShiftDefinition,
    SHIFTS, DAYS,
    getPendingChanges: () => pendingChanges
  };
})();

window.Calendar = Calendar;

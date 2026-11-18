/**
 * TAB SCOUT — Lógica de la Consola de Administración (`admin.html`)
 * ---------------------------------------------------------------------------
 * - Autenticación mediante Supabase Auth (Email y Contraseña)
 * - Dashboard de KPIs estilo telemetría (Total, Pendientes, En Progreso, Completadas)
 * - Generador de Tokens de un solo uso (`GHO-XXXX-XXXX`) con botones de copiado
 *   rápido ("Copiar solo Token" y "Copiar Link Directo para Meet")
 * - Tabla de candidatos con buscador, filtro por puesto y estado
 * - Acciones por fila: Revocar Token, Ver Respuestas (Modal), Copiar para Análisis
 *   con IA (Markdown estructurado para LLM) y Exportación CSV completa.
 */

import { SUPABASE_CONFIG, isSupabaseConfigured, getSupabaseClient } from './config.js';
import { getQuestionsForRole, normalizeRole } from './questions.js';

const state = {
    isDemoMode: !isSupabaseConfigured(),
    user: null,
    evaluations: [],
    lastGeneratedToken: '',
    lastGeneratedUrl: '',
    activeModalRecord: null
};

const dom = {
    configBanner: document.getElementById('admin-config-banner'),
    adminUserBar: document.getElementById('admin-user-bar'),
    adminUserEmail: document.getElementById('admin-user-email'),
    btnLogout: document.getElementById('btn-logout'),

    viewLogin: document.getElementById('view-admin-login'),
    viewDashboard: document.getElementById('view-admin-dashboard'),
    formLogin: document.getElementById('form-admin-login'),
    loginEmail: document.getElementById('login-email'),
    loginPassword: document.getElementById('login-password'),
    loginErrorBox: document.getElementById('login-error-box'),
    btnLoginSubmit: document.getElementById('btn-login-submit'),

    kpiTotal: document.getElementById('kpi-total'),
    kpiPending: document.getElementById('kpi-pending'),
    kpiInProgress: document.getElementById('kpi-in-progress'),
    kpiCompleted: document.getElementById('kpi-completed'),

    formGenerateToken: document.getElementById('form-generate-token'),
    genCandidateName: document.getElementById('gen-candidate-name'),
    genBaseLocation: document.getElementById('gen-base-location'),
    genRole: document.getElementById('gen-role'),
    btnGenerateToken: document.getElementById('btn-generate-token'),
    generatedTokenResult: document.getElementById('generated-token-result'),
    resTokenCode: document.getElementById('res-token-code'),
    resTokenRole: document.getElementById('res-token-role'),
    resTokenCandidate: document.getElementById('res-token-candidate'),
    resTokenUrl: document.getElementById('res-token-url'),
    btnCopyOnlyToken: document.getElementById('btn-copy-only-token'),
    btnCopyMeetLink: document.getElementById('btn-copy-meet-link'),

    filterSearch: document.getElementById('filter-search'),
    filterRole: document.getElementById('filter-role'),
    filterStatus: document.getElementById('filter-status'),
    btnRefreshTable: document.getElementById('btn-refresh-table'),
    btnExportCsv: document.getElementById('btn-export-csv'),
    tableBody: document.getElementById('candidates-table-body'),
    tableEmptyState: document.getElementById('table-empty-state'),

    modalAnswers: document.getElementById('modal-answers'),
    modalCandidateName: document.getElementById('modal-candidate-name'),
    modalRoleBadge: document.getElementById('modal-role-badge'),
    modalStatusBadge: document.getElementById('modal-status-badge'),
    modalCandidateMeta: document.getElementById('modal-candidate-meta'),
    modalAnswersBody: document.getElementById('modal-answers-body'),
    btnModalCopyAi: document.getElementById('btn-modal-copy-ai'),
    btnCloseModal: document.getElementById('btn-close-modal'),

    toast: document.getElementById('admin-toast'),
    toastText: document.getElementById('admin-toast-text')
};

// ============================================================================
// INICIALIZACIÓN
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
    bindEvents();

    if (state.isDemoMode) {
        dom.configBanner.classList.remove('hidden');
        seedDemoEvaluationsIfEmpty();
        return;
    }

    await checkExistingSession();
});

function bindEvents() {
    dom.formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleAdminLogin();
    });

    dom.btnLogout.addEventListener('click', async () => {
        await handleAdminLogout();
    });

    dom.formGenerateToken.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleGenerateToken();
    });

    dom.btnCopyOnlyToken.addEventListener('click', () => {
        if (!state.lastGeneratedToken) return;
        copyToClipboard(state.lastGeneratedToken, `Token ${state.lastGeneratedToken} copiado`);
    });

    dom.btnCopyMeetLink.addEventListener('click', () => {
        if (!state.lastGeneratedUrl) return;
        copyToClipboard(state.lastGeneratedUrl, 'Enlace directo para Google Meet copiado');
    });

    dom.filterSearch.addEventListener('input', () => renderTableAndKpis());
    dom.filterRole.addEventListener('change', () => renderTableAndKpis());
    dom.filterStatus.addEventListener('change', () => renderTableAndKpis());

    dom.btnRefreshTable.addEventListener('click', async () => {
        await loadEvaluations();
        showToast('Datos actualizados');
    });

    dom.btnExportCsv.addEventListener('click', () => {
        exportEvaluationsToCsv();
    });

    dom.btnCloseModal.addEventListener('click', () => {
        dom.modalAnswers.classList.add('hidden');
    });

    dom.modalAnswers.addEventListener('click', (e) => {
        if (e.target === dom.modalAnswers) {
            dom.modalAnswers.classList.add('hidden');
        }
    });

    dom.btnModalCopyAi.addEventListener('click', () => {
        if (!state.activeModalRecord) return;
        copyAiAnalysisPrompt(state.activeModalRecord);
    });
}

// ============================================================================
// AUTENTICACIÓN (SUPABASE AUTH)
// ============================================================================
async function checkExistingSession() {
    try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (data && data.session && data.session.user) {
            enterAdminDashboard(data.session.user);
        }
    } catch (err) {
        console.warn('[TAB Scout Admin] No hay sesión activa:', err);
    }
}

async function handleAdminLogin() {
    dom.loginErrorBox.classList.add('hidden');
    const email = dom.loginEmail.value.trim();
    const password = dom.loginPassword.value;

    if (!email || !password) return;

    dom.btnLoginSubmit.disabled = true;
    dom.btnLoginSubmit.querySelector('span').textContent = 'Autenticando...';

    try {
        if (state.isDemoMode) {
            enterAdminDashboard({ email: email || 'demo.admin@gho.com.mx', id: 'demo-uid' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            throw new Error(error.message || 'Credenciales inválidas. Verifica correo y contraseña.');
        }

        if (data && data.user) {
            await enterAdminDashboard(data.user);
        }
    } catch (err) {
        dom.loginErrorBox.textContent = err.message;
        dom.loginErrorBox.classList.remove('hidden');
    } finally {
        dom.btnLoginSubmit.disabled = false;
        dom.btnLoginSubmit.querySelector('span').textContent = 'Iniciar Sesión';
    }
}

async function handleAdminLogout() {
    if (!state.isDemoMode) {
        const supabase = getSupabaseClient();
        await supabase.auth.signOut();
    }
    state.user = null;
    dom.adminUserBar.classList.add('hidden');
    dom.adminUserBar.classList.remove('flex');
    dom.viewDashboard.classList.add('hidden');
    dom.viewLogin.classList.remove('hidden');
}

async function enterAdminDashboard(user) {
    state.user = user;
    dom.adminUserEmail.textContent = user.email;
    dom.adminUserBar.classList.remove('hidden');
    dom.adminUserBar.classList.add('flex');

    dom.viewLogin.classList.add('hidden');
    dom.viewDashboard.classList.remove('hidden');

    await loadEvaluations();
}

// ============================================================================
// CARGA DE EVALUACIONES Y GENERACIÓN DE TOKENS
// ============================================================================
async function loadEvaluations() {
    try {
        if (state.isDemoMode) {
            const raw = localStorage.getItem('tab_scout_admin_demo_list');
            state.evaluations = raw ? JSON.parse(raw) : [];
            renderTableAndKpis();
            return;
        }

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('scout_evaluations')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        state.evaluations = Array.isArray(data) ? data : [];
        renderTableAndKpis();
    } catch (err) {
        console.error('[TAB Scout Admin] Error cargando evaluaciones:', err);
        showToast('Error al cargar evaluaciones desde Supabase');
    }
}

/**
 * Genera un token único legible en formato GHO-XXXX-XXXX (alfanumérico sin caracteres ambiguos)
 */
function createReadableToken() {
    const prefix = SUPABASE_CONFIG.TOKEN_PREFIX || 'GHO';
    const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    const block = (len) => {
        let out = '';
        const randomValues = new Uint32Array(len);
        window.crypto.getRandomValues(randomValues);
        for (let i = 0; i < len; i++) {
            out += alphabet[randomValues[i] % alphabet.length];
        }
        return out;
    };
    return `${prefix}-${block(4)}-${block(4)}`;
}

function buildDirectCandidateUrl(token) {
    const baseUrl = new URL('./index.html', window.location.href);
    baseUrl.searchParams.set('token', token);
    return baseUrl.toString();
}

async function handleGenerateToken() {
    const candidateName = dom.genCandidateName.value.trim();
    const baseLocation = dom.genBaseLocation.value.trim();
    const role = normalizeRole(dom.genRole.value);

    if (!candidateName || !baseLocation) return;

    dom.btnGenerateToken.disabled = true;
    const token = createReadableToken();

    try {
        if (state.isDemoMode) {
            const newRecord = {
                id: crypto.randomUUID(),
                token,
                candidate_name: candidateName,
                base_location: baseLocation,
                role,
                status: 'pending',
                answers: {},
                current_step: 0,
                elapsed_seconds: 0,
                created_at: new Date().toISOString(),
                started_at: null,
                completed_at: null
            };
            state.evaluations.unshift(newRecord);
            localStorage.setItem('tab_scout_admin_demo_list', JSON.stringify(state.evaluations));
        } else {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('scout_evaluations')
                .insert([
                    {
                        token,
                        candidate_name: candidateName,
                        base_location: baseLocation,
                        role,
                        status: 'pending',
                        answers: {},
                        created_by: state.user ? state.user.id : null
                    }
                ])
                .select()
                .single();

            if (error) throw error;
            if (data) {
                state.evaluations.unshift(data);
            }
        }

        // Mostrar tarjeta del token recién generado
        const directUrl = buildDirectCandidateUrl(token);
        state.lastGeneratedToken = token;
        state.lastGeneratedUrl = directUrl;

        dom.resTokenCode.textContent = token;
        dom.resTokenCandidate.textContent = `• ${candidateName} (${baseLocation})`;
        dom.resTokenUrl.textContent = directUrl;
        applyRoleBadge(dom.resTokenRole, role);
        dom.generatedTokenResult.classList.remove('hidden');

        // Limpiar inputs de nombre
        dom.genCandidateName.value = '';
        renderTableAndKpis();
        showToast(`Acceso ${token} generado exitosamente`);
    } catch (err) {
        console.error('[TAB Scout Admin] Error generando token:', err);
        alert(err.message || 'No se pudo crear el token en la base de datos.');
    } finally {
        dom.btnGenerateToken.disabled = false;
    }
}

// ============================================================================
// RENDERIZADO DE KPIS Y TABLA DE CANDIDATOS
// ============================================================================
function renderTableAndKpis() {
    // 1. Actualizar KPIs globales
    const total = state.evaluations.length;
    const pending = state.evaluations.filter((e) => e.status === 'pending').length;
    const inProgress = state.evaluations.filter((e) => e.status === 'in_progress').length;
    const completed = state.evaluations.filter((e) => e.status === 'completed').length;

    dom.kpiTotal.textContent = String(total);
    dom.kpiPending.textContent = String(pending);
    dom.kpiInProgress.textContent = String(inProgress);
    dom.kpiCompleted.textContent = String(completed);

    // 2. Aplicar filtros de búsqueda, puesto y estado
    const search = dom.filterSearch.value.trim().toLowerCase();
    const roleFilter = dom.filterRole.value;
    const statusFilter = dom.filterStatus.value;

    const filtered = state.evaluations.filter((item) => {
        const matchesSearch =
            !search ||
            (item.candidate_name || '').toLowerCase().includes(search) ||
            (item.token || '').toLowerCase().includes(search) ||
            (item.base_location || '').toLowerCase().includes(search);

        const matchesRole = roleFilter === 'ALL' || normalizeRole(item.role) === roleFilter;
        const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;

        return matchesSearch && matchesRole && matchesStatus;
    });

    dom.tableBody.innerHTML = '';

    if (filtered.length === 0) {
        dom.tableEmptyState.classList.remove('hidden');
        return;
    }

    dom.tableEmptyState.classList.add('hidden');

    filtered.forEach((record) => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50/90 transition';

        const answeredCount = countAnsweredInRecord(record);
        const directLink = buildDirectCandidateUrl(record.token);
        const canRevoke = record.status === 'pending' || record.status === 'in_progress';

        tr.innerHTML = `
            <td class="py-3.5 px-4">
                <div class="font-bold text-[#1E293B]">${escapeHtml(record.candidate_name)}</div>
                <div class="text-xs text-[#64748B] mt-0.5 flex items-center gap-1.5">
                    <span>Base: <strong class="font-semibold text-[#475569]">${escapeHtml(record.base_location)}</strong></span>
                </div>
            </td>
            <td class="py-3.5 px-4">
                <div class="flex items-center gap-1.5">
                    <span class="font-mono font-bold text-xs sm:text-sm text-[#0F172A] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                        ${escapeHtml(record.token)}
                    </span>
                    <button
                        type="button"
                        data-action="copy-link"
                        data-link="${escapeHtml(directLink)}"
                        class="p-1.5 rounded-md text-[#64748B] hover:text-[#2563EB] hover:bg-blue-50 transition"
                        title="Copiar Link Directo para Meet"
                    >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"/>
                        </svg>
                    </button>
                </div>
            </td>
            <td class="py-3.5 px-4">
                ${renderRoleBadgeHtml(record.role)}
            </td>
            <td class="py-3.5 px-4">
                <div class="flex flex-col items-start gap-1">
                    ${renderStatusBadgeHtml(record.status)}
                    <span class="text-[11px] text-[#64748B] font-medium">
                        ${answeredCount}/30 respuestas ${record.elapsed_seconds ? `• ${formatDuration(record.elapsed_seconds)}` : ''}
                    </span>
                </div>
            </td>
            <td class="py-3.5 px-4 text-xs text-[#64748B]">
                <div><span class="font-medium text-[#475569]">Creado:</span> ${formatDateTime(record.created_at)}</div>
                <div class="mt-0.5">
                    <span class="font-medium text-[#475569]">Finalizado:</span>
                    ${record.completed_at ? `<span class="text-emerald-700 font-semibold">${formatDateTime(record.completed_at)}</span>` : '—'}
                </div>
            </td>
            <td class="py-3.5 px-4 text-right">
                <div class="inline-flex items-center justify-end gap-1.5 flex-wrap">
                    <button
                        type="button"
                        data-action="view-answers"
                        data-id="${escapeHtml(record.id)}"
                        class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-50 text-xs font-semibold text-[#1E293B] transition"
                        title="Leer cuestionario completo"
                    >
                        <span>Ver Respuestas</span>
                    </button>

                    <button
                        type="button"
                        data-action="copy-ai"
                        data-id="${escapeHtml(record.id)}"
                        class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-semibold text-white transition"
                        title="Copiar Markdown estructurado para perfilamiento de riesgo con IA"
                    >
                        <span>Copiar para Análisis con IA</span>
                    </button>

                    ${
                        canRevoke
                            ? `<button
                                type="button"
                                data-action="revoke-token"
                                data-id="${escapeHtml(record.id)}"
                                class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-semibold text-red-700 transition"
                                title="Invalidar inmediatamente este token"
                            >
                                <span>Revocar Token</span>
                            </button>`
                            : ''
                    }
                </div>
            </td>
        `;

        // Eventos por fila
        tr.querySelectorAll('button[data-action]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const action = btn.getAttribute('data-action');
                if (action === 'copy-link') {
                    copyToClipboard(btn.getAttribute('data-link'), 'Link directo para Meet copiado');
                } else if (action === 'view-answers') {
                    openAnswersModal(record);
                } else if (action === 'copy-ai') {
                    copyAiAnalysisPrompt(record);
                } else if (action === 'revoke-token') {
                    handleRevokeToken(record);
                }
            });
        });

        dom.tableBody.appendChild(tr);
    });
}

// ============================================================================
// ACCIÓN: REVOCAR TOKEN
// ============================================================================
async function handleRevokeToken(record) {
    const confirmed = window.confirm(
        `¿Estás seguro de revocar inmediatamente el token ${record.token} de ${record.candidate_name}?\n\nEl candidato ya no podrá acceder ni enviar respuestas.`
    );
    if (!confirmed) return;

    try {
        if (state.isDemoMode) {
            record.status = 'revoked';
            localStorage.setItem('tab_scout_admin_demo_list', JSON.stringify(state.evaluations));
        } else {
            const supabase = getSupabaseClient();
            const { error } = await supabase
                .from('scout_evaluations')
                .update({ status: 'revoked' })
                .eq('id', record.id);

            if (error) throw error;
            record.status = 'revoked';
        }

        renderTableAndKpis();
        showToast(`Token ${record.token} revocado`);
    } catch (err) {
        console.error('[TAB Scout Admin] Error revocando token:', err);
        alert(err.message || 'No fue posible revocar el token.');
    }
}

// ============================================================================
// ACCIÓN: MODAL VISOR DE RESPUESTAS
// ============================================================================
function openAnswersModal(record) {
    state.activeModalRecord = record;

    dom.modalCandidateName.textContent = record.candidate_name;
    applyRoleBadge(dom.modalRoleBadge, record.role);
    dom.modalStatusBadge.outerHTML = renderStatusBadgeHtml(record.status, 'modal-status-badge');
    dom.modalStatusBadge = document.getElementById('modal-status-badge');

    const durationStr = calculateRecordDurationText(record);
    dom.modalCandidateMeta.textContent = `Base: ${record.base_location} • Token: ${record.token} • Duración: ${durationStr}`;

    const questions = getQuestionsForRole(record.role);
    const answers = record.answers || {};

    dom.modalAnswersBody.innerHTML = '';

    let currentSection = '';
    questions.forEach((q) => {
        if (q.sectionAdminTitle !== currentSection) {
            currentSection = q.sectionAdminTitle;
            const sectionHeader = document.createElement('div');
            sectionHeader.className = 'pt-3 pb-1 border-b border-[#CBD5E1]';
            sectionHeader.innerHTML = `
                <h4 class="text-xs font-extrabold uppercase tracking-wider text-[#2563EB]">
                    ${escapeHtml(currentSection)}
                </h4>
            `;
            dom.modalAnswersBody.appendChild(sectionHeader);
        }

        const rawAnswer = answers[q.key];
        const hasAnswer = typeof rawAnswer === 'string' && rawAnswer.trim().length > 0;

        const card = document.createElement('div');
        card.className = 'saas-card p-4';
        card.innerHTML = `
            <div class="flex items-center justify-between gap-2 mb-1.5">
                <span class="text-xs font-bold text-[#0F172A]">Pregunta ${q.stepNumber} de 30</span>
                <span class="text-[11px] font-mono text-[#64748B]">ID Banco #${q.id}</span>
            </div>
            <p class="text-xs sm:text-sm font-semibold text-[#1E293B] mb-2.5">${escapeHtml(q.text)}</p>
            <div class="p-3 rounded-lg ${hasAnswer ? 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#1E293B]' : 'bg-amber-50/60 border border-amber-200/80 text-amber-800 italic'} text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">${hasAnswer ? escapeHtml(rawAnswer) : 'Sin respuesta registrada.'}</div>
        `;
        dom.modalAnswersBody.appendChild(card);
    });

    dom.modalAnswers.classList.remove('hidden');
}

// ============================================================================
// ACCIÓN: COPIAR PARA ANÁLISIS CON IA (MARKDOWN ESTRUCTURADO PARA LLM)
// ============================================================================
function copyAiAnalysisPrompt(record) {
    const questions = getQuestionsForRole(record.role);
    const answers = record.answers || {};
    const durationText = calculateRecordDurationText(record);
    const answeredCount = countAnsweredInRecord(record);

    const lines = [
        `# EVALUACIÓN CONDUCTUAL Y TÉCNICA — TECNOLOGÍA A BORDO (TAB)`,
        ``,
        `## 1. FICHA DEL CANDIDATO`,
        `- **Nombre del Candidato:** ${record.candidate_name}`,
        `- **Puesto al que aplica:** ${normalizeRole(record.role)}`,
        `- **Base / Ubicación:** ${record.base_location}`,
        `- **Token de Evaluación:** \`${record.token}\``,
        `- **Estado:** ${record.status.toUpperCase()} (${answeredCount}/30 preguntas respondidas)`,
        `- **Tiempo empleado:** ${durationText}`,
        `- **Fecha de Creación:** ${formatDateTime(record.created_at)}`,
        `- **Fecha de Finalización:** ${record.completed_at ? formatDateTime(record.completed_at) : 'En curso / No finalizado'}`,
        ``,
        `## 2. INSTRUCCIÓN SUGERIDA PARA EL ANALISTA IA (LLM)`,
        `> Analiza las siguientes 30 respuestas del candidato para el puesto de **${normalizeRole(record.role)}** en el área de Tecnología a Bordo (telemetría, boleteras, CCTV, GPS y operación en bases de autobuses).`,
        `> Identifica: (1) Nivel de apego a normas y procedimientos, (2) Consistencia o contradicciones entre el Módulo 1 y el Módulo 5 de Validación y Contraste, (3) Competencia técnica/operativa real según su rol, (4) Alertas tempranas o focos rojos (Red Flags) de rotación, conflicto o deshonestidad, y (5) Recomendación de contratación con preguntas clave de seguimiento para la entrevista.`,
        ``,
        `---`,
        ``
    ];

    let currentSection = '';
    questions.forEach((q) => {
        if (q.sectionAdminTitle !== currentSection) {
            currentSection = q.sectionAdminTitle;
            lines.push(`## ${currentSection.toUpperCase()}`);
            lines.push(``);
        }

        const ans = (answers[q.key] || '').trim() || '[SIN RESPUESTA]';
        lines.push(`### Pregunta ${q.stepNumber} (Reactivo #${q.id})`);
        lines.push(`**Pregunta:** ${q.text}`);
        lines.push(`**Respuesta del candidato:**`);
        lines.push(`${ans}`);
        lines.push(``);
    });

    const markdownOutput = lines.join('\n');
    copyToClipboard(
        markdownOutput,
        `Reporte Markdown de ${record.candidate_name} copiado para análisis con IA`
    );
}

// ============================================================================
// ACCIÓN: EXPORTAR BASE DE DATOS A CSV
// ============================================================================
function exportEvaluationsToCsv() {
    if (!state.evaluations.length) {
        showToast('No hay registros para exportar');
        return;
    }

    // Cabeceras: metadatos + las 50 preguntas del banco oficial (q_1..q_50)
    const headers = [
        'ID',
        'Token',
        'Candidato',
        'Base',
        'Puesto',
        'Estado',
        'Respuestas_Completadas',
        'Tiempo_Segundos',
        'Tiempo_Formateado',
        'Fecha_Creacion',
        'Fecha_Inicio',
        'Fecha_Finalizacion'
    ];

    for (let i = 1; i <= 50; i++) {
        headers.push(`Q_${i}`);
    }

    const escapeCsvCell = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
    };

    const rows = state.evaluations.map((rec) => {
        const ans = rec.answers || {};
        const baseCols = [
            rec.id,
            rec.token,
            rec.candidate_name,
            rec.base_location,
            normalizeRole(rec.role),
            rec.status,
            countAnsweredInRecord(rec),
            rec.elapsed_seconds || 0,
            calculateRecordDurationText(rec),
            rec.created_at || '',
            rec.started_at || '',
            rec.completed_at || ''
        ];

        for (let i = 1; i <= 50; i++) {
            baseCols.push(ans[`q_${i}`] || '');
        }

        return baseCols.map(escapeCsvCell).join(',');
    });

    // BOM UTF-8 para que Excel abra acentos y eñes correctamente
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `TAB_Scout_Evaluaciones_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Archivo CSV descargado');
}

// ============================================================================
// UTILIDADES DE FORMATO Y HELPERS
// ============================================================================
function countAnsweredInRecord(record) {
    if (!record || !record.answers || typeof record.answers !== 'object') return 0;
    return Object.entries(record.answers).filter(
        ([k, v]) => k.startsWith('q_') && typeof v === 'string' && v.trim().length > 0
    ).length;
}

function calculateRecordDurationText(record) {
    if (record.elapsed_seconds && record.elapsed_seconds > 0) {
        return formatDuration(record.elapsed_seconds);
    }
    if (record.started_at && record.completed_at) {
        const diffSec = Math.max(
            1,
            Math.round((new Date(record.completed_at) - new Date(record.started_at)) / 1000)
        );
        return formatDuration(diffSec);
    }
    return 'No registrado';
}

function formatDuration(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins} min ${secs}s`;
}

function formatDateTime(isoString) {
    if (!isoString) return '—';
    try {
        const d = new Date(isoString);
        return d.toLocaleString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return isoString;
    }
}

function renderStatusBadgeHtml(status, idAttr = '') {
    const idPart = idAttr ? `id="${idAttr}"` : '';
    switch (status) {
        case 'completed':
            return `<span ${idPart} class="status-pill status-completed"><span class="status-dot"></span>COMPLETADO</span>`;
        case 'in_progress':
            return `<span ${idPart} class="status-pill status-in_progress"><span class="status-dot"></span>EN PROGRESO</span>`;
        case 'revoked':
            return `<span ${idPart} class="status-pill status-revoked"><span class="status-dot"></span>EXPIRADO</span>`;
        default:
            return `<span ${idPart} class="status-pill status-pending"><span class="status-dot"></span>PENDIENTE</span>`;
    }
}

function renderRoleBadgeHtml(role) {
    const norm = normalizeRole(role);
    if (norm === 'Coordinador') {
        return `<span class="role-pill role-coordinador">COORDINADOR</span>`;
    }
    if (norm === 'Auxiliar') {
        return `<span class="role-pill role-auxiliar">AUXILIAR</span>`;
    }
    return `<span class="role-pill role-tecnico">TÉCNICO</span>`;
}

function applyRoleBadge(element, role) {
    const norm = normalizeRole(role);
    element.className = 'role-pill';
    if (norm === 'Coordinador') {
        element.classList.add('role-coordinador');
        element.textContent = 'COORDINADOR';
    } else if (norm === 'Auxiliar') {
        element.classList.add('role-auxiliar');
        element.textContent = 'AUXILIAR';
    } else {
        element.classList.add('role-tecnico');
        element.textContent = 'TÉCNICO';
    }
}

async function copyToClipboard(text, toastMsg) {
    try {
        await navigator.clipboard.writeText(text);
        showToast(toastMsg || 'Copiado al portapapeles');
    } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast(toastMsg || 'Copiado al portapapeles');
    }
}

let toastTimeout = null;
function showToast(message) {
    dom.toastText.textContent = message;
    dom.toast.classList.remove('hidden');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        dom.toast.classList.add('hidden');
    }, 3000);
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Datos semilla para Modo Demo cuando Supabase aún no está configurado
 */
function seedDemoEvaluationsIfEmpty() {
    if (localStorage.getItem('tab_scout_admin_demo_list')) return;
    const now = Date.now();
    const demoSeed = [
        {
            id: 'demo-1',
            token: 'GHO-8F4A-92C1',
            candidate_name: 'Miguel Ángel Torres Vega',
            base_location: 'Guadalajara',
            role: 'Técnico',
            status: 'completed',
            elapsed_seconds: 1045,
            created_at: new Date(now - 7200 * 1000).toISOString(),
            started_at: new Date(now - 5400 * 1000).toISOString(),
            completed_at: new Date(now - 4355 * 1000).toISOString(),
            answers: {
                q_1: 'Busco estabilidad y crecimiento técnico en sistemas de telemetría y CCTV de transporte de pasajeros.',
                q_2: 'En un taller anterior había poca comunicación entre turnos; implementé una bitácora fotográfica por unidad.',
                q_3: 'Una política de no retirar unidades a mantenimiento preventivo en temporada alta; la respeté programando revisiones nocturnas.',
                q_4: 'Conecté invertido un arnés de cámara auxiliar; lo reporté de inmediato a mi coordinador y reemplacé el fusible.',
                q_5: 'Clasifico por impacto en salida de autobús: primero unidades por salir a ruta, luego correctivos en patio.',
                q_6: 'Diría que a veces soy demasiado meticuloso con el peinado de cableado antes de cerrar tableros.',
                q_7: 'Solo una emergencia médica o familiar grave, avisando con anticipación al coordinador de turno.',
                q_8: 'Escucho los puntos técnicos, pido ver la evidencia del fallo y ajusto mi procedimiento.',
                q_9: 'Revisión de pendientes del turno nocturno, diagnóstico de unidades en fosa y cierre con inventario de refacciones.',
                q_10: 'Me frustra que no dejen documentado qué cables o fusibles revisaron; lo sobrellevo pidiendo checklist de entrega.',
                q_21: 'Un DVR se reiniciaba solo cuando el autobús frenaba; descubrí que el cable de ignición hacía falso contacto con el pedal.',
                q_22: 'Busco asegurar la operatividad sin improvisar empalmes riesgosos y solicito préstamo o envío urgente entre bases.',
                q_23: 'Con calma le explico que la revisión toma 5 minutos más y que salir con la boletera fallando le afectará en su liquidación.',
                q_24: 'Primero mido voltaje en batería y fusible, luego continuidad en arnés de alimentación y finalmente consumo de la tarjeta.',
                q_25: 'Dañé la punta de un multímetro midiendo amperaje; lo reporté y repuse el fusible cerámico interno.',
                q_26: 'Leo los manuales técnicos del fabricante y reviso diagramas de pinout antes de intervenir.',
                q_27: 'Le muestro técnicamente dónde rozará el arnés o cuánto calor recibe para elegir juntos una ubicación segura.',
                q_28: 'Prefiero 10 problemas rutinarios bien resueltos para mantener la flota operando, aunque disfruto los diagnósticos complejos.',
                q_29: 'Registro número económico de autobús, falla reportada, pruebas realizadas, pieza cambiada y serie.',
                q_30: 'Con una falla de protocolo CAN-Bus en un modelo nuevo; pedí apoyo al especialista del proveedor y tomé notas.',
                q_41: 'En una temporada navideña con 8 autobuses detenidos; aprendí a escalar a tiempo cuando la carga supera el turno.',
                q_42: 'Diferimos sobre reutilizar un disco duro con sectores dañados; propuse hacer prueba SMART para demostrar el riesgo.',
                q_43: 'Hablo primero con él para que lo reporte y, si compromete la seguridad o equipos de la empresa, informo a coordinación.',
                q_44: 'En electricidad y telemetría automotriz las reglas y diagramas deben seguirse al 100% porque un atajo provoca cortos.',
                q_45: 'Usé un regulador equivalente de otra marca autorizada para no detener una corrida nocturna, documentándolo en bitácora.',
                q_46: 'Solo si las condiciones acordadas en contratación fueran totalmente distintas a la realidad operativa.',
                q_47: 'Cuando se nos descontó una herramienta extraviada por otro turno sin bitácora de resguardo.',
                q_48: 'Muestro mi bitácora firmada con horas, números económicos intervenidos y fotografías del cierre de mi trabajo.',
                q_49: 'Configuración avanzada de servidores Linux remotos; prefiero apoyarme en el área de TI/Sistemas.',
                q_50: 'Me gustaría agregar mi disponibilidad para viajar a apoyar otras bases cuando hay despliegues masivos.'
            }
        },
        {
            id: 'demo-2',
            token: 'GHO-3K9P-71W4',
            candidate_name: 'Laura Patricia Gómez',
            base_location: 'Morelia',
            role: 'Coordinador',
            status: 'in_progress',
            elapsed_seconds: 420,
            created_at: new Date(now - 1800 * 1000).toISOString(),
            started_at: new Date(now - 900 * 1000).toISOString(),
            completed_at: null,
            answers: {
                q_1: 'Me motiva liderar equipos técnicos de alto desempeño en operación de transporte.',
                q_2: 'Cuando recibí una base con alto rezago de órdenes de servicio y rotación de técnicos.'
            }
        },
        {
            id: 'demo-3',
            token: 'GHO-5M2X-88R9',
            candidate_name: 'Jorge Alberto Nava',
            base_location: 'Atlacomulco',
            role: 'Auxiliar',
            status: 'pending',
            elapsed_seconds: 0,
            created_at: new Date(now - 600 * 1000).toISOString(),
            started_at: null,
            completed_at: null,
            answers: {}
        }
    ];
    localStorage.setItem('tab_scout_admin_demo_list', JSON.stringify(demoSeed));
}


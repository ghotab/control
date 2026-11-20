/**
 * TAB SCOUT — Lógica de la Consola de Administración (`admin.html`)
 * ---------------------------------------------------------------------------
 * - Autenticación mediante Supabase Auth (Email y Contraseña)
 * - Dashboard de KPIs estilo telemetría (Total, Pendientes, En Progreso, Completadas)
 * - Generador de Tokens de un solo uso (`GHO-XXXX-XXXX`) con botones de copiado
 *   rápido ("Copiar solo Token" y "Copiar Link Directo para Meet")
 * - Tabla de candidatos con buscador, filtro por puesto y estado
 * - Acciones por fila:
 *     1) Ver / Descargar CV (PDF) mediante URL firmada temporal (`createSignedUrl`)
 *     2) Ver Respuestas (Modal con soporte híbrido: Choice, Slider y Text)
 *     3) Copiar para Análisis con IA (Markdown estructurado para LLM con los 3 tipos)
 *     4) Revocar Token
 *     5) Exportación CSV completa
 */

import { SUPABASE_CONFIG, isSupabaseConfigured, getSupabaseClient } from './config.js';
import { getQuestionsForRole, normalizeRole, formatAnswerForDisplay } from './questions.js';

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
    btnModalViewCv: document.getElementById('btn-modal-view-cv'),
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

    if (dom.btnModalViewCv) {
        dom.btnModalViewCv.addEventListener('click', () => {
            if (!state.activeModalRecord || !state.activeModalRecord.cv_path) return;
            handleOpenSignedCvUrl(state.activeModalRecord);
        });
    }

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
                cv_path: null,
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

        const directUrl = buildDirectCandidateUrl(token);
        state.lastGeneratedToken = token;
        state.lastGeneratedUrl = directUrl;

        dom.resTokenCode.textContent = token;
        dom.resTokenCandidate.textContent = `• ${candidateName} (${baseLocation})`;
        dom.resTokenUrl.textContent = directUrl;
        applyRoleBadge(dom.resTokenRole, role);
        dom.generatedTokenResult.classList.remove('hidden');

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
    const total = state.evaluations.length;
    const pending = state.evaluations.filter((e) => e.status === 'pending').length;
    const inProgress = state.evaluations.filter((e) => e.status === 'in_progress').length;
    const completed = state.evaluations.filter((e) => e.status === 'completed').length;

    dom.kpiTotal.textContent = String(total);
    dom.kpiPending.textContent = String(pending);
    dom.kpiInProgress.textContent = String(inProgress);
    dom.kpiCompleted.textContent = String(completed);

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

        const roleQuestions = getQuestionsForRole(record.role);
        const totalExpected = roleQuestions.length;
        const answeredCount = countAnsweredInRecord(record);
        const directLink = buildDirectCandidateUrl(record.token);
        const canRevoke = record.status === 'pending' || record.status === 'in_progress';
        const hasCv = Boolean(record.cv_path && String(record.cv_path).trim());

        tr.innerHTML = `
            <td class="py-3.5 px-4">
                <div class="font-bold text-[#1E293B]">${escapeHtml(record.candidate_name)}</div>
                <div class="text-xs text-[#64748B] mt-0.5 flex flex-wrap items-center gap-2">
                    <span>Base: <strong class="font-semibold text-[#475569]">${escapeHtml(record.base_location)}</strong></span>
                    ${
                        hasCv
                            ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">● CV PDF</span>`
                            : `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-medium">Sin CV</span>`
                    }
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
                        ${answeredCount}/${totalExpected} respuestas ${record.elapsed_seconds ? `• ${formatDuration(record.elapsed_seconds)}` : ''}
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
                    ${
                        hasCv
                            ? `<button
                                type="button"
                                data-action="view-cv"
                                data-id="${escapeHtml(record.id)}"
                                class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-emerald-800 transition"
                                title="Abrir CV en PDF en pestaña nueva"
                            >
                                <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
                                </svg>
                                <span>Ver / Descargar CV (PDF)</span>
                            </button>`
                            : ''
                    }

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

        tr.querySelectorAll('button[data-action]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const action = btn.getAttribute('data-action');
                if (action === 'copy-link') {
                    copyToClipboard(btn.getAttribute('data-link'), 'Link directo para Meet copiado');
                } else if (action === 'view-cv') {
                    handleOpenSignedCvUrl(record);
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
// ACCIÓN: ABRIR / DESCARGAR CV EN PDF (SUPABASE STORAGE SIGNED URL)
// ============================================================================
async function handleOpenSignedCvUrl(record) {
    if (!record || !record.cv_path) {
        showToast('Este candidato no tiene un CV adjunto.');
        return;
    }

    try {
        if (state.isDemoMode) {
            showToast(`Modo Demo: Simulando apertura de ${record.cv_path}`);
            return;
        }

        showToast('Generando enlace seguro de CV...');
        const supabase = getSupabaseClient();
        const bucket = SUPABASE_CONFIG.CV_BUCKET || 'candidate-cvs';

        const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUrl(record.cv_path, 3600); // URL firmada válida por 1 hora

        if (error || !data || !data.signedUrl) {
            throw new Error((error && error.message) || 'No se pudo generar la URL firmada del CV.');
        }

        window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
        console.error('[TAB Scout Admin] Error abriendo CV firmado:', err);
        alert(err.message || 'No fue posible abrir el archivo PDF del candidato.');
    }
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
// ACCIÓN: MODAL VISOR DE RESPUESTAS HÍBRIDAS (CHOICE / SLIDER / TEXT)
// ============================================================================
function openAnswersModal(record) {
    state.activeModalRecord = record;

    dom.modalCandidateName.textContent = record.candidate_name;
    applyRoleBadge(dom.modalRoleBadge, record.role);
    dom.modalStatusBadge.outerHTML = renderStatusBadgeHtml(record.status, 'modal-status-badge');
    dom.modalStatusBadge = document.getElementById('modal-status-badge');

    const durationStr = calculateRecordDurationText(record);
    const hasCv = Boolean(record.cv_path && String(record.cv_path).trim());
    dom.modalCandidateMeta.textContent = `Base: ${record.base_location} • Token: ${record.token} • Duración: ${durationStr} • CV: ${hasCv ? 'Adjunto (PDF)' : 'No adjunto'}`;

    if (dom.btnModalViewCv) {
        if (hasCv) {
            dom.btnModalViewCv.classList.remove('hidden');
        } else {
            dom.btnModalViewCv.classList.add('hidden');
        }
    }

    const questions = getQuestionsForRole(record.role);
    const totalQ = questions.length;
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

        const formatted = formatAnswerForDisplay(q, answers[q.key]);

        let typeBadgeHtml = `<span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-50 text-[#2563EB] border border-blue-200">Texto Libre</span>`;
        if (q.type === 'choice') {
            typeBadgeHtml = `<span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">Elección Forzada</span>`;
        } else if (q.type === 'slider') {
            typeBadgeHtml = `<span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Escala 1-10</span>`;
        }

        let answerBodyHtml = '';
        if (!formatted.hasAnswer) {
            answerBodyHtml = `<div class="p-3 rounded-lg bg-amber-50/60 border border-amber-200/80 text-amber-800 italic text-xs sm:text-sm">Sin respuesta registrada.</div>`;
        } else if (q.type === 'choice') {
            answerBodyHtml = `
                <div class="p-3.5 rounded-lg bg-indigo-50/60 border border-indigo-200 text-[#1E293B] text-xs sm:text-sm flex items-start gap-2.5">
                    <span class="px-2 py-0.5 rounded bg-[#2563EB] text-white font-bold text-xs flex-shrink-0">${escapeHtml(formatted.choiceKey || '')}</span>
                    <span class="font-medium leading-relaxed">${escapeHtml(formatted.choiceLabel || formatted.shortText)}</span>
                </div>
            `;
        } else if (q.type === 'slider') {
            answerBodyHtml = `
                <div class="p-3.5 rounded-lg bg-emerald-50/50 border border-emerald-200 text-[#1E293B] text-xs sm:text-sm space-y-1">
                    <div class="flex items-center gap-2">
                        <span class="px-2.5 py-0.5 rounded-md bg-[#0F172A] text-white font-extrabold text-sm">${escapeHtml(String(formatted.sliderValue))} / 10</span>
                        <span class="font-semibold text-emerald-900">Posición en el espectro</span>
                    </div>
                    <p class="text-[11px] text-[#64748B]">${escapeHtml(q.minLabel)}  ⟷  ${escapeHtml(q.maxLabel)}</p>
                </div>
            `;
        } else {
            answerBodyHtml = `<div class="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[#1E293B] text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">${escapeHtml(formatted.shortText)}</div>`;
        }

        const card = document.createElement('div');
        card.className = 'saas-card p-4';
        card.innerHTML = `
            <div class="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-[#0F172A]">Pregunta ${q.stepNumber} de ${totalQ}</span>
                    ${typeBadgeHtml}
                    ${q.subBlock ? `<span class="text-[10px] font-semibold text-[#64748B]">• ${escapeHtml(q.subBlock)}</span>` : ''}
                </div>
                <span class="text-[11px] font-mono text-[#64748B]">Reactivo #${q.id}</span>
            </div>
            <p class="text-xs sm:text-sm font-semibold text-[#1E293B] mb-2.5">${escapeHtml(q.text)}</p>
            ${answerBodyHtml}
        `;
        dom.modalAnswersBody.appendChild(card);
    });

    dom.modalAnswers.classList.remove('hidden');
}

// ============================================================================
// ACCIÓN: COPIAR PARA ANÁLISIS CON IA (MARKDOWN HÍBRIDO PARA LLM)
// ============================================================================
function copyAiAnalysisPrompt(record) {
    const questions = getQuestionsForRole(record.role);
    const totalQ = questions.length;
    const answers = record.answers || {};
    const durationText = calculateRecordDurationText(record);
    const answeredCount = countAnsweredInRecord(record);

    const lines = [
        `# EVALUACIÓN CONDUCTUAL, TÉCNICA Y DE TEMPERAMENTO — TECNOLOGÍA A BORDO (TAB)`,
        ``,
        `## 1. FICHA DEL CANDIDATO`,
        `- **Nombre del Candidato:** ${record.candidate_name}`,
        `- **Puesto al que aplica:** ${normalizeRole(record.role)}`,
        `- **Base / Ubicación:** ${record.base_location}`,
        `- **Token de Evaluación:** \`${record.token}\``,
        `- **CV Adjunto (PDF):** ${record.cv_path ? `Sí (${record.cv_path})` : 'No adjuntado'}`,
        `- **Estado:** ${record.status.toUpperCase()} (${answeredCount}/${totalQ} preguntas respondidas)`,
        `- **Tiempo empleado:** ${durationText}`,
        `- **Fecha de Creación:** ${formatDateTime(record.created_at)}`,
        `- **Fecha de Finalización:** ${record.completed_at ? formatDateTime(record.completed_at) : 'En curso / No finalizado'}`,
        ``,
        `## 2. INSTRUCCIÓN PARA EL ANALISTA IA (LLM DE PERFILAMIENTO DE RIESGO)`,
        `> Actúa como un Especialista Senior en Evaluación de Talento Operativo y Psicometría Laboral para el área de **Tecnología a Bordo (TAB)** (telemetría, boleteras, CCTV, GPS y operación en bases de autobuses).`,
        `> Analiza las respuestas híbridas del candidato (**${normalizeRole(record.role)}**): elecciones forzadas (A/B/C/D), posicionamiento en escalas del 1 al 10 y experiencias pasadas abiertas.`,
        `> Entrega un diagnóstico ejecutivo con:`,
        `> 1. **Apego a Normas e Integridad Operativa:** Manejo de evidencia, cumplimiento de procedimientos y respuesta ante errores propios o ajenos.`,
        `> 2. **Temperamento e Inteligencia Emocional:** Detección de perfiles volubles, pasivo-agresivos (uso de sarcasmo/ironía), ego frágil ante correcciones o perfil "quedabien" (decir que sí sin comprometerse).`,
        `> 3. **Consistencia vs. Contraste:** Contradicciones entre lo que afirma en el Módulo 1 y sus decisiones en el Módulo 5.`,
        `> 4. **Competencia en el Rol (${normalizeRole(record.role)}):** Capacidad práctica en campo/gestión.`,
        `> 5. **Semáforo de Riesgo (Verde / Ámbar / Rojo)** y 3 preguntas punzantes de seguimiento para la entrevista final.`,
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

        const formatted = formatAnswerForDisplay(q, answers[q.key]);
        const typeLabel = q.type === 'choice' ? 'ELECCIÓN FORZADA' : q.type === 'slider' ? 'ESCALA 1-10' : 'TEXTO LIBRE';

        lines.push(`### Pregunta ${q.stepNumber} de ${totalQ} [Reactivo #${q.id} • ${typeLabel}]`);
        if (q.subBlock) {
            lines.push(`*Dimensión: ${q.subBlock}*`);
        }
        lines.push(`**Pregunta:** ${q.text}`);

        if (q.type === 'choice' && Array.isArray(q.options)) {
            lines.push(`**Opciones disponibles:**`);
            q.options.forEach((opt) => {
                const isPicked = formatted.choiceKey === opt.key;
                lines.push(`- ${isPicked ? '**[SELECCIONADA]** ' : ''}${opt.key}) ${opt.label}`);
            });
            lines.push(`**Respuesta elegida:** ${formatted.aiText}`);
        } else if (q.type === 'slider') {
            lines.push(`**Extremos de la escala:** [${q.minLabel}] ⟷ [${q.maxLabel}]`);
            lines.push(`**Valor seleccionado por el candidato:** ${formatted.aiText}`);
        } else {
            lines.push(`**Respuesta del candidato:**`);
            lines.push(`${formatted.aiText}`);
        }
        lines.push(``);
    });

    const markdownOutput = lines.join('\n');
    copyToClipboard(
        markdownOutput,
        `Reporte Markdown de ${record.candidate_name} copiado para análisis con IA`
    );
}

// ============================================================================
// ACCIÓN: EXPORTAR BASE DE DATOS A CSV (55 REACTIVOS + CV_PATH)
// ============================================================================
function exportEvaluationsToCsv() {
    if (!state.evaluations.length) {
        showToast('No hay registros para exportar');
        return;
    }

    const headers = [
        'ID',
        'Token',
        'Candidato',
        'Base',
        'Puesto',
        'Estado',
        'CV_Path',
        'Respuestas_Completadas',
        'Tiempo_Segundos',
        'Tiempo_Formateado',
        'Fecha_Creacion',
        'Fecha_Inicio',
        'Fecha_Finalizacion'
    ];

    for (let i = 1; i <= 55; i++) {
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
            rec.cv_path || '',
            countAnsweredInRecord(rec),
            rec.elapsed_seconds || 0,
            calculateRecordDurationText(rec),
            rec.created_at || '',
            rec.started_at || '',
            rec.completed_at || ''
        ];

        for (let i = 1; i <= 55; i++) {
            baseCols.push(ans[`q_${i}`] || '');
        }

        return baseCols.map(escapeCsvCell).join(',');
    });

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
        ([k, v]) => k.startsWith('q_') && v !== undefined && v !== null && String(v).trim().length > 0
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
            cv_path: 'GHO-8F4A-92C1/CV_Miguel_Torres.pdf',
            elapsed_seconds: 890,
            created_at: new Date(now - 7200 * 1000).toISOString(),
            started_at: new Date(now - 5400 * 1000).toISOString(),
            completed_at: new Date(now - 4510 * 1000).toISOString(),
            answers: {
                q_1: 'Busco estabilidad y crecimiento técnico en sistemas de telemetría y CCTV de transporte de pasajeros.',
                q_2: '9',
                q_3: 'A',
                q_4: 'Conecté invertido un arnés de cámara auxiliar; lo reporté de inmediato a mi coordinador y reemplacé el fusible.',
                q_5: 'A',
                q_6: 'Diría que a veces soy demasiado meticuloso con el peinado de cableado antes de cerrar tableros.',
                q_7: '8',
                q_8: 'A',
                q_9: '9',
                q_10: 'En un taller anterior había poca comunicación entre turnos; implementé una bitácora fotográfica por unidad.',
                q_21: 'Un DVR se reiniciaba solo cuando el autobús frenaba; descubrí que el cable de ignición hacía falso contacto con el pedal.',
                q_22: 'A',
                q_23: '6',
                q_24: 'Primero mido voltaje en batería y fusible, luego continuidad en arnés de alimentación y finalmente consumo de la tarjeta.',
                q_25: 'A',
                q_26: 'Dañé la punta de un multímetro midiendo amperaje; lo reporté y repuse el fusible cerámico interno.',
                q_27: '9',
                q_28: 'A',
                q_29: 'Con una falla de protocolo CAN-Bus en un modelo nuevo; pedí apoyo al especialista del proveedor y tomé notas.',
                q_30: '9',
                q_41: 'A',
                q_42: 'A',
                q_43: '9',
                q_44: 'Me desespera que dejen herramientas tiradas o sin reportar fallas; lo hablo directo y con respeto enfocándome en el orden del turno.',
                q_45: 'A',
                q_46: 'A',
                q_47: '8',
                q_48: 'Diferimos sobre reutilizar un disco duro con sectores dañados; propuse hacer prueba SMART para demostrar el riesgo con datos.',
                q_49: 'B',
                q_50: 'A',
                q_51: 'A',
                q_52: '9',
                q_53: 'A',
                q_54: 'En una temporada alta con 8 autobuses detenidos al mismo tiempo; prioricé salidas y escalé las unidades que requerían refacción mayor.',
                q_55: 'Solo si las condiciones acordadas en contratación fueran totalmente distintas a la realidad operativa.'
            }
        }
    ];
    localStorage.setItem('tab_scout_admin_demo_list', JSON.stringify(demoSeed));
}

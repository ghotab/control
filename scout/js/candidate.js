/**
 * TAB SCOUT — Lógica del Portal del Candidato (`index.html`)
 * ---------------------------------------------------------------------------
 * - Acepta token manual o por parámetro URL (`?token=GHO-XXXX-XXXX`)
 * - Valida vía RPC `validate_token(p_token)` en Supabase
 * - Muestra bienvenida con rol en badge e instrucciones
 * - Wizard interactivo paginado de 30 preguntas (1 por pantalla)
 * - Auto-guardado parcial vía RPC `save_partial_answers` en cada avance
 * - Atajo `Ctrl + Enter` para avanzar
 * - Envío irreversible vía RPC `submit_evaluation` y bloqueo permanente
 */

import { SUPABASE_CONFIG, isSupabaseConfigured, getSupabaseClient } from './config.js';
import { getQuestionsForRole, normalizeRole } from './questions.js';

// Estado de la sesión del candidato
const state = {
    token: '',
    candidateName: '',
    baseLocation: '',
    role: 'Técnico',
    status: 'pending',
    questions: [],
    currentIndex: 0, // 0..29
    answers: {},     // { q_1: '...', q_21: '...' }
    elapsedSeconds: 0,
    timerInterval: null,
    isDemoMode: false,
    isSaving: false
};

// Referencias del DOM
const views = {
    tokenEntry: document.getElementById('view-token-entry'),
    welcome: document.getElementById('view-welcome'),
    wizard: document.getElementById('view-wizard'),
    locked: document.getElementById('view-locked')
};

const dom = {
    configBanner: document.getElementById('config-warning-banner'),
    headerTelemetryBar: document.getElementById('header-telemetry-bar'),
    headerRoleBadge: document.getElementById('header-role-badge'),
    autosaveDot: document.getElementById('autosave-dot'),
    autosaveText: document.getElementById('autosave-text'),
    sessionTimer: document.getElementById('session-timer'),

    formTokenAccess: document.getElementById('form-token-access'),
    inputToken: document.getElementById('input-token'),
    btnValidateToken: document.getElementById('btn-validate-token'),
    tokenErrorAlert: document.getElementById('token-error-alert'),
    tokenErrorMessage: document.getElementById('token-error-message'),

    welcomeCandidateName: document.getElementById('welcome-candidate-name'),
    welcomeStatusBadge: document.getElementById('welcome-status-badge'),
    welcomeRoleBadge: document.getElementById('welcome-role-badge'),
    welcomeMetaRole: document.getElementById('welcome-meta-role'),
    welcomeMetaBase: document.getElementById('welcome-meta-base'),
    welcomeMetaToken: document.getElementById('welcome-meta-token'),
    welcomeResumeBanner: document.getElementById('welcome-resume-banner'),
    welcomeResumeCount: document.getElementById('welcome-resume-count'),
    btnChangeToken: document.getElementById('btn-change-token'),
    btnStartWizard: document.getElementById('btn-start-wizard'),
    btnStartWizardLabel: document.getElementById('btn-start-wizard-label'),

    wizardStepCounter: document.getElementById('wizard-step-counter'),
    wizardSectionBadge: document.getElementById('wizard-section-badge'),
    wizardProgressPercent: document.getElementById('wizard-progress-percent'),
    wizardProgressBar: document.getElementById('wizard-progress-bar'),
    wizardCandidatePill: document.getElementById('wizard-candidate-pill'),
    wizardQuestionCard: document.getElementById('wizard-question-card'),
    questionModuleTag: document.getElementById('question-module-tag'),
    questionIdTag: document.getElementById('question-id-tag'),
    questionText: document.getElementById('question-text'),
    answerTextarea: document.getElementById('answer-textarea'),
    charFeedbackDot: document.getElementById('char-feedback-dot'),
    charFeedbackText: document.getElementById('char-feedback-text'),
    charCountNumber: document.getElementById('char-count-number'),
    answerValidationMsg: document.getElementById('answer-validation-msg'),
    btnPrevQuestion: document.getElementById('btn-prev-question'),
    btnNextQuestion: document.getElementById('btn-next-question'),
    btnNextLabel: document.getElementById('btn-next-label'),
    btnFinishEvaluation: document.getElementById('btn-finish-evaluation'),

    lockedIconWrapper: document.getElementById('locked-icon-wrapper'),
    lockedStatusPill: document.getElementById('locked-status-pill'),
    lockedTitle: document.getElementById('locked-title'),
    lockedSubtitle: document.getElementById('locked-subtitle'),

    modalConfirmSubmit: document.getElementById('modal-confirm-submit'),
    btnCancelSubmit: document.getElementById('btn-cancel-submit'),
    btnConfirmSubmit: document.getElementById('btn-confirm-submit')
};

// ============================================================================
// INICIALIZACIÓN
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    if (!isSupabaseConfigured()) {
        dom.configBanner.classList.remove('hidden');
    }

    bindEvents();

    // Revisar si viene ?token= en la URL
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken && urlToken.trim() !== '') {
        const clean = urlToken.trim().toUpperCase();
        dom.inputToken.value = clean;
        handleTokenValidation(clean);
    }
});

function bindEvents() {
    dom.formTokenAccess.addEventListener('submit', (e) => {
        e.preventDefault();
        const rawToken = dom.inputToken.value.trim().toUpperCase();
        handleTokenValidation(rawToken);
    });

    dom.btnChangeToken.addEventListener('click', () => {
        stopTimer();
        // Limpiar query param sin recargar
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        dom.inputToken.value = '';
        hideTokenError();
        switchView('tokenEntry');
    });

    dom.btnStartWizard.addEventListener('click', () => {
        startWizardSession();
    });

    dom.answerTextarea.addEventListener('input', () => {
        dom.answerValidationMsg.classList.add('hidden');
        updateCharCounter(dom.answerTextarea.value);
    });

    // Atajo de teclado Ctrl + Enter o Cmd + Enter para avanzar
    dom.answerTextarea.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (state.currentIndex < state.questions.length - 1) {
                handleNextStep();
            } else {
                handleOpenSubmitModal();
            }
        }
    });

    dom.btnPrevQuestion.addEventListener('click', () => {
        handlePreviousStep();
    });

    dom.btnNextQuestion.addEventListener('click', () => {
        handleNextStep();
    });

    dom.btnFinishEvaluation.addEventListener('click', () => {
        handleOpenSubmitModal();
    });

    dom.btnCancelSubmit.addEventListener('click', () => {
        dom.modalConfirmSubmit.classList.add('hidden');
    });

    dom.btnConfirmSubmit.addEventListener('click', () => {
        executeFinalSubmission();
    });
}

// ============================================================================
// CAMBIO DE VISTAS Y HELPERS UI
// ============================================================================
function switchView(viewKey) {
    Object.entries(views).forEach(([key, el]) => {
        if (key === viewKey) {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    });

    if (viewKey === 'wizard') {
        dom.headerTelemetryBar.classList.remove('hidden');
        dom.headerTelemetryBar.classList.add('flex');
    } else {
        dom.headerTelemetryBar.classList.add('hidden');
        dom.headerTelemetryBar.classList.remove('flex');
    }
}

function showTokenError(msg) {
    dom.tokenErrorMessage.textContent = msg;
    dom.tokenErrorAlert.classList.remove('hidden');
}

function hideTokenError() {
    dom.tokenErrorAlert.classList.add('hidden');
    dom.tokenErrorMessage.textContent = '';
}

function applyRoleBadgeStyle(element, role) {
    const normalized = normalizeRole(role);
    element.className = 'role-pill';
    if (normalized === 'Coordinador') {
        element.classList.add('role-coordinador');
        element.textContent = 'COORDINADOR';
    } else if (normalized === 'Auxiliar') {
        element.classList.add('role-auxiliar');
        element.textContent = 'AUXILIAR';
    } else {
        element.classList.add('role-tecnico');
        element.textContent = 'TÉCNICO';
    }
}

// ============================================================================
// VALIDACIÓN DE TOKEN (SUPABASE RPC + SOPORTE DEMO LOCAL)
// ============================================================================
async function handleTokenValidation(cleanToken) {
    hideTokenError();

    if (!cleanToken) {
        showTokenError('Por favor ingresa tu código de acceso único.');
        return;
    }

    // Bloqueo inmediato local si un token ya fue marcado como completado en este navegador
    const localLockKey = `tab_scout_locked_${cleanToken}`;
    if (localStorage.getItem(localLockKey) === 'completed') {
        renderLockedScreen('completed', 'Evaluación finalizada / Token expirado. Este enlace de acceso único ya fue utilizado.');
        return;
    }

    setButtonLoading(dom.btnValidateToken, true, 'Validando acceso...');

    try {
        // Soporte para tokens DEMO cuando Supabase aún no tiene credenciales o para pruebas rápidas
        if (cleanToken.startsWith('DEMO-') || !isSupabaseConfigured()) {
            const demoPayload = resolveDemoToken(cleanToken);
            if (!demoPayload.valid) {
                if (demoPayload.status === 'completed' || demoPayload.status === 'revoked') {
                    renderLockedScreen(demoPayload.status, demoPayload.message);
                } else {
                    showTokenError(demoPayload.message);
                }
                return;
            }
            loadCandidateSession(demoPayload, true);
            return;
        }

        // Validación real contra Supabase RPC (SECURITY DEFINER)
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.rpc('validate_token', {
            p_token: cleanToken
        });

        if (error) {
            throw new Error(error.message || 'Error al comunicarse con el servidor de evaluación.');
        }

        if (!data || !data.valid) {
            if (data && (data.code === 'TOKEN_COMPLETED' || data.code === 'TOKEN_REVOKED')) {
                renderLockedScreen(data.status || 'expired', data.message);
            } else {
                showTokenError((data && data.message) || 'El token ingresado no es válido.');
            }
            return;
        }

        loadCandidateSession(data, false);
    } catch (err) {
        console.error('[TAB Scout] Error validando token:', err);
        showTokenError(err.message || 'No se pudo verificar el token. Revisa tu conexión a internet.');
    } finally {
        setButtonLoading(dom.btnValidateToken, false, 'Validar Código');
    }
}

/**
 * Emulación local para tokens DEMO-COORD, DEMO-TEC, DEMO-AUX o pruebas sin backend
 */
function resolveDemoToken(token) {
    const demoMap = {
        'DEMO-COORD': { role: 'Coordinador', name: 'Carlos Mendoza (Demo Coordinador)', base: 'Guadalajara' },
        'DEMO-TEC': { role: 'Técnico', name: 'Luis Fernando Ríos (Demo Técnico)', base: 'Morelia' },
        'DEMO-AUX': { role: 'Auxiliar', name: 'Ana Sofía Vargas (Demo Auxiliar)', base: 'Atlacomulco' }
    };

    if (!demoMap[token] && isSupabaseConfigured()) {
        return {
            valid: false,
            message: 'El código de acceso no existe. Verifica que esté bien escrito.'
        };
    }

    const chosen = demoMap[token] || {
        role: token.includes('COORD') ? 'Coordinador' : token.includes('AUX') ? 'Auxiliar' : 'Técnico',
        name: `Candidato Prueba (${token})`,
        base: 'Occidente'
    };

    const savedRaw = localStorage.getItem(`tab_scout_demo_${token}`);
    const saved = savedRaw ? JSON.parse(savedRaw) : null;

    if (saved && saved.status === 'completed') {
        return {
            valid: false,
            status: 'completed',
            message: 'Evaluación finalizada / Token expirado. Este enlace de acceso único ya fue utilizado.'
        };
    }

    return {
        valid: true,
        token,
        candidate_name: chosen.name,
        base_location: chosen.base,
        role: chosen.role,
        status: saved ? saved.status : 'pending',
        answers: saved ? saved.answers : {},
        current_step: saved ? saved.current_step : 0,
        elapsed_seconds: saved ? saved.elapsed_seconds : 0
    };
}

// ============================================================================
// CARGA DE SESIÓN Y BIENVENIDA
// ============================================================================
function loadCandidateSession(payload, isDemo) {
    state.isDemoMode = isDemo;
    state.token = payload.token;
    state.candidateName = payload.candidate_name;
    state.baseLocation = payload.base_location || 'General';
    state.role = normalizeRole(payload.role);
    state.status = payload.status || 'pending';
    state.answers = payload.answers && typeof payload.answers === 'object' ? { ...payload.answers } : {};
    state.elapsedSeconds = Number(payload.elapsed_seconds || 0);
    state.questions = getQuestionsForRole(state.role);

    // Determinar en qué pregunta retomar si ya tenía progreso
    const answeredCount = countAnsweredQuestions();
    if (payload.current_step && payload.current_step > 0 && payload.current_step <= 30) {
        state.currentIndex = Math.min(payload.current_step - 1, 29);
    } else if (answeredCount > 0) {
        const firstUnanswered = state.questions.findIndex((q) => !state.answers[q.key] || !state.answers[q.key].trim());
        state.currentIndex = firstUnanswered !== -1 ? firstUnanswered : 29;
    } else {
        state.currentIndex = 0;
    }

    // Actualizar URL con el token para que no lo pierda si refresca antes de terminar
    const url = new URL(window.location.href);
    url.searchParams.set('token', state.token);
    window.history.replaceState({}, document.title, url.toString());

    // Poblar vista de bienvenida
    dom.welcomeCandidateName.textContent = state.candidateName;
    dom.welcomeMetaRole.textContent = `${state.role} — Tecnología a Bordo`;
    dom.welcomeMetaBase.textContent = state.baseLocation;
    dom.welcomeMetaToken.textContent = state.token;

    applyRoleBadgeStyle(dom.welcomeRoleBadge, state.role);
    applyRoleBadgeStyle(dom.headerRoleBadge, state.role);

    if (state.status === 'in_progress' || answeredCount > 0) {
        dom.welcomeStatusBadge.className = 'status-pill status-in_progress';
        dom.welcomeStatusBadge.innerHTML = '<span class="status-dot"></span>EN PROGRESO';
        dom.welcomeResumeBanner.classList.remove('hidden');
        dom.welcomeResumeCount.textContent = `${answeredCount} de 30 respondidas`;
        dom.btnStartWizardLabel.textContent = 'Continuar Evaluación';
    } else {
        dom.welcomeStatusBadge.className = 'status-pill status-pending';
        dom.welcomeStatusBadge.innerHTML = '<span class="status-dot"></span>PENDIENTE';
        dom.welcomeResumeBanner.classList.add('hidden');
        dom.btnStartWizardLabel.textContent = 'Comenzar Evaluación';
    }

    switchView('welcome');
}

function countAnsweredQuestions() {
    return state.questions.filter((q) => {
        const val = state.answers[q.key];
        return typeof val === 'string' && val.trim().length > 0;
    }).length;
}

// ============================================================================
// WIZARD INTERACTIVO PAGINADO (30 PREGUNTAS)
// ============================================================================
function startWizardSession() {
    dom.wizardCandidatePill.textContent = `${state.candidateName} • Base ${state.baseLocation}`;
    switchView('wizard');
    startTimer();
    renderCurrentQuestion();

    // Si estaba en 'pending', notificar inmediatamente que pasó a 'in_progress'
    if (state.status === 'pending') {
        savePartialProgress();
    }
}

function renderCurrentQuestion() {
    const q = state.questions[state.currentIndex];
    if (!q) return;

    // Reiniciar animación suave de entrada
    dom.wizardQuestionCard.classList.remove('wizard-question-enter');
    void dom.wizardQuestionCard.offsetWidth;
    dom.wizardQuestionCard.classList.add('wizard-question-enter');

    const stepNum = state.currentIndex + 1;
    const total = state.questions.length; // 30
    const percent = Math.round((stepNum / total) * 100);

    dom.wizardStepCounter.textContent = `Pregunta ${stepNum} de ${total}`;
    dom.wizardSectionBadge.textContent = `Sección: ${q.sectionUiTitle}`;
    dom.wizardProgressPercent.textContent = `${percent}%`;
    dom.wizardProgressBar.style.width = `${(stepNum / total) * 100}%`;

    // Etiqueta del bloque superior de la tarjeta
    let blockLabel = 'BLOQUE 1 DE 3 • CULTURA, ACTITUD Y DISPONIBILIDAD';
    if (stepNum >= 11 && stepNum <= 20) {
        blockLabel = `BLOQUE 2 DE 3 • COMPETENCIAS DE ${state.role.toUpperCase()}`;
    } else if (stepNum >= 21) {
        blockLabel = 'BLOQUE 3 DE 3 • ESCENARIOS Y TOMA DE DECISIONES';
    }
    dom.questionModuleTag.textContent = blockLabel;
    dom.questionIdTag.textContent = `Pregunta ${stepNum}/30`;
    dom.questionText.textContent = q.text;

    const existingAnswer = state.answers[q.key] || '';
    dom.answerTextarea.value = existingAnswer;
    dom.answerValidationMsg.classList.add('hidden');
    updateCharCounter(existingAnswer);

    // Estado de botones Anterior / Siguiente / Finalizar
    dom.btnPrevQuestion.disabled = state.currentIndex === 0;

    if (state.currentIndex === total - 1) {
        dom.btnNextQuestion.classList.add('hidden');
        dom.btnFinishEvaluation.classList.remove('hidden');
    } else {
        dom.btnNextQuestion.classList.remove('hidden');
        dom.btnFinishEvaluation.classList.add('hidden');
    }

    // Enfocar textarea automáticamente para agilidad
    setTimeout(() => {
        dom.answerTextarea.focus();
    }, 60);
}

function updateCharCounter(text) {
    const length = text.trim().length;
    const minRecommended = SUPABASE_CONFIG.RECOMMENDED_MIN_CHARS || 40;
    dom.charCountNumber.textContent = String(length);

    if (length === 0) {
        dom.charFeedbackDot.className = 'w-2 h-2 rounded-full bg-slate-300';
        dom.charFeedbackText.textContent = `Recomendado: al menos ${minRecommended} caracteres para detallar tu ejemplo.`;
        dom.charFeedbackText.className = 'text-[#64748B]';
    } else if (length < minRecommended) {
        dom.charFeedbackDot.className = 'w-2 h-2 rounded-full bg-amber-400';
        dom.charFeedbackText.textContent = `Respuesta breve (${length}/${minRecommended} sugeridos). Puedes avanzar o agregar más contexto.`;
        dom.charFeedbackText.className = 'text-amber-700';
    } else {
        dom.charFeedbackDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
        dom.charFeedbackText.textContent = 'Nivel de detalle adecuado.';
        dom.charFeedbackText.className = 'text-emerald-700 font-medium';
    }
}

async function handlePreviousStep() {
    if (state.currentIndex <= 0) return;

    // Guardar lo que haya escrito en la pregunta actual antes de retroceder
    const currentQ = state.questions[state.currentIndex];
    const currentVal = dom.answerTextarea.value.trim();
    if (currentVal) {
        state.answers[currentQ.key] = currentVal;
    }

    state.currentIndex -= 1;
    renderCurrentQuestion();
    savePartialProgress();
}

async function handleNextStep() {
    const currentQ = state.questions[state.currentIndex];
    const currentVal = dom.answerTextarea.value.trim();

    if (!currentVal) {
        dom.answerValidationMsg.classList.remove('hidden');
        dom.answerTextarea.focus();
        return;
    }

    state.answers[currentQ.key] = currentVal;

    if (state.currentIndex < state.questions.length - 1) {
        state.currentIndex += 1;
        renderCurrentQuestion();
        await savePartialProgress();
    }
}

// ============================================================================
// AUTO-GUARDADO PARCIAL EN SUPABASE
// ============================================================================
async function savePartialProgress() {
    setAutosaveStatus('saving');

    const payloadAnswers = {
        ...state.answers,
        _meta_step: state.currentIndex + 1,
        _meta_elapsed: state.elapsedSeconds
    };

    try {
        if (state.isDemoMode) {
            localStorage.setItem(
                `tab_scout_demo_${state.token}`,
                JSON.stringify({
                    status: 'in_progress',
                    answers: state.answers,
                    current_step: state.currentIndex + 1,
                    elapsed_seconds: state.elapsedSeconds,
                    updated_at: new Date().toISOString()
                })
            );
            state.status = 'in_progress';
            setAutosaveStatus('saved');
            return;
        }

        const supabase = getSupabaseClient();
        const { data, error } = await supabase.rpc('save_partial_answers', {
            p_token: state.token,
            p_answers: payloadAnswers
        });

        if (error) throw error;

        if (data && data.code === 'TOKEN_LOCKED') {
            stopTimer();
            renderLockedScreen(data.status || 'expired', data.message);
            return;
        }

        state.status = 'in_progress';
        setAutosaveStatus('saved');
    } catch (err) {
        console.warn('[TAB Scout] Error en auto-guardado parcial:', err);
        setAutosaveStatus('error');
    }
}

function setAutosaveStatus(mode) {
    if (mode === 'saving') {
        dom.autosaveDot.className = 'w-2 h-2 rounded-full bg-amber-400 animate-pulse';
        dom.autosaveText.textContent = 'Guardando...';
    } else if (mode === 'error') {
        dom.autosaveDot.className = 'w-2 h-2 rounded-full bg-red-400';
        dom.autosaveText.textContent = 'Reintentando...';
    } else {
        dom.autosaveDot.className = 'w-2 h-2 rounded-full bg-emerald-400';
        dom.autosaveText.textContent = 'Guardado';
    }
}

// ============================================================================
// ENVÍO FINAL Y CADUCIDAD IRREVERSIBLE DEL TOKEN
// ============================================================================
function handleOpenSubmitModal() {
    const currentQ = state.questions[state.currentIndex];
    const currentVal = dom.answerTextarea.value.trim();

    if (!currentVal) {
        dom.answerValidationMsg.classList.remove('hidden');
        dom.answerTextarea.focus();
        return;
    }

    state.answers[currentQ.key] = currentVal;
    dom.modalConfirmSubmit.classList.remove('hidden');
}

async function executeFinalSubmission() {
    setButtonLoading(dom.btnConfirmSubmit, true, 'Sellando evaluación...');

    const payloadAnswers = {
        ...state.answers,
        _meta_step: 30,
        _meta_elapsed: state.elapsedSeconds
    };

    try {
        if (state.isDemoMode) {
            localStorage.setItem(
                `tab_scout_demo_${state.token}`,
                JSON.stringify({
                    status: 'completed',
                    answers: state.answers,
                    current_step: 30,
                    elapsed_seconds: state.elapsedSeconds,
                    completed_at: new Date().toISOString()
                })
            );
        } else {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase.rpc('submit_evaluation', {
                p_token: state.token,
                p_answers: payloadAnswers
            });

            if (error) throw new Error(error.message || 'No se pudo registrar el envío final.');
            if (data && !data.success) {
                throw new Error(data.message || 'El token ya no está disponible.');
            }
        }

        // Sellar localmente para bloqueo instantáneo si recarga la página
        localStorage.setItem(`tab_scout_locked_${state.token}`, 'completed');
        stopTimer();
        dom.modalConfirmSubmit.classList.add('hidden');

        renderLockedScreen(
            'completed',
            'Evaluación finalizada / Token expirado. Este enlace de acceso único ya fue utilizado.'
        );
    } catch (err) {
        console.error('[TAB Scout] Error al enviar evaluación:', err);
        alert(err.message || 'Ocurrió un error al enviar tu evaluación. Intenta nuevamente.');
    } finally {
        setButtonLoading(dom.btnConfirmSubmit, false, 'Sí, enviar definitivamente');
    }
}

function renderLockedScreen(status, message) {
    stopTimer();

    if (status === 'revoked' || status === 'expired') {
        dom.lockedStatusPill.className = 'status-pill status-revoked';
        dom.lockedStatusPill.innerHTML = '<span class="status-dot"></span>EXPIRADO';
        dom.lockedIconWrapper.className = 'w-14 h-14 rounded-2xl bg-red-50 border border-red-200 text-red-600 mx-auto flex items-center justify-center mb-5';
        dom.lockedIconWrapper.innerHTML = `
            <svg class="w-8 h-8" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
            </svg>
        `;
    } else {
        dom.lockedStatusPill.className = 'status-pill status-completed';
        dom.lockedStatusPill.innerHTML = '<span class="status-dot"></span>COMPLETADO';
        dom.lockedIconWrapper.className = 'w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center mb-5';
        dom.lockedIconWrapper.innerHTML = `
            <svg class="w-8 h-8" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
        `;
    }

    dom.lockedTitle.textContent = 'Evaluación finalizada / Token expirado.';
    dom.lockedSubtitle.textContent = message || 'Este enlace de acceso único ya fue utilizado.';

    switchView('locked');
}

// ============================================================================
// CRONÓMETRO DISCRETO INFORMATIVO
// ============================================================================
function startTimer() {
    stopTimer();
    updateTimerDisplay();
    state.timerInterval = setInterval(() => {
        state.elapsedSeconds += 1;
        updateTimerDisplay();
    }, 1000);
}

function stopTimer() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
}

function updateTimerDisplay() {
    const mins = Math.floor(state.elapsedSeconds / 60);
    const secs = state.elapsedSeconds % 60;
    const mm = String(mins).padStart(2, '0');
    const ss = String(secs).padStart(2, '0');
    dom.sessionTimer.textContent = `${mm}:${ss}`;
}

function setButtonLoading(button, isLoading, text) {
    if (!button) return;
    button.disabled = isLoading;
    const span = button.querySelector('span');
    if (span && text) {
        span.textContent = text;
    }
}


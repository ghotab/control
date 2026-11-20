/**
 * TAB SCOUT — Lógica del Portal del Candidato (`index.html`)
 * ---------------------------------------------------------------------------
 * - Acepta token manual o por parámetro URL (`?token=GHO-XXXX-XXXX`)
 * - Valida vía RPC `validate_token(p_token)` en Supabase
 * - Carga de CV en formato PDF (máx 5 MB) vía Drag & Drop a Supabase Storage
 *   (`candidate-cvs`) y vinculación con RPC `attach_cv(p_token, p_cv_path)`
 * - Wizard interactivo híbrido:
 *     1) `type: 'choice'` -> 4 tarjetas clickeables de elección forzada
 *     2) `type: 'slider'` -> Escala visual 1 a 10 con badge dinámico y etiquetas de extremos
 *     3) `type: 'text'`   -> Texto libre estratégico con contador de caracteres
 * - Auto-guardado parcial vía RPC `save_partial_answers` en cada avance
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
    cvPath: null,
    cvUploading: false,
    questions: [],
    currentIndex: 0,
    answers: {},
    elapsedSeconds: 0,
    timerInterval: null,
    isDemoMode: false
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

    // Drag & Drop CV
    cvStatusBadge: document.getElementById('cv-status-badge'),
    cvDropzone: document.getElementById('cv-dropzone'),
    cvFileInput: document.getElementById('cv-file-input'),
    cvDropzoneEmpty: document.getElementById('cv-dropzone-empty'),
    cvUploadProgressBox: document.getElementById('cv-upload-progress-box'),
    cvUploadingLabel: document.getElementById('cv-uploading-label'),
    cvUploadPercent: document.getElementById('cv-upload-percent'),
    cvUploadBar: document.getElementById('cv-upload-bar'),
    cvDropzoneLoaded: document.getElementById('cv-dropzone-loaded'),
    cvLoadedFilename: document.getElementById('cv-loaded-filename'),
    btnReplaceCv: document.getElementById('btn-replace-cv'),
    cvErrorMsg: document.getElementById('cv-error-msg'),
    cvErrorText: document.getElementById('cv-error-text'),

    // Wizard
    wizardStepCounter: document.getElementById('wizard-step-counter'),
    wizardSectionBadge: document.getElementById('wizard-section-badge'),
    wizardTypePill: document.getElementById('wizard-type-pill'),
    wizardProgressPercent: document.getElementById('wizard-progress-percent'),
    wizardProgressBar: document.getElementById('wizard-progress-bar'),
    wizardCandidatePill: document.getElementById('wizard-candidate-pill'),
    wizardQuestionCard: document.getElementById('wizard-question-card'),
    questionModuleTag: document.getElementById('question-module-tag'),
    questionIdTag: document.getElementById('question-id-tag'),
    questionText: document.getElementById('question-text'),

    // Modos de respuesta (Choice / Slider / Text)
    inputModeChoice: document.getElementById('input-mode-choice'),
    choiceCardsContainer: document.getElementById('choice-cards-container'),

    inputModeSlider: document.getElementById('input-mode-slider'),
    sliderValueBadge: document.getElementById('slider-value-badge'),
    sliderMinLabel: document.getElementById('slider-min-label'),
    sliderMaxLabel: document.getElementById('slider-max-label'),
    questionSliderInput: document.getElementById('question-slider-input'),
    sliderTicksContainer: document.getElementById('slider-ticks-container'),

    inputModeText: document.getElementById('input-mode-text'),
    answerTextarea: document.getElementById('answer-textarea'),
    charFeedbackDot: document.getElementById('char-feedback-dot'),
    charFeedbackText: document.getElementById('char-feedback-text'),
    charCountNumber: document.getElementById('char-count-number'),

    answerValidationMsg: document.getElementById('answer-validation-msg'),
    answerValidationText: document.getElementById('answer-validation-text'),
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

    buildSliderTickButtons();
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

function buildSliderTickButtons() {
    dom.sliderTicksContainer.innerHTML = '';
    for (let i = 1; i <= 10; i++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'slider-tick-btn';
        btn.dataset.val = String(i);
        btn.textContent = String(i);
        btn.addEventListener('click', () => {
            setSliderValue(i);
        });
        dom.sliderTicksContainer.appendChild(btn);
    }
}

function bindEvents() {
    dom.formTokenAccess.addEventListener('submit', (e) => {
        e.preventDefault();
        const rawToken = dom.inputToken.value.trim().toUpperCase();
        handleTokenValidation(rawToken);
    });

    dom.btnChangeToken.addEventListener('click', () => {
        stopTimer();
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        dom.inputToken.value = '';
        hideTokenError();
        switchView('tokenEntry');
    });

    // Eventos Drag & Drop para CV PDF
    dom.cvDropzone.addEventListener('click', (e) => {
        if (e.target === dom.btnReplaceCv) return;
        if (state.cvUploading) return;
        dom.cvFileInput.click();
    });

    dom.btnReplaceCv.addEventListener('click', (e) => {
        e.stopPropagation();
        if (state.cvUploading) return;
        dom.cvFileInput.value = '';
        dom.cvFileInput.click();
    });

    dom.cvFileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
            handleCvFileSelected(file);
        }
    });

    dom.cvDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dom.cvDropzone.classList.add('drag-over');
    });

    dom.cvDropzone.addEventListener('dragleave', () => {
        dom.cvDropzone.classList.remove('drag-over');
    });

    dom.cvDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dom.cvDropzone.classList.remove('drag-over');
        if (state.cvUploading) return;
        const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) {
            handleCvFileSelected(file);
        }
    });

    dom.btnStartWizard.addEventListener('click', () => {
        if (SUPABASE_CONFIG.REQUIRE_CV_BEFORE_START && !state.cvPath) {
            showCvError('Por favor adjunta tu CV en formato PDF antes de comenzar la evaluación.');
            dom.cvDropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        startWizardSession();
    });

    // Eventos de preguntas tipo Text
    dom.answerTextarea.addEventListener('input', () => {
        dom.answerValidationMsg.classList.add('hidden');
        updateCharCounter(dom.answerTextarea.value);
    });

    // Eventos de preguntas tipo Slider
    dom.questionSliderInput.addEventListener('input', () => {
        const val = Number(dom.questionSliderInput.value);
        setSliderValue(val);
    });

    // Atajos de teclado globales en el Wizard
    document.addEventListener('keydown', (e) => {
        if (views.wizard.classList.contains('hidden')) return;
        if (!dom.modalConfirmSubmit.classList.contains('hidden')) return;

        const q = state.questions[state.currentIndex];
        if (!q) return;

        // Ctrl + Enter o Cmd + Enter para avanzar en cualquier tipo de pregunta
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            advanceOrFinish();
            return;
        }

        // Atajos rápidos A, B, C, D cuando la pregunta actual es 'choice'
        if (q.type === 'choice' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const keyUpper = e.key.toUpperCase();
            if (['A', 'B', 'C', 'D'].includes(keyUpper)) {
                e.preventDefault();
                selectChoiceCard(keyUpper);
            } else if (e.key === 'Enter' && state.answers[q.key]) {
                e.preventDefault();
                advanceOrFinish();
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

function advanceOrFinish() {
    if (state.currentIndex < state.questions.length - 1) {
        handleNextStep();
    } else {
        handleOpenSubmitModal();
    }
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

    const localLockKey = `tab_scout_locked_${cleanToken}`;
    if (localStorage.getItem(localLockKey) === 'completed') {
        renderLockedScreen('completed', 'Evaluación finalizada / Token expirado. Este enlace de acceso único ya fue utilizado.');
        return;
    }

    setButtonLoading(dom.btnValidateToken, true, 'Validando acceso...');

    try {
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
        cv_path: saved ? saved.cv_path : null,
        answers: saved ? saved.answers : {},
        current_step: saved ? saved.current_step : 0,
        elapsed_seconds: saved ? saved.elapsed_seconds : 0
    };
}

// ============================================================================
// CARGA DE SESIÓN Y BIENVENIDA + GESTIÓN DE CV (PDF)
// ============================================================================
function loadCandidateSession(payload, isDemo) {
    state.isDemoMode = isDemo;
    state.token = payload.token;
    state.candidateName = payload.candidate_name;
    state.baseLocation = payload.base_location || 'General';
    state.role = normalizeRole(payload.role);
    state.status = payload.status || 'pending';
    state.cvPath = payload.cv_path || null;
    state.answers = payload.answers && typeof payload.answers === 'object' ? { ...payload.answers } : {};
    state.elapsedSeconds = Number(payload.elapsed_seconds || 0);
    state.questions = getQuestionsForRole(state.role);

    const totalQ = state.questions.length;
    const answeredCount = countAnsweredQuestions();

    if (payload.current_step && payload.current_step > 0 && payload.current_step <= totalQ) {
        state.currentIndex = Math.min(payload.current_step - 1, totalQ - 1);
    } else if (answeredCount > 0) {
        const firstUnanswered = state.questions.findIndex((q) => !state.answers[q.key] || !String(state.answers[q.key]).trim());
        state.currentIndex = firstUnanswered !== -1 ? firstUnanswered : totalQ - 1;
    } else {
        state.currentIndex = 0;
    }

    // Actualizar URL con el token
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

    // Estado de CV en la pantalla de bienvenida
    renderCvDropzoneState();

    if (state.status === 'in_progress' || answeredCount > 0) {
        dom.welcomeStatusBadge.className = 'status-pill status-in_progress';
        dom.welcomeStatusBadge.innerHTML = '<span class="status-dot"></span>EN PROGRESO';
        dom.welcomeResumeBanner.classList.remove('hidden');
        dom.welcomeResumeCount.textContent = `${answeredCount} de ${totalQ} respondidas`;
        dom.btnStartWizardLabel.textContent = 'Continuar Evaluación';
    } else {
        dom.welcomeStatusBadge.className = 'status-pill status-pending';
        dom.welcomeStatusBadge.innerHTML = '<span class="status-dot"></span>PENDIENTE';
        dom.welcomeResumeBanner.classList.add('hidden');
        dom.btnStartWizardLabel.textContent = 'Comenzar Evaluación';
    }

    switchView('welcome');
}

function renderCvDropzoneState() {
    hideCvError();
    dom.cvUploadProgressBox.classList.add('hidden');

    if (state.cvPath) {
        const fileName = state.cvPath.split('/').pop() || 'CV_Candidato.pdf';
        dom.cvDropzone.classList.add('cv-loaded');
        dom.cvDropzoneEmpty.classList.add('hidden');
        dom.cvDropzoneLoaded.classList.remove('hidden');
        dom.cvLoadedFilename.textContent = fileName;
        dom.cvStatusBadge.className = 'status-pill status-completed';
        dom.cvStatusBadge.innerHTML = '<span class="status-dot"></span>CV CARGADO';
    } else {
        dom.cvDropzone.classList.remove('cv-loaded');
        dom.cvDropzoneEmpty.classList.remove('hidden');
        dom.cvDropzoneLoaded.classList.add('hidden');
        dom.cvStatusBadge.className = 'status-pill status-pending';
        dom.cvStatusBadge.innerHTML = '<span class="status-dot"></span>REQUERIDO';
    }
}

function showCvError(msg) {
    dom.cvErrorText.textContent = msg;
    dom.cvErrorMsg.classList.remove('hidden');
}

function hideCvError() {
    dom.cvErrorMsg.classList.add('hidden');
}

/**
 * Valida y sube el CV en PDF a Supabase Storage (bucket 'candidate-cvs')
 * y vincula la ruta mediante la RPC `attach_cv(p_token, p_cv_path)`.
 */
async function handleCvFileSelected(file) {
    hideCvError();

    // 1. Validar formato .pdf
    const isPdfMime = file.type === 'application/pdf';
    const isPdfExt = file.name.toLowerCase().endsWith('.pdf');
    if (!isPdfMime && !isPdfExt) {
        showCvError('Formato no válido. Solo se permiten archivos en formato PDF (.pdf).');
        return;
    }

    // 2. Validar tamaño máximo (5 MB)
    const maxBytes = SUPABASE_CONFIG.CV_MAX_SIZE_BYTES || 5 * 1024 * 1024;
    if (file.size > maxBytes) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
        showCvError(`El archivo pesa ${sizeMb} MB y excede el límite máximo permitido de 5 MB.`);
        return;
    }

    // Limpiar nombre de archivo para ruta segura en Storage: <TOKEN>/<nombre_limpio>.pdf
    const cleanFileName = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_');

    const storagePath = `${state.token.toUpperCase()}/${Date.now()}_${cleanFileName}`;

    state.cvUploading = true;
    dom.cvDropzoneEmpty.classList.add('hidden');
    dom.cvDropzoneLoaded.classList.add('hidden');
    dom.cvUploadProgressBox.classList.remove('hidden');
    updateCvProgress(25, 'Cifrando y subiendo PDF...');

    try {
        if (state.isDemoMode) {
            await new Promise((r) => setTimeout(r, 450));
            updateCvProgress(80, 'Vinculando a tu ficha...');
            await new Promise((r) => setTimeout(r, 250));
            state.cvPath = storagePath;
            saveDemoState();
            updateCvProgress(100, 'Completado');
            renderCvDropzoneState();
            return;
        }

        const supabase = getSupabaseClient();
        const bucket = SUPABASE_CONFIG.CV_BUCKET || 'candidate-cvs';

        updateCvProgress(55, 'Subiendo archivo a Supabase Storage...');
        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(storagePath, file, {
                cacheControl: '3600',
                upsert: true,
                contentType: 'application/pdf'
            });

        if (uploadError) {
            throw new Error(uploadError.message || 'No se pudo subir el archivo PDF al servidor.');
        }

        updateCvProgress(85, 'Vinculando CV a tu token de evaluación...');
        const { data: rpcData, error: rpcError } = await supabase.rpc('attach_cv', {
            p_token: state.token,
            p_cv_path: storagePath
        });

        if (rpcError) {
            throw new Error(rpcError.message || 'Error al vincular el CV con la evaluación.');
        }
        if (rpcData && !rpcData.success) {
            throw new Error(rpcData.message || 'No fue posible registrar el CV.');
        }

        updateCvProgress(100, '¡CV cargado!');
        state.cvPath = storagePath;
        renderCvDropzoneState();
    } catch (err) {
        console.error('[TAB Scout] Error subiendo CV:', err);
        renderCvDropzoneState();
        showCvError(err.message || 'Ocurrió un error al subir tu CV. Intenta nuevamente.');
    } finally {
        state.cvUploading = false;
    }
}

function updateCvProgress(percent, label) {
    dom.cvUploadPercent.textContent = `${percent}%`;
    dom.cvUploadBar.style.width = `${percent}%`;
    if (label) {
        dom.cvUploadingLabel.textContent = label;
    }
}

function countAnsweredQuestions() {
    return state.questions.filter((q) => {
        const val = state.answers[q.key];
        return val !== undefined && val !== null && String(val).trim().length > 0;
    }).length;
}

// ============================================================================
// WIZARD INTERACTIVO HÍBRIDO (CHOICE / SLIDER / TEXT)
// ============================================================================
function startWizardSession() {
    dom.wizardCandidatePill.textContent = `${state.candidateName} • Base ${state.baseLocation}`;
    switchView('wizard');
    startTimer();
    renderCurrentQuestion();

    if (state.status === 'pending') {
        savePartialProgress();
    }
}

function renderCurrentQuestion() {
    const q = state.questions[state.currentIndex];
    if (!q) return;

    // Animación suave al cambiar de pregunta
    dom.wizardQuestionCard.classList.remove('wizard-question-enter');
    void dom.wizardQuestionCard.offsetWidth;
    dom.wizardQuestionCard.classList.add('wizard-question-enter');

    const stepNum = state.currentIndex + 1;
    const total = state.questions.length;
    const percent = Math.round((stepNum / total) * 100);

    dom.wizardStepCounter.textContent = `Pregunta ${stepNum} de ${total}`;
    dom.wizardSectionBadge.textContent = `Sección: ${q.sectionUiTitle}`;
    dom.wizardProgressPercent.textContent = `${percent}%`;
    dom.wizardProgressBar.style.width = `${(stepNum / total) * 100}%`;

    // Badge del tipo de pregunta
    if (q.type === 'choice') {
        dom.wizardTypePill.textContent = 'Opción Múltiple';
        dom.wizardTypePill.className = 'text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200';
    } else if (q.type === 'slider') {
        dom.wizardTypePill.textContent = 'Escala 1 a 10';
        dom.wizardTypePill.className = 'text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200';
    } else {
        dom.wizardTypePill.textContent = 'Respuesta Abierta';
        dom.wizardTypePill.className = 'text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-[#2563EB] border border-blue-200';
    }

    // Etiqueta del bloque superior
    let blockLabel = 'BLOQUE 1 DE 3 • CULTURA, ACTITUD Y OPERACIÓN';
    if (q.moduleCode === 'M2' || q.moduleCode === 'M3' || q.moduleCode === 'M4') {
        blockLabel = `BLOQUE 2 DE 3 • COMPETENCIAS DE ${state.role.toUpperCase()}`;
    } else if (q.moduleCode === 'M5') {
        blockLabel = 'BLOQUE 3 DE 3 • ESTILO DE COMUNICACIÓN Y ESCENARIOS';
    }
    dom.questionModuleTag.textContent = blockLabel;
    dom.questionIdTag.textContent = `Pregunta ${stepNum}/${total}`;
    dom.questionText.textContent = q.text;

    dom.answerValidationMsg.classList.add('hidden');

    // Ocultar los 3 contenedores y activar solo el que corresponde al tipo
    dom.inputModeChoice.classList.add('hidden');
    dom.inputModeSlider.classList.add('hidden');
    dom.inputModeText.classList.add('hidden');

    const existingAnswer = state.answers[q.key] !== undefined ? String(state.answers[q.key]) : '';

    if (q.type === 'choice') {
        renderChoiceMode(q, existingAnswer);
    } else if (q.type === 'slider') {
        renderSliderMode(q, existingAnswer);
    } else {
        renderTextMode(existingAnswer);
    }

    // Botones Anterior / Siguiente / Finalizar
    dom.btnPrevQuestion.disabled = state.currentIndex === 0;

    if (state.currentIndex === total - 1) {
        dom.btnNextQuestion.classList.add('hidden');
        dom.btnFinishEvaluation.classList.remove('hidden');
    } else {
        dom.btnNextQuestion.classList.remove('hidden');
        dom.btnFinishEvaluation.classList.add('hidden');
    }
}

/**
 * Renderiza las 4 tarjetas grandes clickeables (`type: 'choice'`)
 */
function renderChoiceMode(question, selectedKey) {
    dom.inputModeChoice.classList.remove('hidden');
    dom.choiceCardsContainer.innerHTML = '';

    (question.options || []).forEach((opt) => {
        const isSelected = selectedKey.toUpperCase() === opt.key.toUpperCase();
        const card = document.createElement('button');
        card.type = 'button';
        card.dataset.choiceKey = opt.key;
        card.className = `choice-card ${isSelected ? 'selected' : ''}`;

        card.innerHTML = `
            <span class="choice-key-badge">${opt.key}</span>
            <span class="text-xs sm:text-sm font-medium text-[#1E293B] leading-relaxed pr-2">${opt.label}</span>
            <span class="choice-check-icon">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                </svg>
            </span>
        `;

        card.addEventListener('click', () => {
            selectChoiceCard(opt.key);
        });

        dom.choiceCardsContainer.appendChild(card);
    });
}

function selectChoiceCard(choiceKey) {
    const q = state.questions[state.currentIndex];
    if (!q || q.type !== 'choice') return;

    state.answers[q.key] = choiceKey;
    dom.answerValidationMsg.classList.add('hidden');

    dom.choiceCardsContainer.querySelectorAll('.choice-card').forEach((btn) => {
        if (btn.dataset.choiceKey === choiceKey) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

/**
 * Renderiza el control de Escala Visual del 1 al 10 (`type: 'slider'`)
 */
function renderSliderMode(question, existingVal) {
    dom.inputModeSlider.classList.remove('hidden');
    dom.sliderMinLabel.textContent = question.minLabel || '1 = Mínimo';
    dom.sliderMaxLabel.textContent = question.maxLabel || '10 = Máximo';

    const parsed = Number(existingVal);
    const initialVal = !Number.isNaN(parsed) && parsed >= 1 && parsed <= 10 ? parsed : 5;
    setSliderValue(initialVal);
}

function setSliderValue(val) {
    const q = state.questions[state.currentIndex];
    const cleanVal = Math.min(10, Math.max(1, Number(val) || 5));

    dom.questionSliderInput.value = String(cleanVal);
    dom.sliderValueBadge.textContent = String(cleanVal);

    dom.sliderTicksContainer.querySelectorAll('.slider-tick-btn').forEach((btn) => {
        if (Number(btn.dataset.val) === cleanVal) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    if (q && q.type === 'slider') {
        state.answers[q.key] = String(cleanVal);
        dom.answerValidationMsg.classList.add('hidden');
    }
}

/**
 * Renderiza el campo de texto libre estratégico (`type: 'text'`)
 */
function renderTextMode(existingAnswer) {
    dom.inputModeText.classList.remove('hidden');
    dom.answerTextarea.value = existingAnswer;
    updateCharCounter(existingAnswer);

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

/**
 * Valida y captura la respuesta de la pregunta actual según su tipo
 */
function captureAndValidateCurrentAnswer() {
    const q = state.questions[state.currentIndex];
    if (!q) return false;

    if (q.type === 'choice') {
        const chosen = state.answers[q.key];
        if (!chosen || !['A', 'B', 'C', 'D'].includes(String(chosen).toUpperCase())) {
            dom.answerValidationText.textContent = 'Por favor selecciona una de las 4 opciones (A, B, C o D) para continuar.';
            dom.answerValidationMsg.classList.remove('hidden');
            return false;
        }
        return true;
    }

    if (q.type === 'slider') {
        const sliderVal = String(dom.questionSliderInput.value || '5');
        state.answers[q.key] = sliderVal;
        return true;
    }

    // type === 'text'
    const textVal = dom.answerTextarea.value.trim();
    if (!textVal) {
        dom.answerValidationText.textContent = 'Por favor escribe tu respuesta antes de continuar a la siguiente pregunta.';
        dom.answerValidationMsg.classList.remove('hidden');
        dom.answerTextarea.focus();
        return false;
    }

    state.answers[q.key] = textVal;
    return true;
}

async function handlePreviousStep() {
    if (state.currentIndex <= 0) return;

    const currentQ = state.questions[state.currentIndex];
    if (currentQ.type === 'text') {
        const val = dom.answerTextarea.value.trim();
        if (val) state.answers[currentQ.key] = val;
    } else if (currentQ.type === 'slider') {
        state.answers[currentQ.key] = String(dom.questionSliderInput.value);
    }

    state.currentIndex -= 1;
    renderCurrentQuestion();
    savePartialProgress();
}

async function handleNextStep() {
    if (!captureAndValidateCurrentAnswer()) return;

    if (state.currentIndex < state.questions.length - 1) {
        state.currentIndex += 1;
        renderCurrentQuestion();
        await savePartialProgress();
    }
}

// ============================================================================
// AUTO-GUARDADO PARCIAL EN SUPABASE
// ============================================================================
function saveDemoState(statusOverride) {
    localStorage.setItem(
        `tab_scout_demo_${state.token}`,
        JSON.stringify({
            status: statusOverride || state.status || 'in_progress',
            cv_path: state.cvPath,
            answers: state.answers,
            current_step: state.currentIndex + 1,
            elapsed_seconds: state.elapsedSeconds,
            updated_at: new Date().toISOString()
        })
    );
}

async function savePartialProgress() {
    setAutosaveStatus('saving');

    const payloadAnswers = {
        ...state.answers,
        _meta_step: state.currentIndex + 1,
        _meta_elapsed: state.elapsedSeconds
    };

    try {
        if (state.isDemoMode) {
            state.status = 'in_progress';
            saveDemoState('in_progress');
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
    if (!captureAndValidateCurrentAnswer()) return;
    dom.modalConfirmSubmit.classList.remove('hidden');
}

async function executeFinalSubmission() {
    setButtonLoading(dom.btnConfirmSubmit, true, 'Sellando evaluación...');

    const totalSteps = state.questions.length;
    const payloadAnswers = {
        ...state.answers,
        _meta_step: totalSteps,
        _meta_elapsed: state.elapsedSeconds
    };

    try {
        if (state.isDemoMode) {
            saveDemoState('completed');
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

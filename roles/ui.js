// ui.js — UI utilities: toasts, modals, loaders

const UI = (() => {
  // ── Loader ────────────────────────────────────────────
  function showLoader() {
    const el = document.getElementById('page-loader');
    if (el) el.classList.remove('fade-out');
  }

  function hideLoader() {
    setTimeout(() => {
      const el = document.getElementById('page-loader');
      if (el) {
        el.classList.add('fade-out');
        setTimeout(() => { el.style.display = 'none'; }, 300);
      }
    }, 400);
  }

  // ── Toast ─────────────────────────────────────────────
  function showToast(msg, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = { success: '✅', error: '❌', info: 'ℹ️' };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || ''}</span><span>${msg}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'opacity 0.3s, transform 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ── Modal ─────────────────────────────────────────────
  let _confirmCallback = null;

  function resetModalConfirm() {
    const confirmBtn = document.getElementById('modal-confirm-btn');
    if (!confirmBtn) return;
    confirmBtn.disabled = false;
    if (confirmBtn.dataset.originalText) {
      confirmBtn.innerHTML = confirmBtn.dataset.originalText;
      delete confirmBtn.dataset.originalText;
    }
    confirmBtn.classList.remove('loading');
  }

  function showModal({ title, body, onConfirm, confirmLabel = 'Guardar', cancelLabel = 'Cancelar' }) {
    _confirmCallback = onConfirm;

    const overlay = document.getElementById('modal-overlay');
    const confirmBtn = document.getElementById('modal-confirm-btn');

    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = body;
    confirmBtn.textContent = confirmLabel;
    confirmBtn.disabled = false;
    confirmBtn.classList.remove('loading');
    delete confirmBtn.dataset.originalText;
    document.getElementById('modal-cancel-btn').textContent = cancelLabel;

    overlay.classList.remove('hidden');
  }

  function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.add('hidden');
    resetModalConfirm();
    _confirmCallback = null;
  }

  function confirmModal() {
    if (!_confirmCallback) return;

    const confirmBtn = document.getElementById('modal-confirm-btn');
    if (!confirmBtn || confirmBtn.disabled) return;

    confirmBtn.dataset.originalText = confirmBtn.textContent;
    confirmBtn.innerHTML = `<span class="btn-spinner"></span>Guardando...`;
    confirmBtn.disabled = true;
    confirmBtn.classList.add('loading');

    let shouldRestore = true;
    try {
      const result = _confirmCallback();
      if (result && typeof result.then === 'function') {
        shouldRestore = false;
        result.finally(() => {
          if (!document.getElementById('modal-overlay').classList.contains('hidden')) {
            resetModalConfirm();
          }
        });
      }
    } finally {
      if (shouldRestore) {
        resetModalConfirm();
      }
    }
  }

  return { showLoader, hideLoader, showToast, showModal, closeModal, confirmModal };
})();

window.UI = UI;

const BANDEJAS_QR_REGEX = /^[A-Z0-9]{4}-[A-Z0-9]{5}-D0*[1-9][0-9]*$/
const BANDEJAS_ESTATUS_LISTA = [
  "Instalado en bus",
  "En base",
  "En tránsito",
  "En análisis",
  "Dañado/Baja",
]
const BANDEJAS_TIPOS_DISCO = [
  { value: 'HDD SATA 2.5"', label: 'HDD SATA 2.5" — Disco mecánico 2.5"' },
  { value: 'HDD SATA 3.5"', label: 'HDD SATA 3.5" — Disco mecánico 3.5" (MDVR X3NPro)' },
  { value: 'SSD SATA 2.5"', label: 'SSD SATA 2.5" — Estado sólido 2.5"' },
  { value: "SSD M.2 SATA", label: "SSD M.2 SATA — Estado sólido M.2 (MDVR M1N 2.0)" },
  { value: "MicroSD Videovigilancia", label: "MicroSD Videovigilancia — Alta durabilidad (Dashcam / M1N 2.0)" },
  { value: "SD / SDXC Videovigilancia", label: "SD / SDXC Videovigilancia — Respaldo hot-swap (MDVR X3NPro)" },
]
const BANDEJAS_TIPOS_BANDEJA = [
  { value: "Caddy Compacto", label: "Caddy Compacto 2.5\" — Riel liso sin herraje (antes BDI)" },
  { value: "Caddy Tornillo Cautivo", label: "Caddy Tornillo Cautivo 2.5\" — Fijación lateral con perillas" },
  { value: "Caddy Asa Abatible", label: "Caddy Asa Abatible 2.5\" — Extracción con manija / jaladera" },
  { value: 'Cartucho 3.5" Streamax (X3NPro)', label: 'Cartucho 3.5" Streamax (X3NPro) — Asa + tornillos cautivos y llave' },
  { value: "Módulo M.2 Extraíble (M1N 2.0)", label: "Módulo M.2 Extraíble (M1N 2.0) — Compartimento frontal con llave" },
  { value: "Ranura Directa (Sin Caddy)", label: "Ranura Directa (Sin Caddy) — Inserción directa SD / MicroSD" },
]
const BANDEJAS_MOTIVOS_SUGERIDOS = [
  "Cambio previo en otra base sin registro en sistema",
  "Retiro previo por área de monitoreo / análisis de video",
  "Sustitución de emergencia en ruta o taller",
  "Registro inicial de unidad con bandeja de préstamo",
]

function bandejasInyectarEstilos() {
  if (typeof document === "undefined") return
  let style = document.getElementById("bandejas-module-styles")
  if (!style) {
    style = document.createElement("style")
    style.id = "bandejas-module-styles"
    document.head.appendChild(style)
  }
  style.textContent = `
    .bdj-page {
      display: flex;
      flex-direction: column;
      gap: 1.35rem;
      padding: 0.35rem 0 2.75rem 0;
      color: var(--color-text);
    }
    .bdj-header {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem 1.5rem;
    }
    .bdj-header-info {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      min-width: 240px;
      flex: 1 1 320px;
    }
    .bdj-title-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.65rem;
    }
    .bdj-title {
      font-family: var(--font-display);
      font-size: 1.375rem;
      font-weight: 700;
      line-height: 1.25;
      color: var(--color-text);
      margin: 0;
    }
    .bdj-subtitle {
      font-size: 0.9rem;
      line-height: 1.5;
      color: var(--color-text-muted);
      margin: 0;
    }
    .bdj-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.65rem;
    }
    .bdj-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      min-height: 2.6rem;
      padding: 0.6rem 1.1rem;
      border-radius: 0.65rem;
      font-size: 0.875rem;
      font-weight: 600;
      line-height: 1.2;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
      border: 1px solid var(--color-border);
      background: var(--color-card);
      color: var(--color-text);
    }
    .bdj-btn:hover:not(:disabled) {
      background: #f1f4f8;
      border-color: #cfd5df;
    }
    .bdj-btn:disabled {
      opacity: 0.48;
      cursor: not-allowed;
    }
    .bdj-btn-primary {
      background: var(--color-teal);
      border-color: var(--color-teal);
      color: #ffffff;
      padding: 0.65rem 1.25rem;
      box-shadow: 0 3px 10px rgba(15, 158, 142, 0.22);
    }
    .bdj-btn-primary:hover:not(:disabled) {
      background: #0c8779;
      border-color: #0c8779;
    }
    .bdj-btn-navy {
      background: var(--color-navy);
      border-color: var(--color-navy);
      color: #ffffff;
    }
    .bdj-btn-navy:hover:not(:disabled) {
      background: var(--color-navy-light);
      border-color: var(--color-navy-light);
    }
    .bdj-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.85rem;
    }
    .bdj-segmented {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 0.3rem;
      padding: 0.3rem;
      border-radius: 0.75rem;
      background: #e8ecf2;
    }
    .bdj-tab-btn {
      padding: 0.55rem 1.15rem;
      border-radius: 0.55rem;
      font-size: 0.875rem;
      font-weight: 600;
      line-height: 1.25;
      color: #4b5563;
      background: transparent;
      border: none;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .bdj-tab-btn:hover {
      color: var(--color-text);
    }
    .bdj-tab-btn.is-active {
      background: var(--color-navy);
      color: #ffffff;
      box-shadow: 0 1px 3px rgba(11, 18, 32, 0.18);
    }
    .bdj-card {
      background: var(--color-card);
      border: 1px solid var(--color-border);
      border-radius: 0.9rem;
      padding: 1.25rem 1.4rem;
      box-shadow: 0 1px 3px rgba(11, 18, 32, 0.04);
    }
    .bdj-filtros-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(185px, 1fr));
      gap: 1rem 1.1rem;
    }
    .bdj-field {
      display: flex;
      flex-direction: column;
      gap: 0.42rem;
      min-width: 0;
    }
    .bdj-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #374151;
      line-height: 1.3;
    }
    .bdj-hint {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      line-height: 1.4;
      margin: 0;
    }
    .bdj-input,
    .bdj-select,
    .bdj-textarea {
      width: 100%;
      min-height: 2.65rem;
      padding: 0.6rem 0.9rem;
      border-radius: 0.6rem;
      border: 1px solid var(--color-border);
      background: #ffffff;
      font-size: 0.875rem;
      line-height: 1.4;
      color: var(--color-text);
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .bdj-textarea {
      min-height: 4.3rem;
      padding: 0.7rem 0.9rem;
      resize: vertical;
    }
    .bdj-input:focus,
    .bdj-select:focus,
    .bdj-textarea:focus {
      border-color: var(--color-teal);
      box-shadow: 0 0 0 3px rgba(15, 158, 142, 0.14);
    }
    .bdj-input[readonly],
    .bdj-select:disabled {
      background: #f5f7fa;
      color: var(--color-text);
    }
    .bdj-filter-footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-top: 1.1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--color-border);
    }
    .bdj-chip-group {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.6rem;
    }
    .bdj-chip-label {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--color-text-muted);
      margin-right: 0.15rem;
    }
    .bdj-filter-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.45rem 0.95rem;
      border-radius: 9999px;
      border: 1px solid var(--color-border);
      background: #f8f9fb;
      color: #4b5563;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .bdj-filter-chip:hover {
      background: #eef1f6;
      color: var(--color-text);
    }
    .bdj-filter-chip.is-danger {
      background: var(--color-danger-bg);
      border-color: var(--color-danger);
      color: var(--color-danger);
    }
    .bdj-filter-chip.is-amber {
      background: var(--color-amber-bg);
      border-color: var(--color-amber);
      color: #9a5b04;
    }
    .bdj-chip-dot {
      width: 0.45rem;
      height: 0.45rem;
      border-radius: 9999px;
      background: currentColor;
      opacity: 0.75;
    }
    .bdj-link-btn {
      background: none;
      border: none;
      padding: 0.25rem 0.4rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--color-teal);
      text-decoration: underline;
      cursor: pointer;
    }
    .bdj-link-muted {
      color: var(--color-text-muted);
      font-weight: 500;
    }
    .bdj-link-danger {
      color: var(--color-danger);
    }
    .bdj-table-wrap {
      background: var(--color-card);
      border: 1px solid var(--color-border);
      border-radius: 0.9rem;
      overflow-x: auto;
      box-shadow: 0 1px 3px rgba(11, 18, 32, 0.04);
    }
    .bdj-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.875rem;
    }
    .bdj-table thead th {
      padding: 0.9rem 1.1rem;
      background: #f7f9fc;
      color: var(--color-text-muted);
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      border-bottom: 1px solid var(--color-border);
      white-space: nowrap;
    }
    .bdj-table tbody td {
      padding: 0.95rem 1.1rem;
      border-bottom: 1px solid var(--color-border);
      vertical-align: middle;
      line-height: 1.45;
    }
    .bdj-table tbody tr:last-child td {
      border-bottom: none;
    }
    .bdj-table tbody tr:hover {
      background: #f9fafc;
    }
    .bdj-empty {
      padding: 3.25rem 1.5rem;
      text-align: center;
      color: var(--color-text-muted);
      font-size: 0.9rem;
      line-height: 1.5;
    }
    .bdj-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      border-radius: 9999px;
      padding: 0.28rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 600;
      line-height: 1.2;
      white-space: nowrap;
    }
    .bdj-banner {
      border-radius: 0.75rem;
      padding: 0.95rem 1.15rem;
      font-size: 0.85rem;
      line-height: 1.5;
      border: 1px solid var(--color-border);
      background: #f8f9fb;
    }
    .bdj-banner-teal {
      background: var(--color-teal-bg);
      border-color: rgba(15, 158, 142, 0.45);
      color: #085c52;
    }
    .bdj-banner-amber {
      background: var(--color-amber-bg);
      border-color: rgba(201, 130, 10, 0.45);
      color: #8a5205;
    }
    .bdj-banner-danger {
      background: var(--color-danger-bg);
      border-color: rgba(214, 59, 59, 0.45);
      color: #a12323;
    }
    .bdj-banner-blue {
      background: #edf4ff;
      border-color: #93c5fd;
      color: #1e40af;
    }
    .bdj-modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 60;
      background: rgba(11, 18, 32, 0.62);
      backdrop-filter: blur(2px);
    }
    .bdj-modal-sheet {
      position: fixed;
      inset: 0;
      z-index: 61;
      width: 100vw;
      height: 100dvh;
      max-height: 100dvh;
      background: var(--color-bg);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    @media (min-width: 860px) {
      .bdj-modal-sheet {
        inset: auto;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: min(94vw, 46rem);
        height: auto;
        max-height: 90vh;
        border-radius: 1rem;
        border: 1px solid var(--color-border);
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
      }
    }
    .bdj-modal-header {
      padding: 1.15rem 1.45rem;
      background: var(--color-navy);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-shrink: 0;
    }
    .bdj-modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.35rem 1.45rem;
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
    }
    .bdj-modal-footer {
      padding: 1rem 1.45rem;
      background: var(--color-card);
      border-top: 1px solid var(--color-border);
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
    }
    .bdj-step-card {
      background: var(--color-card);
      border: 1px solid var(--color-border);
      border-radius: 0.9rem;
      padding: 1.2rem 1.35rem;
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
    }
    .bdj-step-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.6rem;
    }
    .bdj-step-title {
      font-size: 0.925rem;
      font-weight: 700;
      color: var(--color-text);
      margin: 0;
    }
    .bdj-scan-row {
      display: flex;
      flex-wrap: wrap;
      align-items: stretch;
      gap: 0.65rem;
    }
    .bdj-scan-btn {
      min-height: 2.95rem;
      border-radius: 0.65rem;
      background: var(--color-navy);
      color: #ffffff;
      border: none;
      font-weight: 600;
      font-size: 0.875rem;
      padding: 0.65rem 1.15rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      cursor: pointer;
      white-space: nowrap;
      transition: background-color 0.15s ease;
    }
    .bdj-scan-btn:hover {
      background: var(--color-navy-light);
    }
    .bdj-choice-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.85rem;
    }
    .bdj-choice-btn {
      min-height: 3.4rem;
      border-radius: 0.75rem;
      border: 2px solid var(--color-border);
      background: var(--color-card);
      padding: 0.8rem 1rem;
      font-weight: 600;
      font-size: 0.925rem;
      color: var(--color-text);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      cursor: pointer;
      transition: all 0.15s ease;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }
    .bdj-choice-btn:hover {
      border-color: #9ca3af;
      background: #f9fafb;
    }
    .bdj-choice-btn.is-yes {
      border-color: var(--color-teal);
      background: var(--color-teal-bg);
      color: #085c52;
      box-shadow: 0 0 0 3px rgba(15, 158, 142, 0.16);
    }
    .bdj-choice-btn.is-no-danger {
      border-color: var(--color-danger);
      background: var(--color-danger-bg);
      color: #991b1b;
      box-shadow: 0 0 0 3px rgba(214, 59, 59, 0.15);
    }
    .bdj-choice-btn.is-no-neutral {
      border-color: var(--color-navy);
      background: #e8ecf4;
      color: var(--color-navy);
      box-shadow: 0 0 0 3px rgba(11, 18, 32, 0.12);
    }
    .bdj-dropdown {
      position: absolute;
      left: 0;
      right: 0;
      top: calc(100% + 0.35rem);
      z-index: 30;
      max-height: 15rem;
      overflow-y: auto;
      background: #ffffff;
      border: 1px solid var(--color-border);
      border-radius: 0.75rem;
      box-shadow: 0 12px 28px rgba(11, 18, 32, 0.14);
    }
    .bdj-dropdown-item {
      width: 100%;
      padding: 0.75rem 1rem;
      text-align: left;
      background: transparent;
      border: none;
      border-bottom: 1px solid var(--color-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      cursor: pointer;
    }
    .bdj-dropdown-item:last-child {
      border-bottom: none;
    }
    .bdj-dropdown-item:hover {
      background: #f4f7fa;
    }
    .bdj-dialog-md {
      position: fixed;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      z-index: 61;
      width: min(94vw, 39rem);
      max-height: 92vh;
      overflow-y: auto;
      background: var(--color-card);
      border-radius: 1rem;
      border: 1px solid var(--color-border);
      padding: 1.45rem 1.6rem;
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
    }
    .bdj-section-box {
      background: #f8fafc;
      border: 1px solid var(--color-border);
      border-radius: 0.8rem;
      padding: 1.05rem 1.15rem;
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
    }
    .bdj-section-box-title {
      font-size: 0.76rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--color-text-muted);
      margin: 0;
    }
    .bdj-two-col {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.95rem;
    }
    @media (min-width: 560px) {
      .bdj-two-col { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    .bdj-scanner-overlay {
      position: fixed;
      inset: 0;
      z-index: 80;
      background: #060a12;
      color: #ffffff;
      display: flex;
      flex-direction: column;
    }
    .bdj-reticle {
      width: min(72vw, 280px);
      height: min(72vw, 280px);
      border: 2px solid rgba(15, 158, 142, 0.9);
      border-radius: 1.25rem;
      box-shadow: 0 0 0 9999px rgba(6, 10, 18, 0.58);
      position: relative;
      pointer-events: none;
    }
  `
}

function bandejasNormalizarTexto(valor) {
  return String(valor ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function bandejasExtraerQr(textoCrudo) {
  const limpio = String(textoCrudo ?? "").trim().toUpperCase()
  if (!limpio) return ""
  if (BANDEJAS_QR_REGEX.test(limpio)) return limpio
  const coincidencia = limpio.match(/[A-Z0-9]{4}-[A-Z0-9]{5}-D0*[1-9][0-9]*/)
  return coincidencia ? coincidencia[0] : limpio
}

function bandejasParsearQr(textoCrudo) {
  const codigoQr = bandejasExtraerQr(textoCrudo)
  if (!codigoQr) {
    return { valido: false, codigoQr: "", error: "Escanea o ingresa un código QR." }
  }
  if (!BANDEJAS_QR_REGEX.test(codigoQr)) {
    return {
      valido: false,
      codigoQr,
      error: "Formato inválido. Debe ser BASE-AUTOBUS-DX (ej. OFOC-55115-D1 o SATU-COMOD-D3).",
    }
  }
  const [basePropietaria, segmentoUnidad, etiquetaDisco] = codigoQr.split("-")
  const esFijo = /^[0-9]{5}$/.test(segmentoUnidad)
  return {
    valido: true,
    codigoQr,
    basePropietaria,
    segmentoUnidad,
    tipoAsignacion: esFijo ? "Fijo" : "Comodín",
    economicoAsignado: esFijo ? segmentoUnidad : null,
    etiquetaDisco,
    error: "",
  }
}

function bandejasFormatearFecha(iso) {
  if (!iso) return "—"
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return "—"
  return fecha.toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function bandejasFormatearHoras(horas) {
  const num = Number(horas ?? 0)
  if (!Number.isFinite(num)) return "0.0 h"
  return `${num.toFixed(1)} h`
}

function bandejasEstiloEstatusDisco(estatus) {
  switch (estatus) {
    case "Instalado en bus":
      return { backgroundColor: "var(--color-teal-bg)", color: "#085c52" }
    case "En base":
      return { backgroundColor: "#e8f0fe", color: "#1d4ed8" }
    case "En tránsito":
      return { backgroundColor: "var(--color-amber-bg)", color: "#92400e" }
    case "En análisis":
      return { backgroundColor: "#f3e8ff", color: "#6b21a8" }
    case "Dañado/Baja":
      return { backgroundColor: "var(--color-danger-bg)", color: "var(--color-danger)" }
    default:
      return { backgroundColor: "#f3f4f6", color: "#374151" }
  }
}

let bandejasPromesaHtml5Qr = null
function bandejasCargarHtml5Qrcode() {
  if (typeof window !== "undefined" && window.Html5Qrcode) {
    return Promise.resolve(window.Html5Qrcode)
  }
  if (bandejasPromesaHtml5Qr) return bandejasPromesaHtml5Qr

  const urls = [
    "https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js",
    "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js",
  ]

  bandejasPromesaHtml5Qr = new Promise((resolve, reject) => {
    let indice = 0
    function intentar() {
      if (indice >= urls.length) {
        bandejasPromesaHtml5Qr = null
        reject(new Error("No se pudo cargar el lector QR en este dispositivo."))
        return
      }
      const script = document.createElement("script")
      script.src = urls[indice++]
      script.async = true
      script.onload = () => {
        if (window.Html5Qrcode) resolve(window.Html5Qrcode)
        else intentar()
      }
      script.onerror = intentar
      document.head.appendChild(script)
    }
    intentar()
  })

  return bandejasPromesaHtml5Qr
}

function BandejasIconoQr({ size = 18 }) {
  return (0, U.jsxs)("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    children: [
      (0, U.jsx)("rect", { x: "3", y: "3", width: "7", height: "7", rx: "1" }),
      (0, U.jsx)("rect", { x: "14", y: "3", width: "7", height: "7", rx: "1" }),
      (0, U.jsx)("rect", { x: "3", y: "14", width: "7", height: "7", rx: "1" }),
      (0, U.jsx)("path", { d: "M14 14h3v3h-3zM20 14v3M14 20h3M20 20h.01" }),
    ],
  })
}

function BandejasEscanerModal({
  abierto,
  titulo,
  subtitulo,
  modoLectura = "qr_bandeja",
  onDetectado,
  onCerrar,
  onUsarManual,
}) {
  const videoRef = S.useRef(null)
  const streamRef = S.useRef(null)
  const html5QrRef = S.useRef(null)
  const timerRef = S.useRef(null)
  const [estadoCamara, setEstadoCamara] = S.useState("iniciando")
  const [mensajeError, setMensajeError] = S.useState("")
  const [avisoLectura, setAvisoLectura] = S.useState("")
  const [linternaDisponible, setLinternaDisponible] = S.useState(false)
  const [linternaActiva, setLinternaActiva] = S.useState(false)
  const [usandoFallbackLib, setUsandoFallbackLib] = S.useState(false)

  const detenerTodo = S.useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try { track.stop() } catch {}
      })
      streamRef.current = null
    }
    if (html5QrRef.current) {
      const instancia = html5QrRef.current
      html5QrRef.current = null
      try {
        if (instancia.isScanning) await instancia.stop()
        instancia.clear()
      } catch {}
    }
  }, [])

  const procesarTextoDetectado = S.useCallback((texto) => {
    if (modoLectura === "serie_disco") {
      const serie = String(texto ?? "").trim().toUpperCase()
      if (serie.length < 4) {
        setAvisoLectura("Código demasiado corto para número de serie.")
        return false
      }
      try { navigator.vibrate?.(70) } catch {}
      onDetectado(serie)
      return true
    }

    const resultado = bandejasParsearQr(texto)
    if (!resultado.valido) {
      setAvisoLectura(`Código leído ("${String(texto).slice(0, 28)}") no tiene formato BASE-AUTOBUS-DX.`)
      return false
    }
    try { navigator.vibrate?.(70) } catch {}
    onDetectado(resultado.codigoQr)
    return true
  }, [modoLectura, onDetectado])

  S.useEffect(() => {
    if (!abierto) return undefined
    let cancelado = false
    setEstadoCamara("iniciando")
    setMensajeError("")
    setAvisoLectura("")
    setLinternaDisponible(false)
    setLinternaActiva(false)
    setUsandoFallbackLib(false)

    async function iniciar() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setEstadoCamara("sin_camara")
        setMensajeError("Este navegador o conexión no tiene acceso directo a la cámara.")
        return
      }

      const formatosDeseados = modoLectura === "serie_disco"
        ? ["qr_code", "code_128", "code_39", "ean_13"]
        : ["qr_code"]

      let formatosSoportados = []
      if ("BarcodeDetector" in window) {
        try {
          const disponibles = await window.BarcodeDetector.getSupportedFormats()
          formatosSoportados = formatosDeseados.filter((f) => Array.isArray(disponibles) && disponibles.includes(f))
        } catch {
          formatosSoportados = []
        }
      }

      if (formatosSoportados.length > 0) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          })
          if (cancelado) {
            stream.getTracks().forEach((t) => t.stop())
            return
          }
          streamRef.current = stream
          const [videoTrack] = stream.getVideoTracks()
          if (videoTrack && typeof videoTrack.getCapabilities === "function") {
            const caps = videoTrack.getCapabilities()
            if (caps && caps.torch) setLinternaDisponible(true)
          }

          if (videoRef.current) {
            videoRef.current.srcObject = stream
            await videoRef.current.play()
          }

          const detector = new window.BarcodeDetector({ formats: formatosSoportados })
          setEstadoCamara("activo")

          let leyendo = false
          timerRef.current = setInterval(async () => {
            if (leyendo || cancelado || !videoRef.current || videoRef.current.readyState < 2) return
            leyendo = true
            try {
              const codigos = await detector.detect(videoRef.current)
              if (codigos && codigos.length > 0) {
                for (const item of codigos) {
                  if (item.rawValue && procesarTextoDetectado(item.rawValue)) {
                    await detenerTodo()
                    break
                  }
                }
              }
            } catch {} finally {
              leyendo = false
            }
          }, 160)
          return
        } catch (err) {
          if (cancelado) return
          if (err?.name === "NotAllowedError" || err?.name === "NotFoundError") {
            setEstadoCamara("sin_camara")
            setMensajeError(
              err.name === "NotAllowedError"
                ? "Permiso de cámara denegado. Autoriza el uso de cámara o utiliza captura alternativa."
                : "No se detectó cámara disponible en este dispositivo."
            )
            return
          }
        }
      }

      try {
        setUsandoFallbackLib(true)
        const Html5Qrcode = await bandejasCargarHtml5Qrcode()
        if (cancelado) return
        const contenedorId = "bdj-html5qr-reader"
        const lector = new Html5Qrcode(contenedorId)
        html5QrRef.current = lector
        await lector.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: modoLectura === "serie_disco" ? 160 : 250 } },
          async (decodedText) => {
            if (procesarTextoDetectado(decodedText)) {
              await detenerTodo()
            }
          },
          () => {}
        )
        if (!cancelado) setEstadoCamara("activo")
      } catch (err) {
        if (cancelado) return
        setEstadoCamara("sin_camara")
        setMensajeError(err?.message || "No fue posible iniciar la cámara para escanear.")
      }
    }

    iniciar()
    return () => {
      cancelado = true
      detenerTodo()
    }
  }, [abierto, detenerTodo, modoLectura, procesarTextoDetectado])

  async function alternarLinterna() {
    const track = streamRef.current?.getVideoTracks?.()?.[0]
    if (!track) return
    try {
      const nuevo = !linternaActiva
      await track.applyConstraints({ advanced: [{ torch: nuevo }] })
      setLinternaActiva(nuevo)
    } catch {}
  }

  async function escanearDesdeFoto(evento) {
    const archivo = evento.target.files?.[0]
    if (!archivo) return
    setAvisoLectura("Analizando imagen…")
    try {
      if ("BarcodeDetector" in window) {
        const bitmap = await createImageBitmap(archivo)
        const formatos = modoLectura === "serie_disco" ? ["qr_code", "code_128", "code_39"] : ["qr_code"]
        const detector = new window.BarcodeDetector({ formats: formatos })
        const codigos = await detector.detect(bitmap)
        if (codigos?.length && procesarTextoDetectado(codigos[0].rawValue)) {
          await detenerTodo()
          return
        }
      }
      const Html5Qrcode = await bandejasCargarHtml5Qrcode()
      const tempDivId = "bdj-html5qr-file-temp"
      let tempDiv = document.getElementById(tempDivId)
      if (!tempDiv) {
        tempDiv = document.createElement("div")
        tempDiv.id = tempDivId
        tempDiv.style.display = "none"
        document.body.appendChild(tempDiv)
      }
      const lectorArchivo = new Html5Qrcode(tempDivId)
      const texto = await lectorArchivo.scanFile(archivo, false)
      lectorArchivo.clear()
      if (procesarTextoDetectado(texto)) {
        await detenerTodo()
      }
    } catch {
      setAvisoLectura("No se detectó un código legible en la fotografía. Intenta acercar más la etiqueta.")
    } finally {
      evento.target.value = ""
    }
  }

  if (!abierto) return null

  return (0, U.jsxs)("div", {
    className: "bdj-scanner-overlay",
    role: "dialog",
    "aria-modal": true,
    children: [
      (0, U.jsxs)("div", {
        style: { padding: "1.1rem 1.35rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.85rem", borderBottom: "1px solid rgba(255,255,255,0.14)", background: "#0b1220" },
        children: [
          (0, U.jsxs)("div", {
            children: [
              (0, U.jsx)("h3", { style: { fontWeight: 700, fontSize: "1rem", color: "#fff", margin: 0 }, children: titulo }),
              subtitulo && (0, U.jsx)("p", { style: { fontSize: "0.8rem", color: "rgba(255,255,255,0.72)", marginTop: "0.2rem" }, children: subtitulo }),
            ],
          }),
          (0, U.jsxs)("div", {
            style: { display: "flex", alignItems: "center", gap: "0.6rem" },
            children: [
              linternaDisponible && (0, U.jsx)("button", {
                type: "button",
                onClick: alternarLinterna,
                style: { padding: "0.55rem 0.95rem", borderRadius: "0.55rem", border: "1px solid rgba(255,255,255,0.25)", background: linternaActiva ? "var(--color-amber)" : "rgba(255,255,255,0.1)", color: "#fff", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" },
                children: linternaActiva ? "Apagar luz" : "Linterna",
              }),
              (0, U.jsx)("button", {
                type: "button",
                onClick: async () => {
                  await detenerTodo()
                  onCerrar()
                },
                style: { padding: "0.55rem 1rem", borderRadius: "0.55rem", border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" },
                children: "Cerrar",
              }),
            ],
          }),
        ],
      }),
      (0, U.jsxs)("div", {
        style: { position: "relative", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: "1.25rem" },
        children: [
          !usandoFallbackLib && estadoCamara !== "sin_camara" && (0, U.jsx)("video", {
            ref: videoRef,
            playsInline: true,
            muted: true,
            autoPlay: true,
            style: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" },
          }),
          usandoFallbackLib && (0, U.jsx)("div", {
            id: "bdj-html5qr-reader",
            style: { width: "min(92vw, 380px)", borderRadius: "1rem", overflow: "hidden" },
          }),
          !usandoFallbackLib && estadoCamara === "activo" && (0, U.jsx)("div", { className: "bdj-reticle" }),
          estadoCamara === "iniciando" && (0, U.jsx)("p", {
            style: { position: "relative", zIndex: 2, background: "rgba(11,18,32,0.88)", padding: "0.8rem 1.35rem", borderRadius: "999px", fontSize: "0.9rem" },
            children: "Activando cámara trasera…",
          }),
          estadoCamara === "sin_camara" && (0, U.jsxs)("div", {
            style: { maxWidth: "25rem", background: "#16223a", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "1rem", padding: "1.5rem", textAlign: "center" },
            children: [
              (0, U.jsx)("p", { style: { fontWeight: 700, fontSize: "1rem", color: "#fff", marginBottom: "0.5rem" }, children: "Escáner en vivo no disponible" }),
              (0, U.jsx)("p", { style: { fontSize: "0.875rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.5, marginBottom: "1.2rem" }, children: mensajeError }),
              (0, U.jsxs)("div", {
                style: { display: "flex", flexDirection: "column", gap: "0.7rem" },
                children: [
                  (0, U.jsxs)("label", {
                    style: { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "0.8rem 1rem", borderRadius: "0.7rem", background: "var(--color-teal)", color: "#fff", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" },
                    children: [
                      "Tomar foto del código",
                      (0, U.jsx)("input", { type: "file", accept: "image/*", capture: "environment", onChange: escanearDesdeFoto, style: { display: "none" } }),
                    ],
                  }),
                  (0, U.jsx)("button", {
                    type: "button",
                    onClick: async () => {
                      await detenerTodo()
                      onUsarManual()
                    },
                    style: { width: "100%", padding: "0.8rem 1rem", borderRadius: "0.7rem", border: "1px solid rgba(255,255,255,0.3)", background: "transparent", color: "#fff", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" },
                    children: "Usar captura manual",
                  }),
                ],
              }),
            ],
          }),
          avisoLectura && (0, U.jsx)("p", {
            style: { position: "absolute", bottom: "1.25rem", left: "1.25rem", right: "1.25rem", zIndex: 3, background: "rgba(201,130,10,0.95)", color: "#fff", padding: "0.75rem 1rem", borderRadius: "0.75rem", fontSize: "0.85rem", textAlign: "center", fontWeight: 500 },
            children: avisoLectura,
          }),
        ],
      }),
      (0, U.jsxs)("div", {
        style: { padding: "1rem 1.35rem", background: "#0b1220", borderTop: "1px solid rgba(255,255,255,0.14)", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.85rem" },
        children: [
          (0, U.jsx)("span", {
            style: { fontSize: "0.8rem", color: "rgba(255,255,255,0.72)" },
            children: modoLectura === "serie_disco"
              ? "Apunta al código de barras o QR del número de serie (S/N)"
              : "Apunta al QR de la bandeja (ej. OFOC-55115-D1)",
          }),
          (0, U.jsxs)("div", {
            style: { display: "flex", alignItems: "center", gap: "1rem" },
            children: [
              (0, U.jsxs)("label", {
                style: { fontSize: "0.8rem", fontWeight: 600, color: "var(--color-teal)", textDecoration: "underline", cursor: "pointer" },
                children: [
                  "Escanear desde foto",
                  (0, U.jsx)("input", { type: "file", accept: "image/*", capture: "environment", onChange: escanearDesdeFoto, style: { display: "none" } }),
                ],
              }),
              (0, U.jsx)("button", {
                type: "button",
                onClick: async () => {
                  await detenerTodo()
                  onUsarManual()
                },
                style: { fontSize: "0.8rem", color: "rgba(255,255,255,0.68)", textDecoration: "underline", background: "none", border: "none", cursor: "pointer" },
                children: "Escáner no disponible",
              }),
            ],
          }),
        ],
      }),
    ],
  })
}

function BandejasModalRegistrarCambio({
  abierto,
  onCerrar,
  onGuardado,
  usuario,
  esJefatura,
  basesAutorizadas,
  opcionesBases,
  flota,
  discosCatalogo,
  modoDemoSinSesion,
}) {
  const baseInicial = S.useMemo(() => {
    const directa = String(usuario?.Base ?? "").trim().toUpperCase()
    if (directa) return directa
    if (Array.isArray(basesAutorizadas) && basesAutorizadas.length > 0) return basesAutorizadas[0]
    return ""
  }, [usuario, basesAutorizadas])

  const [baseEjecucion, setBaseEjecucion] = S.useState(baseInicial)
  const [busquedaBus, setBusquedaBus] = S.useState("")
  const [busAbierto, setBusAbierto] = S.useState(false)
  const [busSeleccionado, setBusSeleccionado] = S.useState(null)
  const [estadoBus, setEstadoBus] = S.useState(null)
  const [consultandoBus, setConsultandoBus] = S.useState(false)

  const [sinBandejaPrevia, setSinBandejaPrevia] = S.useState(false)
  const [discoBajadoQr, setDiscoBajadoQr] = S.useState("")
  const [infoDiscoBajado, setInfoDiscoBajado] = S.useState(null)
  const [manualBajadoActivo, setManualBajadoActivo] = S.useState(false)

  const [discoSubidoQr, setDiscoSubidoQr] = S.useState("")
  const [infoDiscoSubido, setInfoDiscoSubido] = S.useState(null)
  const [manualSubidoActivo, setManualSubidoActivo] = S.useState(false)

  const [motivoDiscrepancia, setMotivoDiscrepancia] = S.useState("")
  const [dvrGrabando, setDvrGrabando] = S.useState(null)
  const [discoFormateado, setDiscoFormateado] = S.useState(null)

  const [escanerObjetivo, setEscanerObjetivo] = S.useState(null)
  const [guardando, setGuardando] = S.useState(false)
  const [errorModal, setErrorModal] = S.useState("")

  S.useEffect(() => {
    if (!abierto) return
    setBaseEjecucion(baseInicial)
    setBusquedaBus("")
    setBusAbierto(false)
    setBusSeleccionado(null)
    setEstadoBus(null)
    setConsultandoBus(false)
    setSinBandejaPrevia(false)
    setDiscoBajadoQr("")
    setInfoDiscoBajado(null)
    setManualBajadoActivo(false)
    setDiscoSubidoQr("")
    setInfoDiscoSubido(null)
    setManualSubidoActivo(false)
    setMotivoDiscrepancia("")
    setDvrGrabando(null)
    setDiscoFormateado(null)
    setEscanerObjetivo(null)
    setGuardando(false)
    setErrorModal("")
  }, [abierto, baseInicial])

  const autobusesFiltrados = S.useMemo(() => {
    const q = bandejasNormalizarTexto(busquedaBus)
    const fuente = Array.isArray(flota) ? flota : []
    if (!q) return fuente.slice(0, 30)
    return fuente
      .filter((b) => bandejasNormalizarTexto(`${b.autobus} ${b.base ?? ""} ${b.servicio ?? ""}`).includes(q))
      .slice(0, 40)
  }, [flota, busquedaBus])

  async function elegirAutobus(bus) {
    setBusSeleccionado(bus)
    setBusquedaBus(bus.autobus)
    setBusAbierto(false)
    setErrorModal("")
    setEstadoBus({
      economico: bus.autobus,
      base_flota: bus.base,
      servicio: bus.servicio,
      ultimo_disco_subido: bus.ultimo_disco_subido ?? null,
      ultimo_cambio_at: bus.ultimo_cambio_at ?? null,
      ultima_base_ejecucion: bus.ultima_base_ejecucion ?? null,
    })

    if (modoDemoSinSesion) return
    setConsultandoBus(true)
    try {
      const { data, error } = await H.rpc("fn_consultar_estado_bus_bandeja", { p_economico: bus.autobus })
      if (!error && data) {
        setEstadoBus(data)
      }
    } catch {} finally {
      setConsultandoBus(false)
    }
  }

  async function consultarDetalleQr(codigo, tipo) {
    const parsed = bandejasParsearQr(codigo)
    if (!parsed.valido) {
      if (tipo === "bajado") setInfoDiscoBajado({ invalido: true, error: parsed.error })
      else setInfoDiscoSubido({ invalido: true, error: parsed.error })
      return
    }
    if (modoDemoSinSesion) {
      const local = discosCatalogo.find((d) => d.codigo_qr === parsed.codigoQr)
      const payload = local
        ? { existe: true, ...local }
        : {
            existe: false,
            codigo_qr: parsed.codigoQr,
            base_propietaria: parsed.basePropietaria,
            tipo_asignacion: parsed.tipoAsignacion,
            economico_asignado: parsed.economicoAsignado,
          }
      if (tipo === "bajado") setInfoDiscoBajado(payload)
      else setInfoDiscoSubido(payload)
      return
    }
    try {
      const { data, error } = await H.rpc("fn_consultar_disco_qr", { p_codigo_qr: parsed.codigoQr })
      if (error) throw error
      if (tipo === "bajado") setInfoDiscoBajado(data)
      else setInfoDiscoSubido(data)
    } catch (err) {
      const fallback = {
        existe: false,
        codigo_qr: parsed.codigoQr,
        base_propietaria: parsed.basePropietaria,
        tipo_asignacion: parsed.tipoAsignacion,
        economico_asignado: parsed.economicoAsignado,
        aviso: err?.message,
      }
      if (tipo === "bajado") setInfoDiscoBajado(fallback)
      else setInfoDiscoSubido(fallback)
    }
  }

  function aplicarQrBajado(valor) {
    const limpio = bandejasExtraerQr(valor)
    setSinBandejaPrevia(false)
    setDiscoBajadoQr(limpio)
    setErrorModal("")
    if (limpio) consultarDetalleQr(limpio, "bajado")
    else setInfoDiscoBajado(null)
  }

  function aplicarQrSubido(valor) {
    const limpio = bandejasExtraerQr(valor)
    setDiscoSubidoQr(limpio)
    setErrorModal("")
    if (limpio) consultarDetalleQr(limpio, "subido")
    else setInfoDiscoSubido(null)
  }

  const parsedBajado = S.useMemo(() => (sinBandejaPrevia ? null : bandejasParsearQr(discoBajadoQr)), [sinBandejaPrevia, discoBajadoQr])
  const parsedSubido = S.useMemo(() => bandejasParsearQr(discoSubidoQr), [discoSubidoQr])

  const discoEsperado = estadoBus?.ultimo_disco_subido ?? null

  const evaluacionCustodia = S.useMemo(() => {
    if (!busSeleccionado) return { estado: "pendiente_bus", ok: null, mensaje: "" }
    if (!sinBandejaPrevia && !discoBajadoQr) return { estado: "pendiente_bajada", ok: null, mensaje: "" }
    if (!sinBandejaPrevia && !parsedBajado?.valido) {
      return { estado: "qr_invalido", ok: false, mensaje: parsedBajado?.error || "Código QR inválido" }
    }

    if (discoEsperado) {
      if (sinBandejaPrevia) {
        return {
          estado: "discrepancia",
          ok: false,
          mensaje: `Ruptura de cadena de custodia: la unidad tenía registrado el disco ${discoEsperado} y se reporta sin bandeja instalada.`,
        }
      }
      if (parsedBajado.codigoQr === discoEsperado) {
        return {
          estado: "ok",
          ok: true,
          mensaje: `Cadena de custodia íntegra: coincide con el último disco subido (${discoEsperado}).`,
        }
      }
      return {
        estado: "discrepancia",
        ok: false,
        mensaje: `Discrepancia detectada: se esperaba retirar ${discoEsperado}, pero se escaneó ${parsedBajado.codigoQr}.`,
      }
    }

    if (sinBandejaPrevia) {
      return {
        estado: "discrepancia",
        ok: false,
        mensaje: "La unidad llegó sin bandeja instalada. Registra el motivo para documentar la apertura de custodia.",
      }
    }
    if (parsedBajado.tipoAsignacion === "Fijo" && parsedBajado.economicoAsignado !== busSeleccionado.autobus) {
      return {
        estado: "discrepancia",
        ok: false,
        mensaje: `El disco retirado (${parsedBajado.codigoQr}) es Fijo asignado al autobús ${parsedBajado.economicoAsignado}, distinto a la unidad ${busSeleccionado.autobus}.`,
      }
    }
    return {
      estado: "ok_inicial",
      ok: true,
      mensaje: "Primer registro en sistema para esta unidad. Se establecerá línea base de custodia.",
    }
  }, [busSeleccionado, sinBandejaPrevia, discoBajadoQr, parsedBajado, discoEsperado])

  const mismoDiscoError = !sinBandejaPrevia && parsedBajado?.valido && parsedSubido?.valido && parsedBajado.codigoQr === parsedSubido.codigoQr
  const subidoDanadoError = infoDiscoSubido?.existe && infoDiscoSubido?.estatus_actual === "Dañado/Baja"
  const motivoValido = evaluacionCustodia.ok !== false || motivoDiscrepancia.trim().length >= 5

  const formularioCompleto = Boolean(
    busSeleccionado &&
    baseEjecucion &&
    (sinBandejaPrevia || parsedBajado?.valido) &&
    parsedSubido?.valido &&
    !mismoDiscoError &&
    !subidoDanadoError &&
    evaluacionCustodia.ok !== null &&
    motivoValido &&
    dvrGrabando !== null &&
    discoFormateado !== null
  )

  const basesSeleccionables = S.useMemo(() => {
    if (esJefatura) return opcionesBases
    if (Array.isArray(basesAutorizadas) && basesAutorizadas.length > 1) {
      return opcionesBases.filter((op) => basesAutorizadas.includes(op.clave))
    }
    return []
  }, [esJefatura, basesAutorizadas, opcionesBases])

  async function guardarCambio(evento) {
    evento.preventDefault()
    if (!formularioCompleto || guardando) return
    if (modoDemoSinSesion) {
      setErrorModal("Estás en sesión demostrativa local sin token de Supabase. Inicia sesión con una clave real para guardar en base de datos.")
      return
    }
    setGuardando(true)
    setErrorModal("")
    try {
      const { data, error } = await H.rpc("fn_registrar_cambio_bandeja", {
        p_economico: busSeleccionado.autobus,
        p_disco_bajado_qr: sinBandejaPrevia ? null : parsedBajado.codigoQr,
        p_disco_subido_qr: parsedSubido.codigoQr,
        p_dvr_grabando: dvrGrabando,
        p_disco_formateado: discoFormateado,
        p_motivo_discrepancia: evaluacionCustodia.ok === false ? motivoDiscrepancia.trim() : null,
        p_base_ejecucion: baseEjecucion,
      })
      if (error) throw error
      onGuardado(data)
    } catch (err) {
      setErrorModal(err?.message || "No se pudo registrar el cambio de bandeja.")
    } finally {
      setGuardando(false)
    }
  }

  if (!abierto) return null

  return (0, U.jsxs)(U.Fragment, {
    children: [
      (0, U.jsx)("div", { className: "bdj-modal-backdrop", onClick: () => !guardando && onCerrar() }),
      (0, U.jsxs)("form", {
        onSubmit: guardarCambio,
        className: "bdj-modal-sheet",
        role: "dialog",
        "aria-modal": true,
        "aria-labelledby": "bdj-titulo-registrar",
        children: [
          (0, U.jsxs)("div", {
            className: "bdj-modal-header",
            children: [
              (0, U.jsxs)("div", {
                children: [
                  (0, U.jsx)("h3", { id: "bdj-titulo-registrar", style: { fontFamily: "var(--font-display)", fontSize: "1.125rem", fontWeight: 700, margin: 0 }, children: "Registrar Cambio de Bandeja" }),
                  (0, U.jsxs)("p", { style: { fontSize: "0.78rem", color: "rgba(255,255,255,0.72)", marginTop: "0.25rem" }, children: ["Técnico: ", usuario?.Empleado || usuario?.Nombre || "Colaborador", " · Base activa: ", baseEjecucion || "Sin asignar"] }),
                ],
              }),
              (0, U.jsx)("button", {
                type: "button",
                disabled: guardando,
                onClick: onCerrar,
                style: { padding: "0.5rem 0.95rem", borderRadius: "0.55rem", border: "1px solid rgba(255,255,255,0.24)", background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" },
                children: "Cerrar",
              }),
            ],
          }),

          (0, U.jsxs)("div", {
            className: "bdj-modal-body",
            children: [
              errorModal && (0, U.jsx)("div", {
                role: "alert",
                className: "bdj-banner bdj-banner-danger",
                style: { fontWeight: 600 },
                children: errorModal,
              }),

              basesSeleccionables.length > 0 && (0, U.jsxs)("div", {
                className: "bdj-step-card",
                children: [
                  (0, U.jsx)("label", { className: "bdj-label", children: "Base de ejecución física" }),
                  (0, U.jsxs)("select", {
                    value: baseEjecucion,
                    onChange: (e) => setBaseEjecucion(e.target.value),
                    className: "bdj-select",
                    children: [
                      !baseEjecucion && (0, U.jsx)("option", { value: "", children: "Selecciona la base donde realizas el cambio…" }),
                      ...basesSeleccionables.map((b) => (0, U.jsx)("option", { value: b.clave, children: `${b.clave} — ${b.nombre}` }, b.clave)),
                    ],
                  }),
                ],
              }),

              // PASO 1: Autobús
              (0, U.jsxs)("section", {
                className: "bdj-step-card",
                children: [
                  (0, U.jsxs)("div", {
                    className: "bdj-step-header",
                    children: [
                      (0, U.jsx)("h4", { className: "bdj-step-title", children: "1. Autobús (Económico)" }),
                      busSeleccionado && (0, U.jsx)("button", {
                        type: "button",
                        onClick: () => {
                          setBusSeleccionado(null)
                          setEstadoBus(null)
                          setBusquedaBus("")
                          setBusAbierto(true)
                        },
                        className: "bdj-link-btn",
                        children: "Cambiar unidad",
                      }),
                    ],
                  }),
                  (0, U.jsxs)("div", {
                    style: { position: "relative" },
                    children: [
                      (0, U.jsx)("input", {
                        type: "text",
                        inputMode: "search",
                        value: busquedaBus,
                        onFocus: () => setBusAbierto(true),
                        onChange: (e) => {
                          setBusquedaBus(e.target.value)
                          setBusSeleccionado(null)
                          setEstadoBus(null)
                          setBusAbierto(true)
                        },
                        placeholder: "Escribe el número económico (ej. 55115 o 20015)…",
                        className: "bdj-input tabular",
                        style: { fontSize: "1rem", fontWeight: 600 },
                      }),
                      busAbierto && !busSeleccionado && (0, U.jsx)("div", {
                        className: "bdj-dropdown",
                        children: autobusesFiltrados.length > 0
                          ? autobusesFiltrados.map((b) => (0, U.jsxs)("button", {
                              type: "button",
                              onClick: () => elegirAutobus(b),
                              className: "bdj-dropdown-item",
                              children: [
                                (0, U.jsxs)("div", {
                                  children: [
                                    (0, U.jsx)("span", { className: "tabular", style: { fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text)" }, children: b.autobus }),
                                    (0, U.jsxs)("span", { style: { marginLeft: "0.6rem", fontSize: "0.8rem", color: "var(--color-text-muted)" }, children: [b.base || "Sin base", " · ", b.servicio || "Servicio estándar"] }),
                                  ],
                                }),
                                b.ultimo_disco_subido && (0, U.jsx)("span", {
                                  className: "bdj-pill tabular",
                                  style: { background: "var(--color-teal-bg)", color: "var(--color-teal)" },
                                  children: b.ultimo_disco_subido,
                                }),
                              ],
                            }, b.id || b.autobus))
                          : (0, U.jsx)("div", { style: { padding: "1rem", textAlign: "center", fontSize: "0.85rem", color: "var(--color-text-muted)" }, children: "No se encontraron autobuses con ese criterio." }),
                      }),
                    ],
                  }),

                  busSeleccionado && (0, U.jsx)("div", {
                    className: `bdj-banner ${discoEsperado ? "bdj-banner-teal" : ""}`,
                    children: consultandoBus
                      ? (0, U.jsx)("p", { style: { margin: 0, color: "var(--color-text-muted)" }, children: "Verificando último movimiento de bandeja en la unidad…" })
                      : discoEsperado
                        ? (0, U.jsxs)("div", {
                            style: { display: "flex", flexDirection: "column", gap: "0.3rem" },
                            children: [
                              (0, U.jsx)("p", { style: { margin: 0, fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }, children: "Último disco registrado como subido en esta unidad" }),
                              (0, U.jsxs)("div", {
                                style: { display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: "0.5rem" },
                                children: [
                                  (0, U.jsx)("span", { className: "tabular", style: { fontSize: "1.15rem", fontWeight: 700, color: "var(--color-text)" }, children: discoEsperado }),
                                  estadoBus?.horas_en_unidad != null && (0, U.jsxs)("span", {
                                    className: "tabular",
                                    style: { fontSize: "0.8rem", fontWeight: 600 },
                                    children: ["Tiempo instalado: ", bandejasFormatearHoras(estadoBus.horas_en_unidad)],
                                  }),
                                ],
                              }),
                              (0, U.jsxs)("p", {
                                style: { margin: 0, fontSize: "0.8rem", opacity: 0.88 },
                                children: [
                                  "Subido el ",
                                  bandejasFormatearFecha(estadoBus?.ultimo_cambio_at),
                                  estadoBus?.ultima_base_ejecucion ? ` en base ${estadoBus.ultima_base_ejecucion}` : "",
                                  estadoBus?.ultimo_tecnico_nombre ? ` por ${estadoBus.ultimo_tecnico_nombre}` : "",
                                ],
                              }),
                            ],
                          })
                        : (0, U.jsxs)("div", {
                            style: { display: "flex", flexDirection: "column", gap: "0.25rem" },
                            children: [
                              (0, U.jsx)("p", { style: { margin: 0, fontSize: "0.8rem", fontWeight: 700, color: "var(--color-text)" }, children: "Sin registro previo de bandeja en esta unidad" }),
                              (0, U.jsx)("p", { style: { margin: 0, fontSize: "0.8rem", color: "var(--color-text-muted)" }, children: "Este movimiento registrará la trazabilidad inicial del autobús en el sistema." }),
                            ],
                          }),
                  }),
                ],
              }),

              // PASO 2: Bandeja que BAJA
              (0, U.jsxs)("section", {
                className: "bdj-step-card",
                children: [
                  (0, U.jsxs)("div", {
                    className: "bdj-step-header",
                    children: [
                      (0, U.jsx)("h4", { className: "bdj-step-title", children: "2. Bandeja que BAJA (Retirada del autobús)" }),
                      (0, U.jsxs)("label", {
                        style: { display: "inline-flex", alignItems: "center", gap: "0.45rem", fontSize: "0.8rem", color: "var(--color-text-muted)", cursor: "pointer" },
                        children: [
                          (0, U.jsx)("input", {
                            type: "checkbox",
                            checked: sinBandejaPrevia,
                            onChange: (e) => {
                              const marcado = e.target.checked
                              setSinBandejaPrevia(marcado)
                              if (marcado) {
                                setDiscoBajadoQr("")
                                setInfoDiscoBajado(null)
                                setManualBajadoActivo(false)
                              }
                            },
                          }),
                          "Unidad llegó sin bandeja",
                        ],
                      }),
                    ],
                  }),

                  !sinBandejaPrevia && (0, U.jsxs)(U.Fragment, {
                    children: [
                      (0, U.jsxs)("div", {
                        className: "bdj-scan-row",
                        children: [
                          (0, U.jsx)("input", {
                            type: "text",
                            readOnly: !manualBajadoActivo,
                            value: discoBajadoQr,
                            onChange: (e) => manualBajadoActivo && aplicarQrBajado(e.target.value),
                            placeholder: manualBajadoActivo ? "Ej. OFOC-55115-D1" : "Usa el botón Escanear QR…",
                            style: { flex: "1 1 200px", fontSize: "1rem", fontWeight: 600 },
                            className: "bdj-input tabular",
                          }),
                          (0, U.jsxs)("button", {
                            type: "button",
                            onClick: () => setEscanerObjetivo("bajado"),
                            className: "bdj-scan-btn",
                            children: [(0, U.jsx)(BandejasIconoQr, {}), "Escanear QR"],
                          }),
                        ],
                      }),
                      (0, U.jsxs)("div", {
                        style: { display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" },
                        children: [
                          discoBajadoQr
                            ? (0, U.jsx)("button", {
                                type: "button",
                                onClick: () => {
                                  setDiscoBajadoQr("")
                                  setInfoDiscoBajado(null)
                                },
                                className: "bdj-link-btn bdj-link-danger",
                                children: "Limpiar lectura",
                              })
                            : (0, U.jsx)("span", {}),
                          (0, U.jsx)("button", {
                            type: "button",
                            onClick: () => setManualBajadoActivo((v) => !v),
                            className: "bdj-link-btn bdj-link-muted",
                            children: manualBajadoActivo ? "Bloquear entrada manual" : "¿Escáner no disponible? Captura manual",
                          }),
                        ],
                      }),
                    ],
                  }),

                  evaluacionCustodia.ok === true && (0, U.jsx)("div", {
                    className: "bdj-banner bdj-banner-teal",
                    style: { fontWeight: 600 },
                    children: evaluacionCustodia.mensaje,
                  }),

                  evaluacionCustodia.ok === false && (0, U.jsxs)("div", {
                    className: "bdj-banner bdj-banner-danger",
                    style: { display: "flex", flexDirection: "column", gap: "0.8rem" },
                    children: [
                      (0, U.jsx)("p", { style: { margin: 0, fontWeight: 700 }, children: evaluacionCustodia.mensaje }),
                      parsedBajado?.valido || sinBandejaPrevia
                        ? (0, U.jsxs)("div", {
                            style: { display: "flex", flexDirection: "column", gap: "0.6rem" },
                            children: [
                              (0, U.jsx)("label", {
                                style: { fontSize: "0.8rem", fontWeight: 700, color: "var(--color-text)" },
                                children: "Motivo de discrepancia en cadena de custodia (Obligatorio):",
                              }),
                              (0, U.jsx)("div", {
                                style: { display: "flex", flexWrap: "wrap", gap: "0.45rem" },
                                children: BANDEJAS_MOTIVOS_SUGERIDOS.map((sugerencia) => (0, U.jsx)("button", {
                                  type: "button",
                                  onClick: () => setMotivoDiscrepancia(sugerencia),
                                  style: { padding: "0.35rem 0.7rem", borderRadius: "9999px", background: "#fff", border: "1px solid var(--color-border)", fontSize: "0.75rem", fontWeight: 500, color: "var(--color-text)", cursor: "pointer" },
                                  children: sugerencia,
                                }, sugerencia)),
                              }),
                              (0, U.jsx)("textarea", {
                                rows: 2,
                                value: motivoDiscrepancia,
                                onChange: (e) => setMotivoDiscrepancia(e.target.value),
                                placeholder: "Explica por qué el disco retirado no coincide con el último registrado (mínimo 5 caracteres)…",
                                className: "bdj-textarea",
                                style: { borderColor: "var(--color-danger)" },
                                required: true,
                              }),
                            ],
                          })
                        : null,
                    ],
                  }),
                ],
              }),

              // PASO 3: Bandeja que SUBE
              (0, U.jsxs)("section", {
                className: "bdj-step-card",
                children: [
                  (0, U.jsx)("h4", { className: "bdj-step-title", children: "3. Bandeja que SUBE (Instalada en el autobús)" }),
                  (0, U.jsxs)("div", {
                    className: "bdj-scan-row",
                    children: [
                      (0, U.jsx)("input", {
                        type: "text",
                        readOnly: !manualSubidoActivo,
                        value: discoSubidoQr,
                        onChange: (e) => manualSubidoActivo && aplicarQrSubido(e.target.value),
                        placeholder: manualSubidoActivo ? "Ej. SATU-COMOD-D3" : "Usa el botón Escanear QR…",
                        style: { flex: "1 1 200px", fontSize: "1rem", fontWeight: 600 },
                        className: "bdj-input tabular",
                      }),
                      (0, U.jsxs)("button", {
                        type: "button",
                        onClick: () => setEscanerObjetivo("subido"),
                        className: "bdj-scan-btn",
                        children: [(0, U.jsx)(BandejasIconoQr, {}), "Escanear QR"],
                      }),
                    ],
                  }),
                  (0, U.jsxs)("div", {
                    style: { display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" },
                    children: [
                      discoSubidoQr
                        ? (0, U.jsx)("button", {
                            type: "button",
                            onClick: () => {
                              setDiscoSubidoQr("")
                              setInfoDiscoSubido(null)
                            },
                            className: "bdj-link-btn bdj-link-danger",
                            children: "Limpiar lectura",
                          })
                        : (0, U.jsx)("span", {}),
                      (0, U.jsx)("button", {
                        type: "button",
                        onClick: () => setManualSubidoActivo((v) => !v),
                        className: "bdj-link-btn bdj-link-muted",
                        children: manualSubidoActivo ? "Bloquear entrada manual" : "¿Escáner no disponible? Captura manual",
                      }),
                    ],
                  }),

                  discoSubidoQr && !parsedSubido.valido && (0, U.jsx)("div", {
                    className: "bdj-banner bdj-banner-danger",
                    style: { fontWeight: 600 },
                    children: parsedSubido.error,
                  }),

                  mismoDiscoError && (0, U.jsx)("div", {
                    className: "bdj-banner bdj-banner-danger",
                    style: { fontWeight: 600 },
                    children: "La bandeja que sube no puede ser el mismo disco que se acaba de retirar.",
                  }),

                  parsedSubido.valido && !mismoDiscoError && infoDiscoSubido && (0, U.jsxs)("div", {
                    className: `bdj-banner ${subidoDanadoError ? "bdj-banner-danger" : infoDiscoSubido.existe ? "" : "bdj-banner-blue"}`,
                    style: { display: "flex", flexDirection: "column", gap: "0.3rem" },
                    children: [
                      subidoDanadoError
                        ? (0, U.jsx)("p", { style: { margin: 0, fontWeight: 700 }, children: "Este disco está marcado como Dañado/Baja y no puede instalarse en una unidad." })
                        : infoDiscoSubido.existe
                          ? (0, U.jsxs)(U.Fragment, {
                              children: [
                                (0, U.jsxs)("p", {
                                  style: { margin: 0, fontWeight: 700, color: "var(--color-text)" },
                                  children: [
                                    "Disco en catálogo · ",
                                    infoDiscoSubido.tipo_bandeja || "Bandeja sin especificar",
                                    " · ",
                                    infoDiscoSubido.tipo_disco || "Medio sin especificar",
                                  ],
                                }),
                                (0, U.jsxs)("p", {
                                  style: { margin: 0, fontSize: "0.8rem", color: "var(--color-text-muted)" },
                                  children: [
                                    infoDiscoSubido.numero_serie_disco ? `S/N: ${infoDiscoSubido.numero_serie_disco} · ` : "",
                                    "Acumulado: ",
                                    bandejasFormatearHoras(infoDiscoSubido.horas_uso_acumuladas),
                                    " · Formateos: ",
                                    infoDiscoSubido.conteo_formateos ?? 0,
                                  ],
                                }),
                              ],
                            })
                          : (0, U.jsxs)("p", {
                              style: { margin: 0, fontWeight: 600 },
                              children: [
                                "Alta rápida automática: el QR es válido (",
                                parsedSubido.tipoAsignacion,
                                " · Base ",
                                parsedSubido.basePropietaria,
                                ") y se registrará en tbl_discos al guardar (después podrás completar su S/N y tipo de bandeja en Inventario).",
                              ],
                            }),
                      busSeleccionado && parsedSubido.tipoAsignacion === "Fijo" && parsedSubido.economicoAsignado !== busSeleccionado.autobus && !subidoDanadoError && (0, U.jsx)("p", {
                        style: { margin: "0.2rem 0 0 0", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-amber)" },
                        children: `Aviso operativo: este disco tiene etiqueta Fija del económico ${parsedSubido.economicoAsignado} y se instalará en ${busSeleccionado.autobus}.`,
                      }),
                    ],
                  }),
                ],
              }),

              // PASO 4: DVR y Formateo (SIN valores por defecto)
              (0, U.jsxs)("section", {
                className: "bdj-step-card",
                children: [
                  (0, U.jsxs)("div", {
                    className: "bdj-step-header",
                    children: [
                      (0, U.jsx)("h4", { className: "bdj-step-title", children: "4. Verificación operativa de DVR y Disco" }),
                      (dvrGrabando === null || discoFormateado === null) && (0, U.jsx)("span", {
                        className: "bdj-pill",
                        style: { background: "var(--color-amber-bg)", color: "#9a5b04" },
                        children: "Selección obligatoria",
                      }),
                    ],
                  }),

                  (0, U.jsxs)("div", {
                    style: { display: "flex", flexDirection: "column", gap: "0.55rem" },
                    children: [
                      (0, U.jsx)("p", { style: { margin: 0, fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text)" }, children: "¿El DVR quedó encendiendo y grabando video correctamente?" }),
                      (0, U.jsxs)("div", {
                        className: "bdj-choice-grid",
                        role: "group",
                        "aria-label": "Estado de grabación del DVR",
                        children: [
                          (0, U.jsx)("button", {
                            type: "button",
                            "aria-pressed": dvrGrabando === true,
                            onClick: () => setDvrGrabando(true),
                            className: `bdj-choice-btn ${dvrGrabando === true ? "is-yes" : ""}`,
                            children: "Sí, grabando",
                          }),
                          (0, U.jsx)("button", {
                            type: "button",
                            "aria-pressed": dvrGrabando === false,
                            onClick: () => setDvrGrabando(false),
                            className: `bdj-choice-btn ${dvrGrabando === false ? "is-no-danger" : ""}`,
                            children: "No graba / Falla",
                          }),
                        ],
                      }),
                    ],
                  }),

                  (0, U.jsxs)("div", {
                    style: { display: "flex", flexDirection: "column", gap: "0.55rem", paddingTop: "0.35rem" },
                    children: [
                      (0, U.jsx)("p", { style: { margin: 0, fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text)" }, children: "¿La bandeja que sube fue formateada en este cambio?" }),
                      (0, U.jsxs)("div", {
                        className: "bdj-choice-grid",
                        role: "group",
                        "aria-label": "Estado de formateo del disco",
                        children: [
                          (0, U.jsx)("button", {
                            type: "button",
                            "aria-pressed": discoFormateado === true,
                            onClick: () => setDiscoFormateado(true),
                            className: `bdj-choice-btn ${discoFormateado === true ? "is-yes" : ""}`,
                            children: "Sí, formateado",
                          }),
                          (0, U.jsx)("button", {
                            type: "button",
                            "aria-pressed": discoFormateado === false,
                            onClick: () => setDiscoFormateado(false),
                            className: `bdj-choice-btn ${discoFormateado === false ? "is-no-neutral" : ""}`,
                            children: "No formateado",
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          (0, U.jsxs)("div", {
            className: "bdj-modal-footer",
            children: [
              !formularioCompleto && (0, U.jsx)("p", {
                style: { margin: 0, fontSize: "0.8rem", textAlign: "center", color: "var(--color-text-muted)" },
                children: !busSeleccionado
                  ? "Selecciona un autobús para comenzar."
                  : (!sinBandejaPrevia && !parsedBajado?.valido)
                    ? "Escanea el código QR de la bandeja que baja."
                    : !parsedSubido?.valido
                      ? "Escanea el código QR de la bandeja que sube."
                      : !motivoValido
                        ? "Captura el motivo de discrepancia en la cadena de custodia."
                        : dvrGrabando === null || discoFormateado === null
                          ? "Selecciona explícitamente Sí o No en DVR Grabando y Disco Formateado."
                          : "Revisa las alertas antes de guardar.",
              }),
              (0, U.jsx)("button", {
                type: "submit",
                disabled: !formularioCompleto || guardando,
                className: "bdj-btn bdj-btn-primary",
                style: { width: "100%", minHeight: "3.2rem", fontSize: "0.975rem" },
                children: guardando ? "Guardando cambio…" : "Guardar Cambio de Bandeja",
              }),
            ],
          }),
        ],
      }),

      (0, U.jsx)(BandejasEscanerModal, {
        abierto: Boolean(escanerObjetivo),
        titulo: escanerObjetivo === "bajado" ? "Escanear Bandeja que BAJA" : "Escanear Bandeja que SUBE",
        subtitulo: busSeleccionado ? `Autobús ${busSeleccionado.autobus}` : "",
        modoLectura: "qr_bandeja",
        onDetectado: (qr) => {
          const destino = escanerObjetivo
          setEscanerObjetivo(null)
          if (destino === "bajado") aplicarQrBajado(qr)
          else if (destino === "subido") aplicarQrSubido(qr)
        },
        onCerrar: () => setEscanerObjetivo(null),
        onUsarManual: () => {
          const destino = escanerObjetivo
          setEscanerObjetivo(null)
          if (destino === "bajado") setManualBajadoActivo(true)
          else if (destino === "subido") setManualSubidoActivo(true)
        },
      }),
    ],
  })
}

function BandejasModalGestionDisco({
  abierto,
  discoInicial,
  onCerrar,
  onActualizado,
  usuario,
  esJefatura,
  basesAutorizadas,
  opcionesBases,
  modoDemoSinSesion,
}) {
  const baseDefault = String(discoInicial?.ubicacion_base_actual || usuario?.Base || basesAutorizadas?.[0] || "").trim().toUpperCase()
  const [codigoQr, setCodigoQr] = S.useState(discoInicial?.codigo_qr || "")
  const [tipoDisco, setTipoDisco] = S.useState(discoInicial?.tipo_disco || "")
  const [tipoBandeja, setTipoBandeja] = S.useState(discoInicial?.tipo_bandeja || "")
  const [numeroSerie, setNumeroSerie] = S.useState(discoInicial?.numero_serie_disco || "")
  const [estatusActualDisco, setEstatusActualDisco] = S.useState(discoInicial?.estatus_actual || "")
  const [economicoInstalado, setEconomicoInstalado] = S.useState(discoInicial?.economico_actual || "")
  const [nuevoEstatus, setNuevoEstatus] = S.useState(
    discoInicial?.estatus_actual && discoInicial.estatus_actual !== "Instalado en bus"
      ? discoInicial.estatus_actual
      : "En base"
  )
  const [ubicacionBase, setUbicacionBase] = S.useState(baseDefault)
  const [notas, setNotas] = S.useState(discoInicial?.notas || "")
  const [escanerModo, setEscanerModo] = S.useState(null) // 'qr' | 'serie' | null
  const [guardando, setGuardando] = S.useState(false)
  const [error, setError] = S.useState("")

  S.useEffect(() => {
    if (!abierto) return
    setCodigoQr(discoInicial?.codigo_qr || "")
    setTipoDisco(discoInicial?.tipo_disco || "")
    setTipoBandeja(discoInicial?.tipo_bandeja || "")
    setNumeroSerie(discoInicial?.numero_serie_disco || "")
    setEstatusActualDisco(discoInicial?.estatus_actual || "")
    setEconomicoInstalado(discoInicial?.economico_actual || "")
    setNuevoEstatus(
      discoInicial?.estatus_actual && discoInicial.estatus_actual !== "Instalado en bus"
        ? discoInicial.estatus_actual
        : "En base"
    )
    setUbicacionBase(String(discoInicial?.ubicacion_base_actual || usuario?.Base || basesAutorizadas?.[0] || "").trim().toUpperCase())
    setNotas(discoInicial?.notas || "")
    setEscanerModo(null)
    setGuardando(false)
    setError("")
  }, [abierto, discoInicial, usuario, basesAutorizadas])

  async function precargarSiExiste(qrTexto) {
    const parsedCheck = bandejasParsearQr(qrTexto)
    if (!parsedCheck.valido || modoDemoSinSesion || discoInicial) return
    try {
      const { data, error: err } = await H.rpc("fn_consultar_disco_qr", { p_codigo_qr: parsedCheck.codigoQr })
      if (!err && data?.existe) {
        setEstatusActualDisco(data.estatus_actual || "")
        setEconomicoInstalado(data.economico_actual || "")
        if (data.tipo_disco) setTipoDisco(data.tipo_disco)
        if (data.tipo_bandeja) setTipoBandeja(data.tipo_bandeja)
        if (data.numero_serie_disco) setNumeroSerie(data.numero_serie_disco)
        if (data.ubicacion_base_actual) setUbicacionBase(data.ubicacion_base_actual)
        if (data.notas) setNotas(data.notas)
        if (data.estatus_actual && data.estatus_actual !== "Instalado en bus") {
          setNuevoEstatus(data.estatus_actual)
        }
      } else {
        setEstatusActualDisco("")
        setEconomicoInstalado("")
      }
    } catch {}
  }

  function manejarCambioTipoDisco(valor) {
    setTipoDisco(valor)
    if (valor === 'HDD SATA 3.5"') {
      setTipoBandeja('Cartucho 3.5" Streamax (X3NPro)')
    } else if (valor === "SSD M.2 SATA") {
      setTipoBandeja("Módulo M.2 Extraíble (M1N 2.0)")
    } else if (valor === "MicroSD Videovigilancia" || valor === "SD / SDXC Videovigilancia") {
      setTipoBandeja("Ranura Directa (Sin Caddy)")
    } else if (
      (valor === 'HDD SATA 2.5"' || valor === 'SSD SATA 2.5"') &&
      ["Ranura Directa (Sin Caddy)", "Módulo M.2 Extraíble (M1N 2.0)", 'Cartucho 3.5" Streamax (X3NPro)'].includes(tipoBandeja)
    ) {
      if (valor === 'HDD SATA 2.5"' || tipoBandeja !== 'Cartucho 3.5" Streamax (X3NPro)') {
        setTipoBandeja("")
      }
    }
  }

  if (!abierto) return null

  const parsed = bandejasParsearQr(codigoQr)
  const estaInstaladoEnBus = estatusActualDisco === "Instalado en bus"
  const estatusPermitidos = ["En base", "En tránsito", "En análisis", "Dañado/Baja"]
  const listaBases = esJefatura
    ? opcionesBases
    : opcionesBases.filter((b) => basesAutorizadas.includes(b.clave) || b.clave === ubicacionBase)

  const requiereHardware = !estatusActualDisco // En alta nueva pedimos tipo de medio y tipo de bandeja
  const hardwareCompleto = !requiereHardware || Boolean(tipoDisco && tipoBandeja)

  async function guardar(e) {
    e.preventDefault()
    if (!parsed.valido || (!estaInstaladoEnBus && !ubicacionBase) || !hardwareCompleto || guardando) return
    if (modoDemoSinSesion) {
      setError("Inicia sesión con una cuenta real para guardar discos en Supabase.")
      return
    }
    setGuardando(true)
    setError("")
    try {
      const { data, error: rpcError } = await H.rpc("fn_guardar_ficha_disco", {
        p_codigo_qr: parsed.codigoQr,
        p_nuevo_estatus: estaInstaladoEnBus ? "Instalado en bus" : nuevoEstatus,
        p_ubicacion_base: ubicacionBase,
        p_tipo_bandeja: tipoBandeja || null,
        p_tipo_disco: tipoDisco || null,
        p_numero_serie_disco: numeroSerie.trim().toUpperCase() || null,
        p_notas: notas.trim() || null,
      })
      if (rpcError) throw rpcError
      onActualizado(data)
    } catch (err) {
      setError(err?.message || "No se pudo guardar la ficha del disco.")
    } finally {
      setGuardando(false)
    }
  }

  return (0, U.jsxs)(U.Fragment, {
    children: [
      (0, U.jsx)("div", { className: "bdj-modal-backdrop", onClick: () => !guardando && onCerrar() }),
      (0, U.jsxs)("form", {
        onSubmit: guardar,
        className: "bdj-dialog-md",
        children: [
          (0, U.jsxs)("div", {
            style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", paddingBottom: "0.9rem", borderBottom: "1px solid var(--color-border)" },
            children: [
              (0, U.jsxs)("div", {
                children: [
                  (0, U.jsx)("h3", { style: { fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 700, margin: 0 }, children: discoInicial ? "Ficha Técnica y Estatus de Bandeja" : "Alta / Ficha Técnica de Bandeja" }),
                  (0, U.jsx)("p", { className: "bdj-hint", style: { marginTop: "0.2rem" }, children: "Vincula el código QR con el tipo de Caddy, medio de almacenamiento y número de serie físico." }),
                ],
              }),
              (0, U.jsx)("button", { type: "button", onClick: onCerrar, className: "bdj-btn", style: { padding: "0.42rem 0.9rem", minHeight: "2.15rem", fontSize: "0.8rem" }, children: "Cerrar" }),
            ],
          }),

          error && (0, U.jsx)("div", { className: "bdj-banner bdj-banner-danger", style: { fontWeight: 600 }, children: error }),

          // Identificación QR
          (0, U.jsxs)("div", {
            className: "bdj-field",
            children: [
              (0, U.jsx)("label", { className: "bdj-label", children: "Código QR de la Bandeja" }),
              (0, U.jsxs)("div", {
                style: { display: "flex", gap: "0.6rem" },
                children: [
                  (0, U.jsx)("input", {
                    type: "text",
                    readOnly: Boolean(discoInicial),
                    value: codigoQr,
                    onChange: (e) => {
                      const val = e.target.value.toUpperCase()
                      setCodigoQr(val)
                      if (BANDEJAS_QR_REGEX.test(val.trim())) precargarSiExiste(val)
                    },
                    placeholder: "Ej. OFOC-55115-D1 o SATU-COMOD-D3",
                    className: "bdj-input tabular",
                    style: { flex: 1, fontWeight: 700 },
                  }),
                  !discoInicial && (0, U.jsxs)("button", {
                    type: "button",
                    onClick: () => setEscanerModo("qr"),
                    className: "bdj-btn bdj-btn-navy",
                    children: [(0, U.jsx)(BandejasIconoQr, { size: 16 }), "Escanear QR"],
                  }),
                ],
              }),
              codigoQr && (0, U.jsx)("p", {
                style: { margin: "0.2rem 0 0 0", fontSize: "0.8rem", fontWeight: 600, color: parsed.valido ? "var(--color-teal)" : "var(--color-danger)" },
                children: parsed.valido
                  ? `${estatusActualDisco ? "Ya registrado en catálogo" : "Nuevo ingreso"} · Base propietaria: ${parsed.basePropietaria} · Asignación: ${parsed.tipoAsignacion}`
                  : parsed.error,
              }),
            ],
          }),

          // Bloque Hardware: Medio + Tipo de Bandeja + Número de Serie
          (0, U.jsxs)("div", {
            className: "bdj-section-box",
            children: [
              (0, U.jsx)("p", { className: "bdj-section-box-title", children: "Especificación Física del Almacenamiento" }),
              (0, U.jsxs)("div", {
                className: "bdj-two-col",
                children: [
                  (0, U.jsxs)("label", {
                    className: "bdj-field",
                    children: [
                      (0, U.jsx)("span", { className: "bdj-label", children: "Tipo de medio de almacenamiento" }),
                      (0, U.jsxs)("select", {
                        value: tipoDisco,
                        onChange: (e) => manejarCambioTipoDisco(e.target.value),
                        className: "bdj-select",
                        children: [
                          (0, U.jsx)("option", { value: "", children: "Selecciona el medio…" }),
                          ...BANDEJAS_TIPOS_DISCO.map((op) => (0, U.jsx)("option", { value: op.value, children: op.label }, op.value)),
                        ],
                      }),
                    ],
                  }),
                  (0, U.jsxs)("label", {
                    className: "bdj-field",
                    children: [
                      (0, U.jsx)("span", { className: "bdj-label", children: "Tipo de bandeja / encapsulado" }),
                      (0, U.jsxs)("select", {
                        value: tipoBandeja,
                        onChange: (e) => setTipoBandeja(e.target.value),
                        className: "bdj-select",
                        children: [
                          (0, U.jsx)("option", { value: "", children: "Selecciona tipo de bandeja…" }),
                          ...BANDEJAS_TIPOS_BANDEJA.map((op) => (0, U.jsx)("option", { value: op.value, children: op.label }, op.value)),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              (0, U.jsxs)("div", {
                className: "bdj-field",
                children: [
                  (0, U.jsx)("label", { className: "bdj-label", children: "Número de serie del disco / memoria (S/N)" }),
                  (0, U.jsxs)("div", {
                    style: { display: "flex", gap: "0.6rem" },
                    children: [
                      (0, U.jsx)("input", {
                        type: "text",
                        value: numeroSerie,
                        onChange: (e) => setNumeroSerie(e.target.value.toUpperCase()),
                        placeholder: "Ej. WX52A819402 (impreso en la etiqueta del HDD / SSD / MicroSD)",
                        className: "bdj-input tabular",
                        style: { flex: 1, fontWeight: 600 },
                      }),
                      (0, U.jsx)("button", {
                        type: "button",
                        onClick: () => setEscanerModo("serie"),
                        className: "bdj-btn",
                        title: "Escanear código de barras o QR de serie del fabricante",
                        children: "Leer S/N",
                      }),
                    ],
                  }),
                  (0, U.jsx)("p", { className: "bdj-hint", children: "El sistema valida que un mismo número de serie no se asigne a dos bandejas activas." }),
                ],
              }),
            ],
          }),

          // Estatus y Ubicación
          estaInstaladoEnBus
            ? (0, U.jsxs)("div", {
                className: "bdj-banner bdj-banner-teal",
                children: [
                  (0, U.jsx)("strong", { children: `Instalado actualmente en el autobús ${economicoInstalado}. ` }),
                  "Puedes guardar su número de serie, tipo de bandeja y medio sin desmontarlo (para cambiar su estatus físico usa «Registrar Cambio»).",
                ],
              })
            : (0, U.jsxs)("div", {
                className: "bdj-two-col",
                children: [
                  (0, U.jsxs)("label", {
                    className: "bdj-field",
                    children: [
                      (0, U.jsx)("span", { className: "bdj-label", children: "Estatus operativo" }),
                      (0, U.jsx)("select", {
                        value: nuevoEstatus,
                        onChange: (e) => setNuevoEstatus(e.target.value),
                        className: "bdj-select",
                        children: estatusPermitidos.map((est) => (0, U.jsx)("option", { value: est, children: est }, est)),
                      }),
                    ],
                  }),
                  (0, U.jsxs)("label", {
                    className: "bdj-field",
                    children: [
                      (0, U.jsx)("span", { className: "bdj-label", children: "Ubicación (Base actual)" }),
                      listaBases.length > 0
                        ? (0, U.jsx)("select", {
                            value: ubicacionBase,
                            onChange: (e) => setUbicacionBase(e.target.value),
                            className: "bdj-select",
                            children: listaBases.map((b) => (0, U.jsx)("option", { value: b.clave, children: `${b.clave} — ${b.nombre}` }, b.clave)),
                          })
                        : (0, U.jsx)("input", {
                            type: "text",
                            maxLength: 4,
                            value: ubicacionBase,
                            onChange: (e) => setUbicacionBase(e.target.value.toUpperCase()),
                            className: "bdj-input tabular",
                          }),
                    ],
                  }),
                ],
              }),

          (0, U.jsxs)("label", {
            className: "bdj-field",
            children: [
              (0, U.jsx)("span", { className: "bdj-label", children: "Notas u observaciones (opcional)" }),
              (0, U.jsx)("textarea", {
                rows: 2,
                value: notas,
                onChange: (e) => setNotas(e.target.value),
                placeholder: "Ej. Capacidad 1 TB WD Purple, enviado a monitoreo por incidente, sector dañado, etc.",
                className: "bdj-textarea",
              }),
            ],
          }),

          !hardwareCompleto && parsed.valido && (0, U.jsx)("p", {
            className: "bdj-hint",
            style: { textAlign: "center", color: "var(--color-amber)", fontWeight: 600 },
            children: "Selecciona el tipo de medio y el tipo de bandeja para dar de alta este registro.",
          }),

          (0, U.jsx)("button", {
            type: "submit",
            disabled: !parsed.valido || (!estaInstaladoEnBus && !ubicacionBase) || !hardwareCompleto || guardando,
            className: "bdj-btn bdj-btn-navy",
            style: { width: "100%", minHeight: "3rem" },
            children: guardando ? "Guardando…" : "Guardar Ficha de Disco",
          }),
        ],
      }),
      (0, U.jsx)(BandejasEscanerModal, {
        abierto: Boolean(escanerModo),
        titulo: escanerModo === "serie" ? "Escanear Número de Serie (S/N)" : "Escanear QR de la Bandeja",
        subtitulo: escanerModo === "serie" ? "Código de barras o QR impreso en el disco" : "",
        modoLectura: escanerModo === "serie" ? "serie_disco" : "qr_bandeja",
        onDetectado: (valor) => {
          const modo = escanerModo
          setEscanerModo(null)
          if (modo === "serie") {
            setNumeroSerie(valor)
          } else {
            setCodigoQr(valor)
            precargarSiExiste(valor)
          }
        },
        onCerrar: () => setEscanerModo(null),
        onUsarManual: () => setEscanerModo(null),
      }),
    ],
  })
}

function BandejasModulo() {
  const { usuario } = Uc()
  const nivel = bandejasNormalizarTexto(usuario?.Nivel)
  const esJefatura = ["jefe", "gerente"].includes(nivel)
  const puedeRegistrarCambio = ["auxiliar", "tecnico", "coordinador", "jefe", "gerente"].includes(nivel)
  const modoDemoSinSesion = typeof localStorage !== "undefined" && localStorage.getItem("modo_demo_jefe") === "true"

  const basesAutorizadas = S.useMemo(() => {
    const lista = Array.isArray(usuario?.Bases) && usuario.Bases.length > 0
      ? usuario.Bases
      : usuario?.Base
        ? [usuario.Base]
        : []
    return Array.from(new Set(lista.map((b) => String(b ?? "").trim().toUpperCase()).filter(Boolean)))
  }, [usuario])

  const [subVista, setSubVista] = S.useState("cambios")
  const [cambios, setCambios] = S.useState([])
  const [discos, setDiscos] = S.useState([])
  const [flota, setFlota] = S.useState([])
  const [catalogoBases, setCatalogoBases] = S.useState([])
  const [cargando, setCargando] = S.useState(true)
  const [errorCarga, setErrorCarga] = S.useState("")
  const [avisoExito, setAvisoExito] = S.useState("")

  // Filtros de Historial de Cambios
  const [filtroBase, setFiltroBase] = S.useState("")
  const [filtroEconomico, setFiltroEconomico] = S.useState("")
  const [filtroQr, setFiltroQr] = S.useState("")
  const [filtroDesde, setFiltroDesde] = S.useState("")
  const [filtroHasta, setFiltroHasta] = S.useState("")
  const [soloDiscrepancias, setSoloDiscrepancias] = S.useState(false)
  const [soloDvrFalla, setSoloDvrFalla] = S.useState(false)

  // Filtros de Inventario de Discos
  const [filtroDiscoBase, setFiltroDiscoBase] = S.useState("")
  const [filtroDiscoEstatus, setFiltroDiscoEstatus] = S.useState("")
  const [filtroDiscoBandeja, setFiltroDiscoBandeja] = S.useState("")
  const [filtroDiscoMedio, setFiltroDiscoMedio] = S.useState("")
  const [filtroDiscoTexto, setFiltroDiscoTexto] = S.useState("")
  const [ordenDiscos, setOrdenDiscos] = S.useState("horas_desc")

  // Modales
  const [modalCambioAbierto, setModalCambioAbierto] = S.useState(false)
  const [modalDiscoEstado, setModalDiscoEstado] = S.useState({ abierto: false, disco: null })

  S.useEffect(() => {
    bandejasInyectarEstilos()
  }, [])

  const cargarDatos = S.useCallback(async () => {
    setCargando(true)
    setErrorCarga("")
    if (modoDemoSinSesion) {
      setCambios([])
      setDiscos([])
      setFlota([])
      setCatalogoBases([
        { clave: "TOCC", nombre: "OCCIDENTE" },
        { clave: "TSAT", nombre: "SATURNO" },
        { clave: "GDLJ", nombre: "GUADALAJARA" },
        { clave: "MORE", nombre: "MORELIA" },
      ])
      setCargando(false)
      return
    }
    try {
      const [cambiosRes, discosRes, flotaRes, basesRes] = await Promise.all([
        H.from("tbl_cambios_bandejas")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(esJefatura ? 1000 : 400),
        H.from("tbl_discos")
          .select("*")
          .order("ultimo_movimiento_at", { ascending: false }),
        H.rpc("fn_bandejas_listar_flota"),
        H.rpc("fn_listar_bases"),
      ])

      if (cambiosRes.error) throw cambiosRes.error
      if (discosRes.error) throw discosRes.error
      if (flotaRes.error) throw flotaRes.error

      setCambios(cambiosRes.data ?? [])
      setDiscos(discosRes.data ?? [])
      setFlota(flotaRes.data ?? [])
      setCatalogoBases(basesRes.data ?? [])
    } catch (err) {
      setErrorCarga(err?.message || "Error al consultar la información de bandejas en Supabase.")
    } finally {
      setCargando(false)
    }
  }, [esJefatura, modoDemoSinSesion])

  S.useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  const opcionesBases = S.useMemo(() => {
    const mapa = new Map()
    for (const b of catalogoBases) {
      if (b?.clave) mapa.set(String(b.clave).toUpperCase(), b.nombre || b.clave)
    }
    for (const c of cambios) {
      if (c?.base_ejecucion && !mapa.has(c.base_ejecucion)) mapa.set(c.base_ejecucion, c.base_ejecucion)
    }
    for (const d of discos) {
      if (d?.base_propietaria && !mapa.has(d.base_propietaria)) mapa.set(d.base_propietaria, d.base_propietaria)
      if (d?.ubicacion_base_actual && !mapa.has(d.ubicacion_base_actual)) mapa.set(d.ubicacion_base_actual, d.ubicacion_base_actual)
    }
    return Array.from(mapa.entries())
      .map(([clave, nombre]) => ({ clave, nombre }))
      .sort((a, b) => a.clave.localeCompare(b.clave))
  }, [catalogoBases, cambios, discos])

  const cambiosFiltrados = S.useMemo(() => {
    const ecoQ = filtroEconomico.trim().toLowerCase()
    const qrQ = filtroQr.trim().toUpperCase()
    const tsDesde = filtroDesde ? new Date(`${filtroDesde}T00:00:00`).getTime() : null
    const tsHasta = filtroHasta ? new Date(`${filtroHasta}T23:59:59.999`).getTime() : null

    return cambios.filter((fila) => {
      if (filtroBase && fila.base_ejecucion !== filtroBase) return false
      if (ecoQ && !String(fila.economico ?? "").toLowerCase().includes(ecoQ)) return false
      if (qrQ) {
        const textoQr = `${fila.disco_bajado_qr ?? ""} ${fila.disco_subido_qr ?? ""} ${fila.disco_esperado_qr ?? ""}`.toUpperCase()
        if (!textoQr.includes(qrQ)) return false
      }
      if (soloDiscrepancias && fila.cadena_custodia_ok !== false) return false
      if (soloDvrFalla && fila.dvr_grabando !== false) return false
      if (tsDesde !== null || tsHasta !== null) {
        const t = new Date(fila.created_at).getTime()
        if (tsDesde !== null && t < tsDesde) return false
        if (tsHasta !== null && t > tsHasta) return false
      }
      return true
    })
  }, [cambios, filtroBase, filtroEconomico, filtroQr, filtroDesde, filtroHasta, soloDiscrepancias, soloDvrFalla])

  const discosFiltrados = S.useMemo(() => {
    const q = filtroDiscoTexto.trim().toUpperCase()
    const filtrados = discos.filter((d) => {
      if (filtroDiscoBase && d.base_propietaria !== filtroDiscoBase && d.ubicacion_base_actual !== filtroDiscoBase) return false
      if (filtroDiscoEstatus && d.estatus_actual !== filtroDiscoEstatus) return false
      if (filtroDiscoBandeja && d.tipo_bandeja !== filtroDiscoBandeja) return false
      if (filtroDiscoMedio && d.tipo_disco !== filtroDiscoMedio) return false
      if (q) {
        const cadena = `${d.codigo_qr} ${d.numero_serie_disco ?? ""} ${d.economico_actual ?? ""} ${d.economico_asignado ?? ""} ${d.ubicacion_base_actual ?? ""}`.toUpperCase()
        if (!cadena.includes(q)) return false
      }
      return true
    })

    return [...filtrados].sort((a, b) => {
      if (ordenDiscos === "horas_desc") {
        return Number(b.horas_uso_acumuladas ?? 0) - Number(a.horas_uso_acumuladas ?? 0) || (b.conteo_formateos ?? 0) - (a.conteo_formateos ?? 0)
      }
      if (ordenDiscos === "formateos_desc") {
        return (b.conteo_formateos ?? 0) - (a.conteo_formateos ?? 0) || Number(b.horas_uso_acumuladas ?? 0) - Number(a.horas_uso_acumuladas ?? 0)
      }
      if (ordenDiscos === "reciente") {
        return new Date(b.ultimo_movimiento_at ?? 0).getTime() - new Date(a.ultimo_movimiento_at ?? 0).getTime()
      }
      return String(a.codigo_qr).localeCompare(String(b.codigo_qr))
    })
  }, [discos, filtroDiscoBase, filtroDiscoEstatus, filtroDiscoBandeja, filtroDiscoMedio, filtroDiscoTexto, ordenDiscos])

  function exportarCsvCambios() {
    if (cambiosFiltrados.length === 0) return
    const encabezados = [
      "Fecha_Hora",
      "Economico",
      "Base_Ejecucion",
      "Disco_Esperado_QR",
      "Disco_Bajado_QR",
      "Horas_Ciclo_Bajado",
      "Disco_Subido_QR",
      "Disco_Formateado",
      "DVR_Grabando",
      "Cadena_Custodia_OK",
      "Motivo_Discrepancia",
      "Tecnico",
    ]
    const escapar = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`
    const filas = cambiosFiltrados.map((c) => [
      bandejasFormatearFecha(c.created_at),
      c.economico,
      c.base_ejecucion,
      c.disco_esperado_qr || "",
      c.disco_bajado_qr || "SIN BANDEJA",
      Number(c.horas_ciclo_bajado ?? 0).toFixed(2),
      c.disco_subido_qr,
      c.disco_formateado ? "SI" : "NO",
      c.dvr_grabando ? "SI" : "NO",
      c.cadena_custodia_ok ? "OK" : "RUPTURA",
      c.motivo_discrepancia || "",
      c.tecnico_nombre || "",
    ])
    const csv = [encabezados, ...filas].map((r) => r.map(escapar).join(",")).join("\r\n")
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `historial_bandejas_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportarCsvDiscos() {
    if (discosFiltrados.length === 0) return
    const encabezados = [
      "Codigo_QR",
      "Base_Propietaria",
      "Tipo_Asignacion",
      "Tipo_Bandeja",
      "Tipo_Disco",
      "Numero_Serie_Disco",
      "Estatus_Actual",
      "Economico_Actual",
      "Ubicacion_Base_Actual",
      "Horas_Uso_Acumuladas",
      "Conteo_Formateos",
      "Ultimo_Movimiento",
      "Notas",
    ]
    const escapar = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`
    const filas = discosFiltrados.map((d) => [
      d.codigo_qr,
      d.base_propietaria,
      d.tipo_asignacion,
      d.tipo_bandeja || "",
      d.tipo_disco || "",
      d.numero_serie_disco || "",
      d.estatus_actual,
      d.economico_actual || "",
      d.ubicacion_base_actual,
      Number(d.horas_uso_acumuladas ?? 0).toFixed(2),
      d.conteo_formateos ?? 0,
      bandejasFormatearFecha(d.ultimo_movimiento_at),
      d.notas || "",
    ])
    const csv = [encabezados, ...filas].map((r) => r.map(escapar).join(",")).join("\r\n")
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `inventario_discos_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const etiquetaAlcance = esJefatura
    ? "Panorama global · Todas las bases"
    : basesAutorizadas.length > 0
      ? `Base operativa: ${basesAutorizadas.join(", ")}`
      : "Alcance por base"

  const hayFiltrosCambios = Boolean(filtroBase || filtroEconomico || filtroQr || filtroDesde || filtroHasta || soloDiscrepancias || soloDvrFalla)
  const hayFiltrosDiscos = Boolean(filtroDiscoBase || filtroDiscoEstatus || filtroDiscoBandeja || filtroDiscoMedio || filtroDiscoTexto)

  return (0, U.jsxs)("div", {
    className: "bdj-page",
    children: [
      // Encabezado principal
      (0, U.jsxs)("div", {
        className: "bdj-header",
        children: [
          (0, U.jsxs)("div", {
            className: "bdj-header-info",
            children: [
              (0, U.jsxs)("div", {
                className: "bdj-title-row",
                children: [
                  (0, U.jsx)("h2", { className: "bdj-title", children: "Control de Bandejas CCTV" }),
                  (0, U.jsx)("span", {
                    className: "bdj-pill",
                    style: { background: "var(--color-teal-bg)", color: "#085c52" },
                    children: etiquetaAlcance,
                  }),
                ],
              }),
              (0, U.jsx)("p", {
                className: "bdj-subtitle",
                children: "Registro y auditoría de cambios físicos de discos, cadena de custodia y horas de uso acumuladas.",
              }),
            ],
          }),
          (0, U.jsxs)("div", {
            className: "bdj-actions",
            children: [
              (0, U.jsx)("button", {
                type: "button",
                onClick: cargarDatos,
                disabled: cargando,
                className: "bdj-btn",
                children: cargando ? "Actualizando…" : "Actualizar",
              }),
              (0, U.jsx)("button", {
                type: "button",
                onClick: () => setModalDiscoEstado({ abierto: true, disco: null }),
                className: "bdj-btn",
                children: "Alta / Ficha Disco",
              }),
              puedeRegistrarCambio && (0, U.jsxs)("button", {
                type: "button",
                onClick: () => {
                  setAvisoExito("")
                  setModalCambioAbierto(true)
                },
                className: "bdj-btn bdj-btn-primary",
                children: [(0, U.jsx)(BandejasIconoQr, { size: 17 }), "Registrar Cambio"],
              }),
            ],
          }),
        ],
      }),

      modoDemoSinSesion && (0, U.jsx)("div", {
        className: "bdj-banner bdj-banner-amber",
        children: "Modo demostración activo (sin token de Supabase). Puedes explorar toda la interfaz y el formulario táctil de cambio; para consultar o guardar registros reales inicia sesión con tu clave de colaborador.",
      }),

      errorCarga && (0, U.jsx)("div", {
        role: "alert",
        className: "bdj-banner bdj-banner-danger",
        style: { fontWeight: 600 },
        children: errorCarga,
      }),

      avisoExito && (0, U.jsxs)("div", {
        role: "status",
        className: "bdj-banner bdj-banner-teal",
        style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", fontWeight: 600 },
        children: [
          (0, U.jsx)("span", { children: avisoExito }),
          (0, U.jsx)("button", { type: "button", onClick: () => setAvisoExito(""), className: "bdj-link-btn", children: "Ocultar" }),
        ],
      }),

      // Barra de navegación interna + Exportar CSV
      (0, U.jsxs)("div", {
        className: "bdj-toolbar",
        children: [
          (0, U.jsxs)("div", {
            className: "bdj-segmented",
            role: "tablist",
            children: [
              (0, U.jsx)("button", {
                type: "button",
                role: "tab",
                "aria-selected": subVista === "cambios",
                onClick: () => setSubVista("cambios"),
                className: `bdj-tab-btn ${subVista === "cambios" ? "is-active" : ""}`,
                children: `Historial de Cambios (${cambiosFiltrados.length})`,
              }),
              (0, U.jsx)("button", {
                type: "button",
                role: "tab",
                "aria-selected": subVista === "discos",
                onClick: () => setSubVista("discos"),
                className: `bdj-tab-btn ${subVista === "discos" ? "is-active" : ""}`,
                children: `Inventario de Discos (${discosFiltrados.length})`,
              }),
            ],
          }),
          (0, U.jsx)("button", {
            type: "button",
            onClick: subVista === "cambios" ? exportarCsvCambios : exportarCsvDiscos,
            disabled: (subVista === "cambios" ? cambiosFiltrados.length : discosFiltrados.length) === 0,
            className: "bdj-btn",
            children: "Exportar CSV",
          }),
        ],
      }),

      // SUB-VISTA 1: HISTORIAL DE CAMBIOS
      subVista === "cambios" && (0, U.jsxs)(U.Fragment, {
        children: [
          (0, U.jsxs)("div", {
            className: "bdj-card",
            children: [
              (0, U.jsxs)("div", {
                className: "bdj-filtros-grid",
                children: [
                  (esJefatura || basesAutorizadas.length > 1) && (0, U.jsxs)("label", {
                    className: "bdj-field",
                    children: [
                      (0, U.jsx)("span", { className: "bdj-label", children: "Base de ejecución" }),
                      (0, U.jsxs)("select", {
                        value: filtroBase,
                        onChange: (e) => setFiltroBase(e.target.value),
                        className: "bdj-select",
                        children: [
                          (0, U.jsx)("option", { value: "", children: "Todas las bases" }),
                          ...(esJefatura ? opcionesBases : opcionesBases.filter((b) => basesAutorizadas.includes(b.clave))).map((b) =>
                            (0, U.jsx)("option", { value: b.clave, children: `${b.clave} — ${b.nombre}` }, b.clave)
                          ),
                        ],
                      }),
                    ],
                  }),
                  (0, U.jsxs)("label", {
                    className: "bdj-field",
                    children: [
                      (0, U.jsx)("span", { className: "bdj-label", children: "Autobús (Económico)" }),
                      (0, U.jsx)("input", {
                        type: "text",
                        value: filtroEconomico,
                        onChange: (e) => setFiltroEconomico(e.target.value),
                        placeholder: "Ej. 55115",
                        className: "bdj-input tabular",
                      }),
                    ],
                  }),
                  (0, U.jsxs)("label", {
                    className: "bdj-field",
                    children: [
                      (0, U.jsx)("span", { className: "bdj-label", children: "Código QR de disco" }),
                      (0, U.jsx)("input", {
                        type: "text",
                        value: filtroQr,
                        onChange: (e) => setFiltroQr(e.target.value),
                        placeholder: "Ej. OFOC-55115-D1",
                        className: "bdj-input tabular",
                      }),
                    ],
                  }),
                  (0, U.jsxs)("label", {
                    className: "bdj-field",
                    children: [
                      (0, U.jsx)("span", { className: "bdj-label", children: "Desde fecha" }),
                      (0, U.jsx)("input", {
                        type: "date",
                        value: filtroDesde,
                        onChange: (e) => setFiltroDesde(e.target.value),
                        className: "bdj-input",
                      }),
                    ],
                  }),
                  (0, U.jsxs)("label", {
                    className: "bdj-field",
                    children: [
                      (0, U.jsx)("span", { className: "bdj-label", children: "Hasta fecha" }),
                      (0, U.jsx)("input", {
                        type: "date",
                        value: filtroHasta,
                        onChange: (e) => setFiltroHasta(e.target.value),
                        className: "bdj-input",
                      }),
                    ],
                  }),
                ],
              }),
              (0, U.jsxs)("div", {
                className: "bdj-filter-footer",
                children: [
                  (0, U.jsxs)("div", {
                    className: "bdj-chip-group",
                    children: [
                      (0, U.jsx)("span", { className: "bdj-chip-label", children: "Filtros rápidos:" }),
                      (0, U.jsxs)("button", {
                        type: "button",
                        onClick: () => setSoloDiscrepancias((v) => !v),
                        className: `bdj-filter-chip ${soloDiscrepancias ? "is-danger" : ""}`,
                        children: [
                          (0, U.jsx)("span", { className: "bdj-chip-dot" }),
                          "Solo discrepancias de custodia",
                        ],
                      }),
                      (0, U.jsxs)("button", {
                        type: "button",
                        onClick: () => setSoloDvrFalla((v) => !v),
                        className: `bdj-filter-chip ${soloDvrFalla ? "is-amber" : ""}`,
                        children: [
                          (0, U.jsx)("span", { className: "bdj-chip-dot" }),
                          "Solo DVR sin grabar",
                        ],
                      }),
                    ],
                  }),
                  hayFiltrosCambios && (0, U.jsx)("button", {
                    type: "button",
                    onClick: () => {
                      setFiltroBase("")
                      setFiltroEconomico("")
                      setFiltroQr("")
                      setFiltroDesde("")
                      setFiltroHasta("")
                      setSoloDiscrepancias(false)
                      setSoloDvrFalla(false)
                    },
                    className: "bdj-link-btn",
                    children: "Limpiar filtros",
                  }),
                ],
              }),
            ],
          }),

          (0, U.jsx)("div", {
            className: "bdj-table-wrap",
            children: (0, U.jsxs)("table", {
              className: "bdj-table",
              children: [
                (0, U.jsx)("thead", {
                  children: (0, U.jsxs)("tr", {
                    children: [
                      (0, U.jsx)("th", { children: "Fecha / Hora" }),
                      (0, U.jsx)("th", { children: "Económico" }),
                      (0, U.jsx)("th", { children: "Base" }),
                      (0, U.jsx)("th", { children: "Bandeja Bajó (Ciclo)" }),
                      (0, U.jsx)("th", { children: "Bandeja Subió" }),
                      (0, U.jsx)("th", { children: "Cadena de Custodia" }),
                      (0, U.jsx)("th", { children: "Estado DVR" }),
                      (0, U.jsx)("th", { children: "Técnico" }),
                    ],
                  }),
                }),
                (0, U.jsx)("tbody", {
                  children: cargando
                    ? (0, U.jsx)("tr", {
                        children: (0, U.jsx)("td", { colSpan: 8, className: "bdj-empty", children: "Cargando historial de cambios…" }),
                      })
                    : cambiosFiltrados.length > 0
                      ? cambiosFiltrados.map((fila) => (0, U.jsxs)("tr", {
                          children: [
                            (0, U.jsx)("td", { className: "tabular", style: { whiteSpace: "nowrap", fontSize: "0.82rem", color: "var(--color-text-muted)" }, children: bandejasFormatearFecha(fila.created_at) }),
                            (0, U.jsx)("td", { className: "tabular", style: { whiteSpace: "nowrap", fontWeight: 700 }, children: fila.economico }),
                            (0, U.jsx)("td", { className: "tabular", style: { whiteSpace: "nowrap", fontSize: "0.82rem", fontWeight: 600 }, children: fila.base_ejecucion }),
                            (0, U.jsxs)("td", {
                              children: [
                                (0, U.jsx)("div", { className: "tabular", style: { fontWeight: 600, fontSize: "0.84rem" }, children: fila.disco_bajado_qr || "SIN BANDEJA" }),
                                fila.disco_bajado_qr && (0, U.jsxs)("div", { className: "tabular", style: { fontSize: "0.76rem", color: "var(--color-text-muted)", marginTop: "0.15rem" }, children: ["+", bandejasFormatearHoras(fila.horas_ciclo_bajado)] }),
                              ],
                            }),
                            (0, U.jsxs)("td", {
                              children: [
                                (0, U.jsx)("div", { className: "tabular", style: { fontWeight: 700, fontSize: "0.84rem", color: "#085c52" }, children: fila.disco_subido_qr }),
                                (0, U.jsx)("div", { style: { fontSize: "0.76rem", color: "var(--color-text-muted)", marginTop: "0.15rem" }, children: fila.disco_formateado ? "Formateado" : "Sin formatear" }),
                              ],
                            }),
                            (0, U.jsxs)("td", {
                              style: { maxWidth: "260px" },
                              children: [
                                (0, U.jsx)("span", {
                                  className: "bdj-pill",
                                  style: fila.cadena_custodia_ok
                                    ? { background: "var(--color-teal-bg)", color: "#085c52" }
                                    : { background: "var(--color-danger-bg)", color: "var(--color-danger)" },
                                  children: fila.cadena_custodia_ok ? "Custodia OK" : "Discrepancia",
                                }),
                                !fila.cadena_custodia_ok && (0, U.jsxs)("div", {
                                  style: { marginTop: "0.35rem", fontSize: "0.78rem", color: "var(--color-text-muted)", lineHeight: 1.4 },
                                  children: [
                                    fila.disco_esperado_qr ? `Esperado: ${fila.disco_esperado_qr} · ` : "",
                                    fila.motivo_discrepancia || "",
                                  ],
                                }),
                              ],
                            }),
                            (0, U.jsx)("td", {
                              style: { whiteSpace: "nowrap" },
                              children: (0, U.jsx)("span", {
                                className: "bdj-pill",
                                style: fila.dvr_grabando
                                  ? { background: "var(--color-teal-bg)", color: "#085c52" }
                                  : { background: "var(--color-danger-bg)", color: "var(--color-danger)" },
                                children: fila.dvr_grabando ? "Grabando" : "No graba",
                              }),
                            }),
                            (0, U.jsx)("td", { style: { fontSize: "0.82rem", color: "var(--color-text-muted)" }, children: fila.tecnico_nombre || "—" }),
                          ],
                        }, fila.id))
                      : (0, U.jsx)("tr", {
                          children: (0, U.jsx)("td", {
                            colSpan: 8,
                            className: "bdj-empty",
                            children: hayFiltrosCambios
                              ? "No hay cambios de bandeja que coincidan con los filtros seleccionados."
                              : "Aún no hay cambios de bandeja registrados. Usa el botón «Registrar Cambio» para capturar el primero.",
                          }),
                        }),
                }),
              ],
            }),
          }),
        ],
      }),

      // SUB-VISTA 2: INVENTARIO Y DESGASTE DE DISCOS
      subVista === "discos" && (0, U.jsxs)(U.Fragment, {
        children: [
          (0, U.jsxs)("div", {
            className: "bdj-card",
            children: [
              (0, U.jsxs)("div", {
                className: "bdj-filtros-grid",
                children: [
                  (esJefatura || basesAutorizadas.length > 1) && (0, U.jsxs)("label", {
                    className: "bdj-field",
                    children: [
                      (0, U.jsx)("span", { className: "bdj-label", children: "Base (Prop. / Ubicación)" }),
                      (0, U.jsxs)("select", {
                        value: filtroDiscoBase,
                        onChange: (e) => setFiltroDiscoBase(e.target.value),
                        className: "bdj-select",
                        children: [
                          (0, U.jsx)("option", { value: "", children: "Todas las bases" }),
                          ...opcionesBases.map((b) => (0, U.jsx)("option", { value: b.clave, children: `${b.clave} — ${b.nombre}` }, b.clave)),
                        ],
                      }),
                    ],
                  }),
                  (0, U.jsxs)("label", {
                    className: "bdj-field",
                    children: [
                      (0, U.jsx)("span", { className: "bdj-label", children: "Estatus actual" }),
                      (0, U.jsxs)("select", {
                        value: filtroDiscoEstatus,
                        onChange: (e) => setFiltroDiscoEstatus(e.target.value),
                        className: "bdj-select",
                        children: [
                          (0, U.jsx)("option", { value: "", children: "Todos los estatus" }),
                          ...BANDEJAS_ESTATUS_LISTA.map((est) => (0, U.jsx)("option", { value: est, children: est }, est)),
                        ],
                      }),
                    ],
                  }),
                  (0, U.jsxs)("label", {
                    className: "bdj-field",
                    children: [
                      (0, U.jsx)("span", { className: "bdj-label", children: "Tipo de bandeja" }),
                      (0, U.jsxs)("select", {
                        value: filtroDiscoBandeja,
                        onChange: (e) => setFiltroDiscoBandeja(e.target.value),
                        className: "bdj-select",
                        children: [
                          (0, U.jsx)("option", { value: "", children: "Todas las bandejas" }),
                          ...BANDEJAS_TIPOS_BANDEJA.map((op) => (0, U.jsx)("option", { value: op.value, children: op.value }, op.value)),
                        ],
                      }),
                    ],
                  }),
                  (0, U.jsxs)("label", {
                    className: "bdj-field",
                    children: [
                      (0, U.jsx)("span", { className: "bdj-label", children: "Medio de almacenamiento" }),
                      (0, U.jsxs)("select", {
                        value: filtroDiscoMedio,
                        onChange: (e) => setFiltroDiscoMedio(e.target.value),
                        className: "bdj-select",
                        children: [
                          (0, U.jsx)("option", { value: "", children: "Todos (HDD / SSD / MicroSD)" }),
                          ...BANDEJAS_TIPOS_DISCO.map((op) => (0, U.jsx)("option", { value: op.value, children: op.value }, op.value)),
                        ],
                      }),
                    ],
                  }),
                  (0, U.jsxs)("label", {
                    className: "bdj-field",
                    children: [
                      (0, U.jsx)("span", { className: "bdj-label", children: "Buscar QR, Serie o Bus" }),
                      (0, U.jsx)("input", {
                        type: "text",
                        value: filtroDiscoTexto,
                        onChange: (e) => setFiltroDiscoTexto(e.target.value),
                        placeholder: "QR, S/N o económico…",
                        className: "bdj-input tabular",
                      }),
                    ],
                  }),
                  (0, U.jsxs)("label", {
                    className: "bdj-field",
                    children: [
                      (0, U.jsx)("span", { className: "bdj-label", children: "Ordenar por" }),
                      (0, U.jsxs)("select", {
                        value: ordenDiscos,
                        onChange: (e) => setOrdenDiscos(e.target.value),
                        className: "bdj-select",
                        children: [
                          (0, U.jsx)("option", { value: "horas_desc", children: "Más horas acumuladas" }),
                          (0, U.jsx)("option", { value: "formateos_desc", children: "Más formateos" }),
                          (0, U.jsx)("option", { value: "reciente", children: "Último movimiento" }),
                          (0, U.jsx)("option", { value: "qr_asc", children: "Código QR (A-Z)" }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              hayFiltrosDiscos && (0, U.jsxs)("div", {
                className: "bdj-filter-footer",
                children: [
                  (0, U.jsx)("span", { className: "bdj-chip-label", children: "Mostrando resultados filtrados" }),
                  (0, U.jsx)("button", {
                    type: "button",
                    onClick: () => {
                      setFiltroDiscoBase("")
                      setFiltroDiscoEstatus("")
                      setFiltroDiscoBandeja("")
                      setFiltroDiscoMedio("")
                      setFiltroDiscoTexto("")
                    },
                    className: "bdj-link-btn",
                    children: "Limpiar filtros",
                  }),
                ],
              }),
            ],
          }),

          (0, U.jsx)("div", {
            className: "bdj-table-wrap",
            children: (0, U.jsxs)("table", {
              className: "bdj-table",
              children: [
                (0, U.jsx)("thead", {
                  children: (0, U.jsxs)("tr", {
                    children: [
                      (0, U.jsx)("th", { children: "Código QR" }),
                      (0, U.jsx)("th", { children: "Tipo de Bandeja" }),
                      (0, U.jsx)("th", { children: "Medio y Serie (S/N)" }),
                      (0, U.jsx)("th", { children: "Estatus Actual" }),
                      (0, U.jsx)("th", { children: "Unidad / Ubicación" }),
                      (0, U.jsx)("th", { children: "Horas Uso" }),
                      (0, U.jsx)("th", { children: "Formateos" }),
                      (0, U.jsx)("th", { children: "Último Mov." }),
                      (0, U.jsx)("th", { children: "Ficha" }),
                    ],
                  }),
                }),
                (0, U.jsx)("tbody", {
                  children: cargando
                    ? (0, U.jsx)("tr", {
                        children: (0, U.jsx)("td", { colSpan: 9, className: "bdj-empty", children: "Cargando catálogo de discos…" }),
                      })
                    : discosFiltrados.length > 0
                      ? discosFiltrados.map((d) => (0, U.jsxs)("tr", {
                          children: [
                            (0, U.jsxs)("td", {
                              children: [
                                (0, U.jsx)("div", { className: "tabular", style: { whiteSpace: "nowrap", fontWeight: 700, fontSize: "0.84rem" }, children: d.codigo_qr }),
                                (0, U.jsx)("div", {
                                  style: { fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.15rem" },
                                  children: d.tipo_asignacion === "Fijo" ? `Fijo (${d.economico_asignado || "—"}) · Prop. ${d.base_propietaria}` : `Comodín · Prop. ${d.base_propietaria}`,
                                }),
                              ],
                            }),
                            (0, U.jsx)("td", {
                              style: { fontSize: "0.83rem", fontWeight: 500 },
                              children: d.tipo_bandeja || (0, U.jsx)("span", { style: { color: "var(--color-amber)", fontSize: "0.78rem" }, children: "Sin definir" }),
                            }),
                            (0, U.jsxs)("td", {
                              children: [
                                (0, U.jsx)("div", {
                                  style: { fontSize: "0.83rem", fontWeight: 600 },
                                  children: d.tipo_disco || (0, U.jsx)("span", { style: { color: "var(--color-amber)", fontWeight: 500, fontSize: "0.78rem" }, children: "Medio pendiente" }),
                                }),
                                (0, U.jsx)("div", {
                                  className: "tabular",
                                  style: { fontSize: "0.75rem", color: d.numero_serie_disco ? "var(--color-text-muted)" : "var(--color-amber)", marginTop: "0.15rem" },
                                  children: d.numero_serie_disco ? `S/N: ${d.numero_serie_disco}` : "Sin S/N vinculado",
                                }),
                              ],
                            }),
                            (0, U.jsx)("td", {
                              style: { whiteSpace: "nowrap" },
                              children: (0, U.jsx)("span", {
                                className: "bdj-pill",
                                style: bandejasEstiloEstatusDisco(d.estatus_actual),
                                children: d.estatus_actual,
                              }),
                            }),
                            (0, U.jsx)("td", {
                              className: "tabular",
                              style: { whiteSpace: "nowrap", fontSize: "0.84rem", fontWeight: 600 },
                              children: d.estatus_actual === "Instalado en bus"
                                ? `Bus ${d.economico_actual}`
                                : `Base ${d.ubicacion_base_actual}`,
                            }),
                            (0, U.jsx)("td", {
                              className: "tabular",
                              style: { whiteSpace: "nowrap", fontSize: "0.84rem", fontWeight: 700, color: Number(d.horas_uso_acumuladas ?? 0) >= 500 ? "var(--color-amber)" : "inherit" },
                              children: bandejasFormatearHoras(d.horas_uso_acumuladas),
                            }),
                            (0, U.jsx)("td", {
                              className: "tabular",
                              style: { whiteSpace: "nowrap", fontSize: "0.84rem", fontWeight: 600, color: (d.conteo_formateos ?? 0) >= 5 ? "var(--color-amber)" : "inherit" },
                              children: d.conteo_formateos ?? 0,
                            }),
                            (0, U.jsx)("td", { className: "tabular", style: { whiteSpace: "nowrap", fontSize: "0.82rem", color: "var(--color-text-muted)" }, children: bandejasFormatearFecha(d.ultimo_movimiento_at) }),
                            (0, U.jsx)("td", {
                              style: { whiteSpace: "nowrap" },
                              children: (0, U.jsx)("button", {
                                type: "button",
                                onClick: () => setModalDiscoEstado({ abierto: true, disco: d }),
                                className: "bdj-link-btn",
                                children: d.estatus_actual === "Instalado en bus" ? "Editar ficha" : "Editar / Estatus",
                              }),
                            }),
                          ],
                        }, d.codigo_qr))
                      : (0, U.jsx)("tr", {
                          children: (0, U.jsx)("td", {
                            colSpan: 9,
                            className: "bdj-empty",
                            children: hayFiltrosDiscos
                              ? "No se encontraron discos con los criterios seleccionados."
                              : "Aún no hay discos catalogados. Se darán de alta automáticamente al registrar cambios o desde «Alta / Ficha Disco».",
                          }),
                        }),
                }),
              ],
            }),
          }),
        ],
      }),

      // Modal Registrar Cambio
      (0, U.jsx)(BandejasModalRegistrarCambio, {
        abierto: modalCambioAbierto,
        onCerrar: () => setModalCambioAbierto(false),
        onGuardado: (res) => {
          setModalCambioAbierto(false)
          const msgCiclo = res?.disco_bajado_qr
            ? ` · Retirado ${res.disco_bajado_qr} (+${bandejasFormatearHoras(res.horas_ciclo_bajado)})`
            : ""
          setAvisoExito(`Cambio registrado en autobús ${res?.economico}: instalado ${res?.disco_subido_qr}${msgCiclo}.`)
          cargarDatos()
        },
        usuario,
        esJefatura,
        basesAutorizadas,
        opcionesBases,
        flota,
        discosCatalogo: discos,
        modoDemoSinSesion,
      }),

      // Modal Alta / Ficha y Estatus de Disco
      (0, U.jsx)(BandejasModalGestionDisco, {
        abierto: modalDiscoEstado.abierto,
        discoInicial: modalDiscoEstado.disco,
        onCerrar: () => setModalDiscoEstado({ abierto: false, disco: null }),
        onActualizado: (d) => {
          setModalDiscoEstado({ abierto: false, disco: null })
          setAvisoExito(`Ficha guardada para ${d?.codigo_qr} (${d?.tipo_disco || "Medio"} · ${d?.estatus_actual}).`)
          cargarDatos()
        },
        usuario,
        esJefatura,
        basesAutorizadas,
        opcionesBases,
        modoDemoSinSesion,
      }),
    ],
  })
}

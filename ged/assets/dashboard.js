import { requerirSesion, cerrarSesion, esPerfilAuxiliar, esPerfilJefe } from "./supabaseClient.js";
import { CAMPO_NIVEL, CAMPO_EMPLEADO, CAMPO_BASE_USUARIO } from "./config.js";
import { montarPendientesWF } from "./pendientes-wf.js";
import { montarIndicadores } from "./vista-indicadores.js";
import { montarListaPendientes } from "./vista-lista.js";

const sesion = await requerirSesion();
if (sesion) iniciar(sesion.usuario);

function iniciar(usuario) {
  // ---- Datos de sesión en la UI ----
  const nombre = usuario[CAMPO_EMPLEADO] || "Usuario";
  const nivel = usuario[CAMPO_NIVEL] || "—";
  const base = usuario[CAMPO_BASE_USUARIO] || "—";
  const iniciales = nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  document.getElementById("user-name").textContent = nombre;
  document.getElementById("user-role").textContent = nivel;
  document.getElementById("avatar").textContent = iniciales || "?";
  document.getElementById("topbar-base").textContent = base;
  document.getElementById("stat-usuario").textContent = nombre;
  document.getElementById("stat-nivel").textContent = nivel;
  document.getElementById("stat-base").textContent = base;

  // ---- Navegación entre vistas ----
  const esJefe = esPerfilJefe(usuario);
  const esAuxiliar = esPerfilAuxiliar(usuario);
  const titulos = {
    resumen: ["Resumen", "Bitácora del accidente · gestión de video"],
    "pendientes-wf": esJefe
      ? ["Pendientes WF", "Panorama general · todas las bases · pendientes y terminadas"]
      : ["Pendientes WF", "Pendientes de bitácora del accidente por base"],
    indicadores: ["Indicadores", "Terminados, pendientes y % de entrega por base"],
    "lista-pendientes": ["Pendientes", "Lista compacta de solicitudes, con estatus, video y área de atención"],
  };

  // Oculta del sidebar las secciones que dependen de datos que este perfil no puede cargar.
  if (!esAuxiliar && !esJefe) {
    document.querySelectorAll('[data-view="indicadores"], [data-view="lista-pendientes"]').forEach((btn) => btn.remove());
  }

  document.querySelectorAll(".nav-item[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-item[data-view]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const view = btn.dataset.view;
      document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
      document.getElementById(`view-${view}`).classList.add("active");
      const [t, s] = titulos[view] || ["", ""];
      document.getElementById("view-title").textContent = t;
      document.getElementById("view-sub").textContent = s;
    });
  });

  // ---- Logout ----
  document.getElementById("btn-logout").addEventListener("click", async () => {
    await cerrarSesion();
    window.location.replace("./index.html");
  });

  // ---- Montar módulo de Pendientes WF ----
  montarPendientesWF(document.getElementById("pwf-root"), {
    usuario,
    esAuxiliar,
    esJefe,
  });

  // ---- Montar Indicadores y Pendientes (leen del store compartido, sin cargar nada nuevo) ----
  if (esAuxiliar || esJefe) {
    montarIndicadores(document.getElementById("indicadores-root"));
    montarListaPendientes(document.getElementById("lista-pendientes-root"));
  }
}

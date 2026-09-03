// ============================================================================
// CONFIGURACIÓN CENTRAL
// Todo lo que probablemente necesites ajustar vive en este archivo.
// ============================================================================

// --- Supabase --------------------------------------------------------------
// Tomados directamente del bundle de la app "Atención a Bordo" que me
// compartiste (mismo proyecto de Supabase).
export const SUPABASE_URL = "https://zygisljwmxoqdplsuzjw.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5Z2lzbGp3bXhvcWRwbHN1emp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4NTE0OTYsImV4cCI6MjA5ODQyNzQ5Nn0.XeHFgDPGN5t0-6Fo1asEXD_XjGRK_N4Jiz706A3u6yg";

// Igual que en la app original: el usuario captura solo su "clave" y se arma
// el correo como clave@gho.mx para autenticar contra Supabase Auth.
export const EMAIL_DOMAIN = "@gho.mx";

// Nombre de la función RPC que regresa el registro de tbl_usuarios del
// usuario logeado (misma que usa la app original).
export const RPC_USUARIO_ACTUAL = "fn_usuario_actual";

// ⚠️ AJUSTAR SI HACE FALTA: nombres de campo dentro del registro que regresa
// fn_usuario_actual. En la app original vi "Nivel" y "Empleado" tal cual
// (con mayúscula inicial), así que asumo la misma convención para el resto.
export const CAMPO_NIVEL = "Nivel";
export const CAMPO_EMPLEADO = "Empleado";
export const CAMPO_BASE_USUARIO = "Base"; // <-- CONFIRMAR: campo con la base del usuario logeado

// Valores de "Nivel" que se consideran perfil "auxiliar" (quien puede subir
// el Excel de Pendientes WF). Ajusta esta lista a los valores reales.
export const NIVELES_AUXILIAR = ["auxiliar", "aux", "auxiliar boletera", "auxiliar operativo"];

// --- tbl_flota ---------------------------------------------------------------
// Confirmado por ti: tabla tbl_flota, campos "autobus" (text) y "base" (text).
export const TABLA_FLOTA = "tbl_flota";
export const COL_FLOTA_AUTOBUS = "autobus";
export const COL_FLOTA_BASE = "base";

// --- tbl_cambiobandeja -------------------------------------------------------
// Esquema real (confirmado). Es un log de eventos de cambio de bandeja: cada
// fila registra que, en cierto autobús y fecha/hora, se retiró "bandeja_baja"
// y se instaló "bandeja_sube". RLS de lectura abierta.
export const TABLA_BANDEJA = "tbl_cambiobandeja";
export const COL_BANDEJA_AUTOBUS = "numero_economico";
export const COL_BANDEJA_SUBE = "bandeja_sube"; // disco/bandeja que quedó instalado en ese evento
export const COL_BANDEJA_BAJA = "bandeja_baja"; // disco/bandeja retirado en ese evento (puede ser null)
export const COL_BANDEJA_FECHA = "fecha_hora"; // timestamptz del evento

// --- Hojas de Excel a leer ---------------------------------------------------
export const HOJA_SOPORTE_TECNICO_CANDIDATOS = [
  "BA Soporte Técnico GHO-Gestión",
  "ASJ BA Soporte Técnico-Gestión",
];
export const HOJA_REGISTRO_SINIESTRO_CANDIDATOS = [
  "GHO BA Registro del Siniestro",
  "ASJ BA Registro del siniestro",
];

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  EMAIL_DOMAIN,
  RPC_USUARIO_ACTUAL,
  CAMPO_NIVEL,
  NIVELES_AUXILIAR,
} from "./config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/** Arma el correo interno a partir de la clave de colaborador. */
export function claveToEmail(clave) {
  return `${String(clave).trim()}${EMAIL_DOMAIN}`;
}

/** Llama a la función que regresa el registro de tbl_usuarios del usuario logeado. */
export async function obtenerUsuarioActual() {
  const { data, error } = await supabase.rpc(RPC_USUARIO_ACTUAL);
  if (error) {
    console.error("No se pudo cargar tbl_usuarios del usuario actual:", error);
    return null;
  }
  return data;
}

/** true si el "Nivel" del usuario corresponde a perfil auxiliar. */
export function esPerfilAuxiliar(usuario) {
  if (!usuario) return false;
  const nivel = String(usuario[CAMPO_NIVEL] ?? "").trim().toLowerCase();
  return NIVELES_AUXILIAR.some((n) => n.toLowerCase() === nivel);
}

/** Inicia sesión con clave + contraseña. Devuelve { ok, usuario, error }. */
export async function iniciarSesion(clave, password) {
  const email = claveToEmail(clave);
  const { error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (authError) {
    return { ok: false, error: "Clave o contraseña incorrecta." };
  }
  const usuario = await obtenerUsuarioActual();
  if (!usuario) {
    await supabase.auth.signOut();
    return {
      ok: false,
      error: "No encontramos tu registro en el sistema. Contacta a tu jefe directo.",
    };
  }
  return { ok: true, usuario };
}

export async function cerrarSesion() {
  await supabase.auth.signOut();
}

/**
 * Protege dashboard.html: si no hay sesión activa, regresa a index.html.
 * Si la hay, resuelve con { session, usuario }.
 */
export async function requerirSesion() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    window.location.replace("./index.html");
    return null;
  }
  const usuario = await obtenerUsuarioActual();
  if (!usuario) {
    await cerrarSesion();
    window.location.replace("./index.html");
    return null;
  }
  return { session, usuario };
}

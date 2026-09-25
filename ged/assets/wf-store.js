// ============================================================================
// Almacén compartido en memoria (dura mientras la pestaña esté abierta).
// "Pendientes WF" escribe aquí después de procesar cada archivo; "Indicadores"
// y "Pendientes" solo leen de aquí y se vuelven a pintar cuando algo cambia.
// ============================================================================

let datos = {
  listo: false, // true en cuanto se ha procesado al menos un archivo
  pendientes: [], // filas de Soporte Técnico pendientes, ya enriquecidas (base, días, disco...)
  terminadas: [], // filas de Soporte Técnico terminadas, ya enriquecidas
  lista: [], // pendientes + terminadas combinadas, con estatus/hayVideo/areaAtencion
};

const suscriptores = new Set();

export function actualizarDatosWF(parcial) {
  datos = { ...datos, ...parcial, listo: true };
  suscriptores.forEach((fn) => {
    try {
      fn(datos);
    } catch (err) {
      console.error("Error notificando a un suscriptor de wf-store:", err);
    }
  });
}

export function obtenerDatosWF() {
  return datos;
}

/** Se llama de inmediato con el estado actual, y de nuevo cada vez que cambie.
 * Devuelve una función para cancelar la suscripción. */
export function suscribirDatosWF(fn) {
  suscriptores.add(fn);
  fn(datos);
  return () => suscriptores.delete(fn);
}

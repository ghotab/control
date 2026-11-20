/**
 * TAB SCOUT — Configuración de Conexión a Supabase
 * ---------------------------------------------------------------------------
 * Conectado al proyecto oficial: https://sfeqkigtnnpftuwxyufi.supabase.co
 *
 * Nota de seguridad: La clave ANON (pública) es segura de incluir en el
 * frontend siempre y cuando Row Level Security (RLS) y las funciones RPC
 * de `supabase_setup.sql` estén activas. NUNCA coloques aquí la `service_role`.
 */

export const SUPABASE_CONFIG = {
    SUPABASE_URL: 'https://sfeqkigtnnpftuwxyufi.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZXFraWd0bm5wZnR1d3h5dWZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTMxMTAsImV4cCI6MjEwNzY2OTExMH0.l8h641w3p0au4SJS1_D0fflpME-Aj7bjrZvG_z-NT40',
    APP_NAME: 'TAB Scout • Tecnología a Bordo',
    ORGANIZATION: 'Grupo Herradura Occidente',
    TOKEN_PREFIX: 'GHO',
    RECOMMENDED_MIN_CHARS: 40,
    CV_BUCKET: 'candidate-cvs',
    CV_MAX_SIZE_BYTES: 5 * 1024 * 1024, // 5 MB
    REQUIRE_CV_BEFORE_START: true
};

/**
 * Verifica si las credenciales de Supabase ya fueron configuradas
 * reemplazando los placeholders por valores reales.
 */
export function isSupabaseConfigured() {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = SUPABASE_CONFIG;
    return (
        Boolean(SUPABASE_URL) &&
        Boolean(SUPABASE_ANON_KEY) &&
        !SUPABASE_URL.includes('TU-PROYECTO-ID') &&
        !SUPABASE_ANON_KEY.includes('TU_SUPABASE_ANON_PUBLIC_KEY') &&
        SUPABASE_URL.startsWith('http')
    );
}

let supabaseInstance = null;

/**
 * Inicializa y devuelve el cliente singleton de Supabase (@supabase/supabase-js v2)
 */
export function getSupabaseClient() {
    if (supabaseInstance) return supabaseInstance;

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        throw new Error('La librería @supabase/supabase-js no se cargó correctamente desde el CDN.');
    }

    supabaseInstance = window.supabase.createClient(
        SUPABASE_CONFIG.SUPABASE_URL,
        SUPABASE_CONFIG.SUPABASE_ANON_KEY,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        }
    );

    return supabaseInstance;
}

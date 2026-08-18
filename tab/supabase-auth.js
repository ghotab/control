// Centraliza la inicialización de Supabase y funciones de autenticación
(async function(){
    const SUPABASE_URL = "https://zygisljwmxoqdplsuzjw.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5Z2lzbGp3bXhvcWRwbHN1emp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4NTE0OTYsImV4cCI6MjA5ODQyNzQ5Nn0.XeHFgDPGN5t0-6Fo1asEXD_XjGRK_N4Jiz706A3u6yg";

    if (!window.supabase) {
        console.error('La librería @supabase/supabase-js no está cargada. Asegura el <script> CDN antes de este archivo.');
        return;
    }

    window.db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    async function getSession() {
        try {
            if (!window.db || !window.db.auth) {
                console.error('Advertencia: window.db.auth no disponible al solicitar sesión');
                return null;
            }
            const { data } = await window.db.auth.getSession();
            return data.session;
        } catch (e) {
            console.error('Error leyendo sesión:', e);
            return null;
        }
    }

    async function getProfile() {
        try {
            if (!window.db || !window.db.auth) return null;
            const userRes = await window.db.auth.getUser();
            const uid = userRes?.data?.user?.id;
            if (!uid) return null;
            const { data, error } = await window.db.from('tbl_usuarios').select('*').eq('id_auth', uid).maybeSingle();
            if (error) {
                console.error('Error leyendo perfil:', error);
                return null;
            }
            return data;
        } catch (e) {
            console.error('Error leyendo perfil:', e);
            return null;
        }
    }

    function normalizeAppPath(rawPath) {
        if (!rawPath) return '/cctv/bandejas/index.html';
        let normalized = rawPath.replace(/\\/g, '/');
        normalized = normalized.replace(/^\/?[A-Za-z]:\//, '/');
        const productionMatch = normalized.match(/\/produ\/control(.*)$/i);
        if (productionMatch) {
            normalized = productionMatch[1] || '/';
        }
        if (!normalized.startsWith('/')) {
            normalized = '/' + normalized;
        }
        return normalized || '/cctv/bandejas/index.html';
    }

    function buildLoginRedirect(targetPath) {
        const normalized = normalizeAppPath(targetPath || (window.location.pathname + window.location.search + window.location.hash));
        const redirect = encodeURIComponent(normalized);
        if (window.location.protocol === 'file:') {
            return 'http://localhost:8000/cctv/bandejas/login.html?redirect=' + redirect;
        }
        return 'login.html?redirect=' + redirect;
    }

    async function requireAuth() {
        const session = await getSession();
        if (!session) {
            // redirige al login y conserva la URL actual
            window.location.href = buildLoginRedirect(window.location.pathname + window.location.search + window.location.hash);
            return null;
        }
        // attach profile if available
        try {
            const profile = await getProfile();
            window.supabaseAuth.profile = profile;
        } catch (e) {
            console.error('No se pudo obtener perfil:', e);
        }
        return session;
    }

    async function signInWithCollab(collabId, password) {
        const email = `${collabId}@gho.mx`;
        const pwd = password || collabId;

        // Preferir window.db.auth, si no está disponible intentar crear un cliente temporal
        try {
            if (window.db && window.db.auth && typeof window.db.auth.signInWithPassword === 'function') {
                return await window.db.auth.signInWithPassword({ email, password: pwd });
            }

            console.warn('window.db.auth no disponible o no tiene signInWithPassword; intentando cliente temporal');
            if (window.supabase && typeof window.supabase.createClient === 'function') {
                const temp = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                if (temp && temp.auth && typeof temp.auth.signInWithPassword === 'function') {
                    return await temp.auth.signInWithPassword({ email, password: pwd });
                }
            }

            throw new Error('Cliente de autenticación no disponible');
        } catch (e) {
            console.error('Error en signInWithCollab:', e);
            throw e;
        }
    }

    async function signOut() {
        try {
            if (window.db && window.db.auth) await window.db.auth.signOut();
        } finally {
            [
                'tecnico',
                'nombre_tecnico',
                'base',
                'rol',
                'clave_sesion'
            ].forEach(key => localStorage.removeItem(key));
            window.supabaseAuth.profile = null;
            window.location.href = 'login.html';
        }
    }

    window.supabaseAuth = {
        getSession,
        requireAuth,
        getProfile,
        signInWithCollab,
        signOut
    };

})();

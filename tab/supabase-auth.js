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
            if (!window.db || !window.db.auth) return null;
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

    async function requireAuth() {
        const session = await getSession();
        if (!session) {
            // redirige al login y conserva la URL actual
            const redirect = encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
            window.location.href = 'login.html?redirect=' + redirect;
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
        if (!window.db || !window.db.auth) throw new Error('Supabase client no inicializado');
        const email = `${collabId}@gho.mx`;
        const pwd = password || collabId;
        return await window.db.auth.signInWithPassword({ email, password: pwd });
    }

    async function signOut() {
        try {
            if (window.db && window.db.auth) await window.db.auth.signOut();
        } finally {
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

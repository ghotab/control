/**
 * db.js — Singleton del cliente Supabase.
 * Se reutiliza window.db si supabase-auth.js ya lo inicializó.
 */

const SUPABASE_URL = "https://zygisljwmxoqdplsuzjw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5Z2lzbGp3bXhvcWRwbHN1emp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4NTE0OTYsImV4cCI6MjA5ODQyNzQ5Nn0.XeHFgDPGN5t0-6Fo1asEXD_XjGRK_N4Jiz706A3u6yg";

function getDB() {
    if (window.db) return window.db;
    try {
        window.db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        return window.db;
    } catch (e) {
        console.error("[DB] No se pudo inicializar Supabase:", e);
        return null;
    }
}

export { getDB };

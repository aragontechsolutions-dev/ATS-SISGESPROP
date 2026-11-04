import { createClient } from '@supabase/supabase-js';

/**
 * Cliente de Supabase SOLO para autenticación (login y segundo factor).
 * Los datos nunca se leen con supabase-js: todo pasa por la API (ADR-001 de la investigación).
 * Variables públicas: URL del proyecto y clave publicable (anon). Nunca la service role.
 */
const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const authConfigured = Boolean(url && anonKey);

export const supabase = createClient(url || 'http://invalid.local', anonKey || 'missing', {
  auth: {
    // sessionStorage: la sesión se borra al cerrar la pestaña (más seguro que localStorage).
    storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

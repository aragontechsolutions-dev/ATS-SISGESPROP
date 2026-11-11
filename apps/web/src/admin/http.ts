import { supabase } from './supabase';
import { ensureApiAwake } from '../api';

const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export class AdminApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details: string[] = [],
  ) {
    super(message);
  }
}

/** Llamada autenticada a la API del panel (Bearer con el access token de Supabase). */
export async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new AdminApiError(401, 'La sesión expiró. Vuelve a ingresar.');
  // La API puede estar dormida (plan gratuito de Render): se espera a que responda (api.ts).
  await ensureApiAwake();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'omit',
    headers: {
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(init.headers ?? {}),
      authorization: `Bearer ${token}`,
    },
    signal: init.signal ?? AbortSignal.timeout(20_000),
  });
  if (res.status === 401) {
    await supabase.auth.signOut();
    throw new AdminApiError(401, 'La sesión expiró. Vuelve a ingresar.');
  }
  if (!res.ok) {
    let message = 'No se pudo completar la operación.';
    let details: string[] = [];
    try {
      const body = (await res.json()) as { message?: unknown; errors?: unknown; missing?: unknown };
      if (typeof body.message === 'string') message = body.message;
      else if (Array.isArray(body.message)) details = body.message.map(String);
      if (Array.isArray(body.errors)) details = body.errors.map(String);
      if (Array.isArray(body.missing)) details = body.missing.map((m) => `Falta la sección: ${String(m)}`);
    } catch {
      /* respuesta sin JSON */
    }
    if (res.status === 403) message = 'Acceso denegado.';
    if (res.status === 429) message = 'Demasiadas operaciones seguidas. Espera un minuto.';
    throw new AdminApiError(res.status, message, details);
  }
  return res;
}

export async function adminJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await adminFetch(path, init);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const send = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

/**
 * Cliente de la API pública. La web nunca habla con la base de datos: solo con la API.
 * Solo usa variables públicas (VITE_*): aquí no hay secretos.
 */
const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
const TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------------------------
// API dormida (plan gratuito de Render): tras unos minutos sin tráfico el servicio se apaga y
// tarda ~1 minuto en volver. Mientras tanto Render responde con su página de espera (sin CORS),
// así que la llamada falla. Antes de cada llamada se comprueba /health y, si no responde, se
// reintenta hasta WAKE_LIMIT_MS. Una sola espera compartida por toda la página.
// ---------------------------------------------------------------------------------------------
const WAKE_LIMIT_MS = 90_000;
const PROBE_TIMEOUT_MS = 10_000;
const PROBE_INTERVAL_MS = 3_000;
/** Si la API tarda más que esto, se avisa al visitante que se está conectando. */
const WAKING_NOTICE_AFTER_MS = 2_500;
/** Una respuesta correcta reciente evita volver a comprobar /health en cada llamada. */
const AWAKE_TTL_MS = 60_000;

let lastOkAt = 0;
let waking: Promise<boolean> | null = null;
let wakingVisible = false;
const listeners = new Set<() => void>();

function setWakingVisible(value: boolean) {
  if (wakingVisible === value) return;
  wakingVisible = value;
  listeners.forEach((l) => l());
}

/** Para useSyncExternalStore: true mientras la página espera a que la API despierte. */
export const apiWaking = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => void listeners.delete(listener);
  },
  get: () => wakingVisible,
  getServer: () => false,
};

async function probe(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, { credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
    if (!res.ok) return false;
    const body = (await res.json()) as { status?: unknown };
    return body.status === 'ok';
  } catch {
    return false;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Devuelve true cuando la API responde (o false si no despertó dentro del límite). Se puede llamar
 * de antemano para "despertarla" mientras el visitante todavía está leyendo o completando datos.
 */
export function ensureApiAwake(): Promise<boolean> {
  if (!API_URL) return Promise.resolve(false);
  if (Date.now() - lastOkAt < AWAKE_TTL_MS) return Promise.resolve(true);
  waking ??= (async () => {
    const notice = setTimeout(() => setWakingVisible(true), WAKING_NOTICE_AFTER_MS);
    const deadline = Date.now() + WAKE_LIMIT_MS;
    try {
      while (Date.now() < deadline) {
        if (await probe()) {
          lastOkAt = Date.now();
          return true;
        }
        await sleep(PROBE_INTERVAL_MS);
      }
      return false;
    } finally {
      clearTimeout(notice);
      setWakingVisible(false);
      waking = null;
    }
  })();
  return waking;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Coverage {
  baseLabel: string;
  baseLat: number;
  baseLng: number;
}

export interface TravelEstimate {
  distanceKm: string;
  billableKm: string;
  travelCostPerVisit: string;
  currency: 'USD';
}

export interface SimulationResult {
  simulationId: string;
  currency: 'USD';
  distanceKm: string;
  billableKm: string;
  travelCostMonthly: string;
  lowFee: string;
  highFee: string;
  annualFee: string;
}

export interface LeadInput {
  name: string;
  email: string;
  phone?: string;
  residenceCountry?: string;
  propertyLocation?: string;
  propertyTypeCode?: string;
  simulationId?: string;
  message?: string;
  consent: true;
  policyVersion: string;
  turnstileToken: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Mensajes para el visitante según el código de respuesta (sin detalles técnicos). */
function messageFor(status: number): string {
  switch (status) {
    case 400:
      return 'Revisa los datos ingresados.';
    case 403:
      return 'No pudimos verificar que la consulta la envía una persona. Recarga la página e intenta de nuevo.';
    case 404:
      return 'Todavía no hay una tarifa publicada para esa combinación. Escríbenos y te cotizamos.';
    case 422:
      return 'La ubicación elegida está fuera de Uruguay.';
    case 429:
      return 'Hiciste muchas consultas seguidas. Espera un minuto y vuelve a intentar.';
    case 503:
      return 'El cotizador todavía no está disponible. Escríbenos y te cotizamos.';
    case 0:
      return 'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo en un minuto.';
    default:
      return 'No pudimos completar la consulta. Intenta de nuevo en unos minutos.';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new ApiError(0, 'Servicio no configurado.');
  await ensureApiAwake();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
      credentials: 'omit',
    });
    if (!res.ok) throw new ApiError(res.status, messageFor(res.status));
    lastOkAt = Date.now();
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, messageFor(0));
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  coverage: () => request<Coverage>('/public/coverage'),
  travelEstimate: (point: LatLng) =>
    request<TravelEstimate>('/public/travel-estimate', { method: 'POST', body: JSON.stringify(point) }),
  simulate: (input: { propertyTypeCode: string; serviceLevel: number } & LatLng) =>
    request<SimulationResult>('/public/simulations', { method: 'POST', body: JSON.stringify(input) }),
  createLead: (input: LeadInput) =>
    request<{ ok: true }>('/public/leads', { method: 'POST', body: JSON.stringify(input) }),
};

/** Formato de importes en USD para mostrar (es-UY). */
export function formatUsd(value: string): string {
  return new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(
    Number(value),
  );
}

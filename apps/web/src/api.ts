/**
 * Cliente de la API pública. La web nunca habla con la base de datos: solo con la API.
 * Solo usa variables públicas (VITE_*): aquí no hay secretos.
 */
const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
const TIMEOUT_MS = 15_000;

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
    default:
      return 'No pudimos completar la consulta. Intenta de nuevo en unos minutos.';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new ApiError(0, 'Servicio no configurado.');
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

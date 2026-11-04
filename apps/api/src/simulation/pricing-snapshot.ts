import type { TravelMode } from '@ats/pricing';

/**
 * Parte "pricing" de PUBLICATION.snapshot: los parámetros vigentes del cotizador
 * en el momento de publicar. Se guarda como texto decimal para no perder precisión.
 * Contiene datos comerciales sensibles: se lee solo en el servidor.
 */
export interface PublishedProfile {
  propertyTypeCode: string;
  serviceLevel: number;
  visitsPerMonth: string;
  hoursPerVisit: string;
  travelHours: string;
  adminHours: string;
  coordHours: string;
  staffHours: string;
  hourlyRate: string;
  fixedCosts: string;
  premiumPct: string;
  highCoef: string;
  highMonths: string;
}

export interface PublishedTravel {
  baseLabel: string;
  baseLat: number;
  baseLng: number;
  freeRadiusKm: string;
  routeFactor: string;
  costPerKm: string;
  mode: TravelMode;
}

export interface PricingSnapshot {
  travel: PublishedTravel;
  profiles: PublishedProfile[];
  params: Record<string, string>;
}

const DECIMAL_RE = /^\d+(\.\d+)?$/;
const PROFILE_DECIMALS = [
  'visitsPerMonth', 'hoursPerVisit', 'travelHours', 'adminHours', 'coordHours', 'staffHours',
  'hourlyRate', 'fixedCosts', 'premiumPct', 'highCoef', 'highMonths',
] as const;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Valida la forma del snapshot leído de la base (defensa ante datos corruptos).
 * Devuelve null si la publicación no tiene un cotizador completo.
 */
export function parsePricingSnapshot(snapshot: unknown): PricingSnapshot | null {
  if (!isObject(snapshot) || !isObject(snapshot.pricing)) return null;
  const { travel, profiles, params } = snapshot.pricing;
  if (!isObject(travel) || !Array.isArray(profiles) || !isObject(params)) return null;

  if (
    typeof travel.baseLabel !== 'string' ||
    typeof travel.baseLat !== 'number' ||
    typeof travel.baseLng !== 'number' ||
    (travel.mode !== 'POR_KM' && travel.mode !== 'POR_TRAMOS') ||
    ![travel.freeRadiusKm, travel.routeFactor, travel.costPerKm].every((x) => typeof x === 'string' && DECIMAL_RE.test(x))
  ) {
    return null;
  }

  const validProfiles: PublishedProfile[] = [];
  for (const p of profiles) {
    if (!isObject(p) || typeof p.propertyTypeCode !== 'string' || !Number.isInteger(p.serviceLevel)) return null;
    if (!PROFILE_DECIMALS.every((k) => typeof p[k] === 'string' && DECIMAL_RE.test(p[k] as string))) return null;
    validProfiles.push(p as unknown as PublishedProfile);
  }

  const validParams: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (typeof v !== 'string' || !DECIMAL_RE.test(v)) return null;
    validParams[k] = v;
  }

  return { travel: travel as unknown as PublishedTravel, profiles: validProfiles, params: validParams };
}

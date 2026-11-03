import { Decimal } from 'decimal.js';

/**
 * Viático de traslado (Plan Etapa 1, sección 4.2).
 *
 *   d_ruta = d_lineal · f_ruta
 *   km_fact = 2 · max(0, d_ruta − R_sin_cargo)     (ida y vuelta, por visita)
 *
 * d_lineal es la distancia geodésica (fórmula de Haversine) entre la base de
 * operaciones y la propiedad. El factor de ruta aproxima el recorrido por
 * carretera (valor inicial propuesto 1,3, a calibrar con trayectos reales: P-4).
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export type TravelMode = 'POR_KM' | 'POR_TRAMOS';

export interface TravelConfig {
  base: LatLng;
  freeRadiusKm: Decimal.Value;
  routeFactor: Decimal.Value;
  costPerKm: Decimal.Value;
  mode: TravelMode;
}

export interface TravelResult {
  /** Distancia en línea recta base → propiedad (km, 2 decimales). */
  straightKm: string;
  /** Distancia estimada por ruta, solo ida (km, 2 decimales). */
  routeKm: string;
  /** Km facturables ida y vuelta por visita (km, 2 decimales). */
  billableKm: string;
}

/** Radio medio de la Tierra (IUGG), en km. */
const EARTH_RADIUS_KM = 6371.0088;
const KM_DP = 2;

export function assertValidLatLng(p: LatLng): void {
  if (
    typeof p?.lat !== 'number' ||
    typeof p?.lng !== 'number' ||
    !Number.isFinite(p.lat) ||
    !Number.isFinite(p.lng) ||
    p.lat < -90 ||
    p.lat > 90 ||
    p.lng < -180 ||
    p.lng > 180
  ) {
    throw new RangeError('Coordenadas inválidas');
  }
}

export function haversineKm(a: LatLng, b: LatLng): number {
  assertValidLatLng(a);
  assertValidLatLng(b);
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function computeTravel(config: TravelConfig, property: LatLng): TravelResult {
  if (config.mode !== 'POR_KM') {
    // La regla de cobro por tramos depende de la respuesta del cliente (P-3):
    // no se implementa hasta conocerla, para no inventar la regla.
    throw new Error('Modo de viático POR_TRAMOS pendiente de definición del cliente (P-3)');
  }
  const factor = new Decimal(config.routeFactor);
  const freeRadius = new Decimal(config.freeRadiusKm);
  if (!factor.isFinite() || factor.lessThan(1)) {
    throw new RangeError('El factor de ruta debe ser >= 1');
  }
  if (!freeRadius.isFinite() || freeRadius.isNegative()) {
    throw new RangeError('El radio sin cargo debe ser >= 0');
  }

  const straight = new Decimal(haversineKm(config.base, property)).toDecimalPlaces(KM_DP, Decimal.ROUND_HALF_UP);
  const route = straight.times(factor).toDecimalPlaces(KM_DP, Decimal.ROUND_HALF_UP);
  const billable = Decimal.max(0, route.minus(freeRadius)).times(2);

  return {
    straightKm: straight.toFixed(KM_DP),
    routeKm: route.toFixed(KM_DP),
    billableKm: billable.toFixed(KM_DP),
  };
}

/* ---------------------------------------------------------------------------
 * Pertenencia a un territorio (para rechazar puntos fuera de Uruguay).
 * Se recibe la geometría GeoJSON (Polygon o MultiPolygon) como dato.
 * ------------------------------------------------------------------------- */

type Ring = number[][]; // [lng, lat][]
export type GeoGeometry =
  | { type: 'Polygon'; coordinates: Ring[] }
  | { type: 'MultiPolygon'; coordinates: Ring[][] };

function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i] as [number, number];
    const [xj, yj] = ring[j] as [number, number];
    const intersects = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInPolygon(lng: number, lat: number, polygon: Ring[]): boolean {
  const [outer, ...holes] = polygon;
  if (!outer || !pointInRing(lng, lat, outer)) return false;
  return !holes.some((hole) => pointInRing(lng, lat, hole));
}

export function isPointInGeometry(point: LatLng, geometry: GeoGeometry): boolean {
  assertValidLatLng(point);
  if (geometry.type === 'Polygon') return pointInPolygon(point.lng, point.lat, geometry.coordinates);
  return geometry.coordinates.some((poly) => pointInPolygon(point.lng, point.lat, poly));
}

/**
 * Distancia aproximada (km) de un punto al borde más cercano de la geometría.
 * Usa proyección equirectangular local: error despreciable a escala de pocos km.
 */
export function distanceToBoundaryKm(point: LatLng, geometry: GeoGeometry): number {
  assertValidLatLng(point);
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  const kmPerDegLat = (Math.PI * EARTH_RADIUS_KM) / 180;
  const kmPerDegLng = kmPerDegLat * Math.cos((point.lat * Math.PI) / 180);
  const px = point.lng * kmPerDegLng;
  const py = point.lat * kmPerDegLat;
  let best = Number.POSITIVE_INFINITY;
  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (let i = 0; i < ring.length - 1; i++) {
        const [x1, y1] = ring[i] as [number, number];
        const [x2, y2] = ring[i + 1] as [number, number];
        const ax = x1 * kmPerDegLng, ay = y1 * kmPerDegLat;
        const bx = x2 * kmPerDegLng, by = y2 * kmPerDegLat;
        const dx = bx - ax, dy = by - ay;
        const len2 = dx * dx + dy * dy;
        const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
        best = Math.min(best, Math.hypot(px - (ax + t * dx), py - (ay + t * dy)));
      }
    }
  }
  return best;
}

/**
 * Indica si el punto está dentro del territorio o a menos de `toleranceKm`
 * de su borde. La tolerancia compensa la simplificación de la costa del
 * contorno 1:10m (p. ej. Cabo Polonio queda fuera del polígono sin ella).
 */
export function isWithinTerritory(point: LatLng, geometry: GeoGeometry, toleranceKm: number): boolean {
  if (!Number.isFinite(toleranceKm) || toleranceKm < 0) throw new RangeError('Tolerancia inválida');
  if (isPointInGeometry(point, geometry)) return true;
  return toleranceKm > 0 && distanceToBoundaryKm(point, geometry) <= toleranceKm;
}

import type { GeoGeometry } from '@ats/pricing';
import data from '@ats/pricing/uruguay.geometry.json' with { type: 'json' };

/**
 * Contorno de Uruguay. Fuente: Natural Earth 1:10m Admin 0 (dominio público),
 * coordenadas redondeadas a 4 decimales (~11 m). Ver docs/adr/ADR-006.
 */
export const URUGUAY_GEOMETRY = data.geometry as GeoGeometry;

/** Tolerancia por defecto si la publicación no trae TERRITORY_TOLERANCE_KM. */
export const DEFAULT_TERRITORY_TOLERANCE_KM = 2;

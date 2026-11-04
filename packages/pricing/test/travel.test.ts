import { describe, expect, it } from 'vitest';
import {
  computeTravel,
  distanceToBoundaryKm,
  haversineKm,
  isPointInGeometry,
  isWithinTerritory,
  type GeoGeometry,
  type TravelConfig,
} from '../src/index.js';

describe('haversineKm', () => {
  it('distancia 0 entre el mismo punto', () => {
    expect(haversineKm({ lat: -34.9, lng: -54.95 }, { lat: -34.9, lng: -54.95 })).toBe(0);
  });

  it('1 grado de latitud ≈ 2πR/360 = 111,195 km', () => {
    const d = haversineKm({ lat: -34, lng: -55 }, { lat: -35, lng: -55 });
    expect(d).toBeCloseTo(111.195, 3);
  });

  it('rechaza coordenadas fuera de rango', () => {
    expect(() => haversineKm({ lat: 91, lng: 0 }, { lat: 0, lng: 0 })).toThrow(RangeError);
    expect(() => haversineKm({ lat: 0, lng: Number.NaN }, { lat: 0, lng: 0 })).toThrow(RangeError);
  });
});

describe('computeTravel', () => {
  const base = { lat: -34, lng: -55 };
  const cfg: TravelConfig = { base, freeRadiusKm: 0, routeFactor: '1.3', costPerKm: '0.35', mode: 'POR_KM' };
  const oneDegreeSouth = { lat: -35, lng: -55 }; // 111,20 km en línea recta

  it('km_fact = 2 × d_lineal × factor con radio 0', () => {
    const r = computeTravel(cfg, oneDegreeSouth);
    expect(r.straightKm).toBe('111.20');
    expect(r.routeKm).toBe('144.56'); // 111.20 × 1.3
    expect(r.billableKm).toBe('289.12');
  });

  it('descuenta el radio sin cargo', () => {
    const r = computeTravel({ ...cfg, freeRadiusKm: 100 }, oneDegreeSouth);
    expect(r.billableKm).toBe('89.12'); // 2 × (144.56 − 100)
  });

  it('dentro del radio sin cargo no se cobra', () => {
    const r = computeTravel({ ...cfg, freeRadiusKm: 500 }, oneDegreeSouth);
    expect(r.billableKm).toBe('0.00');
  });

  it('rechaza factor de ruta < 1', () => {
    expect(() => computeTravel({ ...cfg, routeFactor: '0.9' }, oneDegreeSouth)).toThrow(RangeError);
  });

  it('modo POR_TRAMOS queda bloqueado hasta definición del cliente (P-3)', () => {
    expect(() => computeTravel({ ...cfg, mode: 'POR_TRAMOS' }, oneDegreeSouth)).toThrow(/P-3/);
  });
});

describe('isPointInGeometry', () => {
  const square: GeoGeometry = {
    type: 'Polygon',
    coordinates: [
      [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
      [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]], // hueco
    ],
  };

  it('punto dentro', () => expect(isPointInGeometry({ lat: 2, lng: 2 }, square)).toBe(true));
  it('punto fuera', () => expect(isPointInGeometry({ lat: 20, lng: 2 }, square)).toBe(false));
  it('punto en el hueco', () => expect(isPointInGeometry({ lat: 5, lng: 5 }, square)).toBe(false));
  it('MultiPolygon', () => {
    const multi: GeoGeometry = { type: 'MultiPolygon', coordinates: [square.coordinates as number[][][]] };
    expect(isPointInGeometry({ lat: 2, lng: 2 }, multi)).toBe(true);
  });
});

describe('isWithinTerritory (tolerancia de borde)', () => {
  // Cuadrado de 1° x 1° con esquina en (0,0): 1° ≈ 111,2 km en el ecuador.
  const sq: GeoGeometry = { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] };
  const outside = { lat: 0.5, lng: 1.01 }; // ≈ 1,11 km al este del borde

  it('mide la distancia al borde', () => {
    expect(distanceToBoundaryKm(outside, sq)).toBeCloseTo(1.112, 2);
  });
  it('acepta un punto fuera pero dentro de la tolerancia', () => {
    expect(isWithinTerritory(outside, sq, 2)).toBe(true);
  });
  it('rechaza un punto fuera de la tolerancia', () => {
    expect(isWithinTerritory(outside, sq, 1)).toBe(false);
  });
  it('tolerancia 0 equivale a dentro/fuera estricto', () => {
    expect(isWithinTerritory(outside, sq, 0)).toBe(false);
  });
  it('rechaza tolerancia negativa', () => {
    expect(() => isWithinTerritory(outside, sq, -1)).toThrow(RangeError);
  });
});

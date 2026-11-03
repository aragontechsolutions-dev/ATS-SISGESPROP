import { describe, expect, it } from 'vitest';
import { computeFee, type CalcProfile } from '../src/index.js';

/**
 * Casos de la hoja CARTERA de la planilla del cliente
 * (Estructura_Cobro_Admin_Propiedades.xlsx). Si alguno deja de dar el mismo
 * resultado al centavo, el build falla y no se publica (Plan Etapa 1, 4.3).
 * COSTO_KM = 0,35 USD (valor de la hoja CALCULADORA, deducido y validado con los 3 casos).
 */
const COST_PER_KM = '0.35';

const cases: Array<{
  name: string;
  profile: CalcProfile;
  km: string;
  expected: { totalHours: string; lowFee: string; highFee: string; annualFee: string };
  exactLow: string;
}> = [
  {
    name: 'Casa San Rafael',
    profile: {
      visitsPerMonth: 4, hoursPerVisit: 2, travelHours: 1, adminHours: 5, coordHours: 4, staffHours: 2,
      hourlyRate: 35, fixedCosts: 90, premiumPct: '0.2', highCoef: 2, highMonths: '2.5',
    },
    km: '24',
    expected: { totalHours: '23', lowFee: '1114.32', highFee: '2228.64', annualFee: '16157.64' },
    exactLow: '1114.32',
  },
  {
    name: 'Apto Torre Península',
    profile: {
      visitsPerMonth: 2, hoursPerVisit: 1, travelHours: '0.5', adminHours: 2, coordHours: 1, staffHours: 0,
      hourlyRate: 35, fixedCosts: 40, premiumPct: '0.15', highCoef: '1.5', highMonths: '2.5',
    },
    km: '12',
    expected: { totalHours: '6', lowFee: '297.16', highFee: '445.74', annualFee: '3937.37' },
    exactLow: '297.16',
  },
  {
    name: 'Chacra José Ignacio',
    profile: {
      visitsPerMonth: 5, hoursPerVisit: '2.5', travelHours: '1.5', adminHours: 7, coordHours: 5, staffHours: 4,
      hourlyRate: 40, fixedCosts: 140, premiumPct: '0.25', highCoef: '1.8', highMonths: 3,
    },
    km: '90',
    // La planilla muestra 2171.875 / 3909.375 / 31275 (sin redondear).
    expected: { totalHours: '36', lowFee: '2171.88', highFee: '3909.38', annualFee: '31275.00' },
    exactLow: '2171.875',
  },
];

describe('computeFee – casos de la planilla del cliente', () => {
  for (const c of cases) {
    it(`${c.name} reproduce la planilla al centavo`, () => {
      const r = computeFee({ profile: c.profile, billableKm: c.km, costPerKm: COST_PER_KM });
      expect(r.totalHours).toBe(c.expected.totalHours);
      expect(r.lowFee).toBe(c.expected.lowFee);
      expect(r.highFee).toBe(c.expected.highFee);
      expect(r.annualFee).toBe(c.expected.annualFee);
      expect(r.exact.lowFee).toBe(c.exactLow);
    });
  }

  it('Chacra: el anual se calcula sin redondeo intermedio (31275 exacto)', () => {
    const c = cases[2]!;
    const r = computeFee({ profile: c.profile, billableKm: c.km, costPerKm: COST_PER_KM });
    expect(r.exact.annualFee).toBe('31275');
  });
});

describe('computeFee – validaciones', () => {
  const base = cases[0]!.profile;

  it('rechaza valores negativos', () => {
    expect(() => computeFee({ profile: { ...base, hourlyRate: -1 }, billableKm: 0, costPerKm: COST_PER_KM })).toThrow(
      RangeError,
    );
  });

  it('rechaza valores no numéricos', () => {
    expect(() =>
      computeFee({ profile: { ...base, hourlyRate: Number.NaN }, billableKm: 0, costPerKm: COST_PER_KM }),
    ).toThrow();
  });

  it('rechaza más de 12 meses de temporada alta', () => {
    expect(() => computeFee({ profile: { ...base, highMonths: 13 }, billableKm: 0, costPerKm: COST_PER_KM })).toThrow(
      RangeError,
    );
  });

  it('sin km facturables el costo de traslado es 0', () => {
    const r = computeFee({ profile: base, billableKm: 0, costPerKm: COST_PER_KM });
    expect(r.travelCost).toBe('0.00');
  });
});

import { Decimal } from 'decimal.js';

/**
 * Motor de cálculo del abono (Plan Etapa 1, sección 4.3).
 *
 *   H      = v · (h_visita + h_traslado) + h_admin + h_coord + h_personal
 *   T      = km_fact · v · c_km
 *   A_baja = (H · V_hora + T + G_fijos) · (1 + p)
 *   A_alta = A_baja · k_alta
 *   A_anual= A_baja · (12 − m_alta) + A_alta · m_alta
 *
 * Reglas:
 *  - Todo se calcula con decimal.js (sin coma flotante).
 *  - Se redondea SOLO al presentar (2 decimales, mitad hacia arriba).
 *    Calcular el anual con valores ya redondeados no reproduce la planilla
 *    (caso Chacra José Ignacio: 31275 exacto vs 31275,06 redondeando antes).
 */

/** Perfil de cálculo (tabla CALC_PROFILE): lo carga el administrador; nunca se publica. */
export interface CalcProfile {
  visitsPerMonth: Decimal.Value;
  hoursPerVisit: Decimal.Value;
  travelHours: Decimal.Value;
  adminHours: Decimal.Value;
  coordHours: Decimal.Value;
  staffHours: Decimal.Value;
  hourlyRate: Decimal.Value;
  fixedCosts: Decimal.Value;
  /** Prima como fracción: 0.2 = 20 %. Es un recargo sobre el costo. */
  premiumPct: Decimal.Value;
  highCoef: Decimal.Value;
  /** Meses de temporada alta; admite fracciones (2.5). */
  highMonths: Decimal.Value;
}

export interface FeeInput {
  profile: CalcProfile;
  /** Km facturables ida y vuelta por visita (km_fact), resultado del viático. */
  billableKm: Decimal.Value;
  /** Costo por km en USD (valor inicial 0,35). */
  costPerKm: Decimal.Value;
}

export interface FeeResult {
  totalHours: string;
  travelCost: string;
  lowFee: string;
  highFee: string;
  annualFee: string;
  /** Valores sin redondear, para guardar en el snapshot de la simulación. */
  exact: { totalHours: string; travelCost: string; lowFee: string; highFee: string; annualFee: string };
}

const MONEY_DP = 2;

export function toMoney(value: Decimal): string {
  return value.toDecimalPlaces(MONEY_DP, Decimal.ROUND_HALF_UP).toFixed(MONEY_DP);
}

function nonNegative(name: string, value: Decimal.Value): Decimal {
  const d = new Decimal(value);
  if (!d.isFinite() || d.isNegative()) {
    throw new RangeError(`Parámetro inválido "${name}": debe ser un número >= 0`);
  }
  return d;
}

export function computeFee(input: FeeInput): FeeResult {
  const p = input.profile;
  const v = nonNegative('visitsPerMonth', p.visitsPerMonth);
  const highMonths = nonNegative('highMonths', p.highMonths);
  if (highMonths.greaterThan(12)) {
    throw new RangeError('Parámetro inválido "highMonths": no puede superar 12');
  }

  const totalHours = v
    .times(nonNegative('hoursPerVisit', p.hoursPerVisit).plus(nonNegative('travelHours', p.travelHours)))
    .plus(nonNegative('adminHours', p.adminHours))
    .plus(nonNegative('coordHours', p.coordHours))
    .plus(nonNegative('staffHours', p.staffHours));

  const travelCost = nonNegative('billableKm', input.billableKm)
    .times(v)
    .times(nonNegative('costPerKm', input.costPerKm));

  const lowFee = totalHours
    .times(nonNegative('hourlyRate', p.hourlyRate))
    .plus(travelCost)
    .plus(nonNegative('fixedCosts', p.fixedCosts))
    .times(new Decimal(1).plus(nonNegative('premiumPct', p.premiumPct)));

  const highFee = lowFee.times(nonNegative('highCoef', p.highCoef));
  const annualFee = lowFee.times(new Decimal(12).minus(highMonths)).plus(highFee.times(highMonths));

  return {
    totalHours: totalHours.toString(),
    travelCost: toMoney(travelCost),
    lowFee: toMoney(lowFee),
    highFee: toMoney(highFee),
    annualFee: toMoney(annualFee),
    exact: {
      totalHours: totalHours.toString(),
      travelCost: travelCost.toString(),
      lowFee: lowFee.toString(),
      highFee: highFee.toString(),
      annualFee: annualFee.toString(),
    },
  };
}

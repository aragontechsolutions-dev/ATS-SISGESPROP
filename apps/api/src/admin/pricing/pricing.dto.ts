import { IsIn, IsInt, IsNumber, IsString, Length, Matches, Max, Min } from 'class-validator';

/** Decimal no negativo como texto (hasta 6 enteros y 4 decimales). Evita la coma flotante. */
const DECIMAL = /^\d{1,6}(\.\d{1,4})?$/;
const msg = (f: string) => ({ message: `${f}: número decimal no negativo (ej. 35 o 0.35)` });

/** Perfil de cálculo de un tipo de propiedad y nivel (CALC_PROFILE). Información sensible. */
export class CalcProfileDto {
  @Matches(DECIMAL, msg('visitsPerMonth')) visitsPerMonth!: string;
  @Matches(DECIMAL, msg('hoursPerVisit')) hoursPerVisit!: string;
  @Matches(DECIMAL, msg('travelHours')) travelHours!: string;
  @Matches(DECIMAL, msg('adminHours')) adminHours!: string;
  @Matches(DECIMAL, msg('coordHours')) coordHours!: string;
  @Matches(DECIMAL, msg('staffHours')) staffHours!: string;
  @Matches(DECIMAL, msg('hourlyRate')) hourlyRate!: string;
  @Matches(DECIMAL, msg('fixedCosts')) fixedCosts!: string;
  /** Fracción: 0.2 = 20 %. */
  @Matches(DECIMAL, msg('premiumPct')) premiumPct!: string;
  @Matches(DECIMAL, msg('highCoef')) highCoef!: string;
  /** 0 a 12; admite medio mes (2.5). */
  @Matches(DECIMAL, msg('highMonths')) highMonths!: string;
}

/**
 * Configuración del viático. Solo modo POR_KM hasta que el cliente defina los
 * tramos (P-3, ADR-008).
 */
export class TravelConfigDto {
  @IsString()
  @Length(2, 80)
  baseLabel!: string;

  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  baseLat!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  baseLng!: number;

  @Matches(DECIMAL, msg('freeRadiusKm')) freeRadiusKm!: string;
  /** Entre 1 y 3: por debajo de 1 la ruta sería más corta que la línea recta. */
  @Matches(/^(1(\.\d{1,2})?|2(\.\d{1,2})?|3(\.0{1,2})?)$/, { message: 'routeFactor: entre 1 y 3 (ej. 1.3)' })
  routeFactor!: string;

  @Matches(DECIMAL, msg('costPerKm')) costPerKm!: string;

  @IsIn(['POR_KM'], { message: 'mode: por ahora solo POR_KM (tramos pendientes de definición, P-3)' })
  mode!: 'POR_KM';
}

/** Parámetros generales permitidos (lista cerrada). */
export const PARAM_RULES = {
  TERRITORY_TOLERANCE_KM: { min: 0, max: 20 },
} as const;
export type ParamKey = keyof typeof PARAM_RULES;

export class PricingParamDto {
  @Matches(DECIMAL, msg('value')) value!: string;
}

export class TestSimulationDto {
  @Matches(/^[A-Z0-9_]{2,40}$/)
  propertyTypeCode!: string;

  @IsInt()
  @Min(1)
  @Max(3)
  serviceLevel!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  lng!: number;
}

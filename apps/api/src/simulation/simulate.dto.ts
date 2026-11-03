import { IsInt, IsNumber, Matches, Max, Min } from 'class-validator';

/** Entrada del cotizador público. Lo único que elige el visitante: tipo, nivel y ubicación. */
export class SimulateDto {
  @Matches(/^[A-Z0-9_]{2,40}$/, { message: 'Tipo de propiedad inválido' })
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

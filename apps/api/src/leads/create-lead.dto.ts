import { Equals, IsEmail, IsOptional, IsString, IsUUID, Length, Matches, MaxLength } from 'class-validator';

/** Formulario de diagnóstico (Ley 18.331: datos mínimos y consentimiento expreso). */
export class CreateLeadDto {
  @IsString()
  @Length(2, 120)
  name!: string;

  @IsEmail({}, { message: 'Email inválido' })
  @MaxLength(160)
  email!: string;

  @IsOptional()
  @Matches(/^[0-9+()\-\s]{6,30}$/, { message: 'Teléfono inválido' })
  phone?: string;

  @IsOptional()
  @Matches(/^[A-Z0-9_]{2,40}$/, { message: 'Tipo de propiedad inválido' })
  propertyTypeCode?: string;

  @IsOptional()
  @IsUUID('4')
  simulationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  /** Debe ser exactamente true: sin consentimiento no se guarda nada. */
  /** País de residencia (opcional). Texto libre corto, sin caracteres de control. */
  @IsOptional()
  @IsString()
  @Length(2, 60)
  @Matches(/^[^\u0000-\u001F\u007F<>]+$/, { message: 'País inválido' })
  residenceCountry?: string;

  /** Localidad o zona del inmueble (opcional). No se pide la dirección exacta (minimización). */
  @IsOptional()
  @IsString()
  @Length(2, 120)
  @Matches(/^[^\u0000-\u001F\u007F<>]+$/, { message: 'Ubicación inválida' })
  propertyLocation?: string;

  @Equals(true, { message: 'Se requiere el consentimiento' })
  consent!: true;

  @Matches(/^[a-z0-9.\-]{1,40}$/, { message: 'Versión de política inválida' })
  policyVersion!: string;

  @IsString()
  @Length(1, 2048)
  turnstileToken!: string;
}

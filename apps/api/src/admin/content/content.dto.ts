import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsDefined,
  IsInt,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

/** El valor se valida con el esquema de la sección (content-schema.ts). */
export class UpdateSectionDto {
  @IsDefined()
  value!: unknown;
}

export class UpdateServiceLevelDto {
  @IsString()
  @Length(3, 80)
  name!: string;

  @IsString()
  @Length(3, 400)
  description!: string;

  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Length(2, 160, { each: true })
  items!: string[];
}

export class FaqDto {
  @IsString()
  @Length(5, 200)
  question!: string;

  @IsString()
  @Length(5, 2000)
  answer!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999)
  sortOrder!: number;

  @IsBoolean()
  visible!: boolean;
}

/** Testimonios: solo reales y con fecha de autorización del autor (plan, sección 4.1). */
export class TestimonialDto {
  @IsString()
  @Length(2, 120)
  author!: string;

  @IsString()
  @Length(10, 1000)
  text!: string;

  @IsDateString({ strict: true })
  authorizedAt!: string;

  @IsBoolean()
  visible!: boolean;
}

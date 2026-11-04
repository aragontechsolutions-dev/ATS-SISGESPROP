import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Decimal } from 'decimal.js';
import { IsNumber, Max, Min } from 'class-validator';
import { toMoney } from '@ats/pricing';
import { Public } from '../auth/public.decorator.ts';
import { PublicationService, travelFor } from '../publication/publication.service.ts';

export class PointDto {
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  lng!: number;
}

/**
 * Datos públicos del mapa de cobertura (plan, sección 4.2).
 * La base de operaciones se muestra en el mapa: es información pública.
 * No guarda nada (no hay datos personales en estas consultas).
 */
@Controller('public')
export class CoverageController {
  constructor(private readonly publications: PublicationService) {}

  @Public()
  @Get('coverage')
  async coverage(): Promise<{ baseLabel: string; baseLat: number; baseLng: number }> {
    const { pricing } = await this.publications.getPricing();
    return { baseLabel: pricing.travel.baseLabel, baseLat: pricing.travel.baseLat, baseLng: pricing.travel.baseLng };
  }

  /** Distancia y viático por visita (ida y vuelta) para un punto del mapa. */
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('travel-estimate')
  @HttpCode(200)
  async travelEstimate(@Body() dto: PointDto) {
    const { pricing } = await this.publications.getPricing();
    const { travel } = travelFor(pricing, { lat: dto.lat, lng: dto.lng });
    return {
      distanceKm: travel.routeKm,
      billableKm: travel.billableKm,
      travelCostPerVisit: toMoney(new Decimal(travel.billableKm).times(pricing.travel.costPerKm)),
      currency: 'USD' as const,
    };
  }
}

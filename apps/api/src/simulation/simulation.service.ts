import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { computeFee } from '@ats/pricing';
import { APP_CONFIG, type AppConfig } from '../config/app-config.ts';
import { PrismaService } from '../prisma/prisma.service.ts';
import { hashIp } from '../common/ip-hash.ts';
import { PublicationService, travelFor } from '../publication/publication.service.ts';
import type { SimulateDto } from './simulate.dto.ts';

/** Respuesta pública: solo totales, distancia y viático. Nunca valor hora ni prima. */
export interface SimulationResponse {
  simulationId: string;
  currency: 'USD';
  distanceKm: string;
  billableKm: string;
  travelCostMonthly: string;
  lowFee: string;
  highFee: string;
  annualFee: string;
}

@Injectable()
export class SimulationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publications: PublicationService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async simulate(dto: SimulateDto, ip: string | undefined): Promise<SimulationResponse> {
    const { publicationId, pricing } = await this.publications.getPricing();

    const propertyType = await this.prisma.propertyType.findUnique({ where: { code: dto.propertyTypeCode } });
    const profile = pricing.profiles.find(
      (p) => p.propertyTypeCode === dto.propertyTypeCode && p.serviceLevel === dto.serviceLevel,
    );
    if (!propertyType || !profile) {
      throw new NotFoundException('No hay tarifa publicada para ese tipo de propiedad y nivel de servicio');
    }

    const point = { lat: dto.lat, lng: dto.lng };
    const { travel, toleranceKm } = travelFor(pricing, point);
    const fee = computeFee({ profile, billableKm: travel.billableKm, costPerKm: pricing.travel.costPerKm });

    const simulation = await this.prisma.simulation.create({
      data: {
        propertyTypeId: propertyType.id,
        serviceLevel: dto.serviceLevel,
        lat: dto.lat.toFixed(6),
        lng: dto.lng.toFixed(6),
        distanceKm: travel.routeKm,
        billableKm: travel.billableKm,
        lowFee: fee.lowFee,
        highFee: fee.highFee,
        annualFee: fee.annualFee,
        // Todo lo necesario para reproducir el cálculo si el cliente lo reclama.
        inputsSnapshot: {
          publicationId,
          profile: { ...profile },
          travelConfig: { ...pricing.travel },
          territoryToleranceKm: toleranceKm,
          travel: { ...travel },
          fee: { ...fee.exact },
        },
        ipHash: hashIp(ip, this.config.ipHashSecret),
      },
      select: { id: true },
    });

    return {
      simulationId: simulation.id,
      currency: 'USD',
      distanceKm: travel.routeKm,
      billableKm: travel.billableKm,
      travelCostMonthly: fee.travelCost,
      lowFee: fee.lowFee,
      highFee: fee.highFee,
      annualFee: fee.annualFee,
    };
  }
}

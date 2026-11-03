import {
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { computeFee, computeTravel, isWithinTerritory } from '@ats/pricing';
import { APP_CONFIG, type AppConfig } from '../config/app-config.ts';
import { PrismaService } from '../prisma/prisma.service.ts';
import { hashIp } from '../common/ip-hash.ts';
import { DEFAULT_TERRITORY_TOLERANCE_KM, URUGUAY_GEOMETRY } from '../geo/uruguay.ts';
import { parsePricingSnapshot } from './pricing-snapshot.ts';
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
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async simulate(dto: SimulateDto, ip: string | undefined): Promise<SimulationResponse> {
    const publication = await this.prisma.publication.findFirst({ orderBy: { publishedAt: 'desc' } });
    const pricing = publication ? parsePricingSnapshot(publication.snapshot) : null;
    if (!publication || !pricing) {
      throw new ServiceUnavailableException('El cotizador aún no está configurado');
    }

    const propertyType = await this.prisma.propertyType.findUnique({ where: { code: dto.propertyTypeCode } });
    const profile = pricing.profiles.find(
      (p) => p.propertyTypeCode === dto.propertyTypeCode && p.serviceLevel === dto.serviceLevel,
    );
    if (!propertyType || !profile) {
      throw new NotFoundException('No hay tarifa publicada para ese tipo de propiedad y nivel de servicio');
    }

    const point = { lat: dto.lat, lng: dto.lng };
    const tolerance = Number(pricing.params.TERRITORY_TOLERANCE_KM ?? DEFAULT_TERRITORY_TOLERANCE_KM);
    if (!isWithinTerritory(point, URUGUAY_GEOMETRY, tolerance)) {
      throw new UnprocessableEntityException('La ubicación está fuera de Uruguay');
    }

    const t = pricing.travel;
    if (t.mode !== 'POR_KM') {
      throw new ServiceUnavailableException('El cálculo de viático por tramos aún no está disponible');
    }
    const travel = computeTravel(
      {
        base: { lat: t.baseLat, lng: t.baseLng },
        freeRadiusKm: t.freeRadiusKm,
        routeFactor: t.routeFactor,
        costPerKm: t.costPerKm,
        mode: t.mode,
      },
      point,
    );
    const fee = computeFee({ profile, billableKm: travel.billableKm, costPerKm: t.costPerKm });

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
          publicationId: publication.id,
          profile: { ...profile },
          travelConfig: { ...t },
          territoryToleranceKm: tolerance,
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

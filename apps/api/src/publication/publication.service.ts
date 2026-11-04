import { Injectable, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { computeTravel, isWithinTerritory, type LatLng, type TravelResult } from '@ats/pricing';
import { PrismaService } from '../prisma/prisma.service.ts';
import { DEFAULT_TERRITORY_TOLERANCE_KM, URUGUAY_GEOMETRY } from '../geo/uruguay.ts';
import { parsePricingSnapshot, type PricingSnapshot } from '../simulation/pricing-snapshot.ts';

/**
 * Viático desde la base publicada hasta un punto. Valida que el punto esté en Uruguay
 * (422) y que el modo de cobro esté implementado (503 para POR_TRAMOS, ver ADR-008).
 * Lo usan el cotizador y la estimación del mapa: una sola regla.
 */
export function travelFor(pricing: PricingSnapshot, point: LatLng): { travel: TravelResult; toleranceKm: number } {
  const toleranceKm = Number(pricing.params.TERRITORY_TOLERANCE_KM ?? DEFAULT_TERRITORY_TOLERANCE_KM);
  if (!isWithinTerritory(point, URUGUAY_GEOMETRY, toleranceKm)) {
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
  return { travel, toleranceKm };
}

export interface PublishedPricing {
  publicationId: string;
  pricing: PricingSnapshot;
}

/**
 * Acceso a la última publicación. Todo lo público (cotizador, cobertura, viático)
 * usa la versión publicada, nunca el borrador (ADR-003).
 */
@Injectable()
export class PublicationService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lanza 503 si todavía no hay una publicación con parámetros válidos. */
  async getPricing(): Promise<PublishedPricing> {
    const publication = await this.prisma.publication.findFirst({ orderBy: { publishedAt: 'desc' } });
    const pricing = publication ? parsePricingSnapshot(publication.snapshot) : null;
    if (!publication || !pricing) {
      throw new ServiceUnavailableException('El cotizador aún no está configurado');
    }
    return { publicationId: publication.id, pricing };
  }
}

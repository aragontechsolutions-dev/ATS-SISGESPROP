import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { computeFee, computeTravel, isWithinTerritory, type FeeResult, type LatLng, type TravelResult } from '@ats/pricing';
import { PrismaService } from '../prisma/prisma.service.ts';
import { DEFAULT_TERRITORY_TOLERANCE_KM, URUGUAY_GEOMETRY } from '../geo/uruguay.ts';
import {
  parsePricingSnapshot,
  type PricingSnapshot,
  type PublishedProfile,
} from '../simulation/pricing-snapshot.ts';

/**
 * Viático desde la base hasta un punto. Valida que el punto esté en Uruguay (422)
 * y que el modo de cobro esté implementado (503 para POR_TRAMOS, ver ADR-008).
 * Lo usan el cotizador, la estimación del mapa y la simulación de prueba del panel.
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

export interface Quote {
  profile: PublishedProfile;
  travel: TravelResult;
  toleranceKm: number;
  fee: FeeResult;
}

/**
 * Cotización completa (perfil + viático + abono) sobre un conjunto de parámetros.
 * Única implementación: la usan el cotizador público (con la publicación) y la
 * simulación de prueba del panel (con el borrador).
 */
export function quoteFor(pricing: PricingSnapshot, propertyTypeCode: string, serviceLevel: number, point: LatLng): Quote {
  const profile = pricing.profiles.find((p) => p.propertyTypeCode === propertyTypeCode && p.serviceLevel === serviceLevel);
  if (!profile) throw new NotFoundException('No hay tarifa para ese tipo de propiedad y nivel de servicio');
  const { travel, toleranceKm } = travelFor(pricing, point);
  const fee = computeFee({ profile, billableKm: travel.billableKm, costPerKm: pricing.travel.costPerKm });
  return { profile, travel, toleranceKm, fee };
}

export interface PublishedPricing {
  publicationId: string;
  pricing: PricingSnapshot;
}

/**
 * Acceso a la última publicación. Todo lo público (cotizador, cobertura, viático,
 * contenido) usa la versión publicada, nunca el borrador (ADR-003).
 */
@Injectable()
export class PublicationService {
  constructor(private readonly prisma: PrismaService) {}

  private latest() {
    return this.prisma.publication.findFirst({ orderBy: { publishedAt: 'desc' } });
  }

  /** Lanza 503 si todavía no hay una publicación con parámetros válidos. */
  async getPricing(): Promise<PublishedPricing> {
    const publication = await this.latest();
    const pricing = publication ? parsePricingSnapshot(publication.snapshot) : null;
    if (!publication || !pricing) {
      throw new ServiceUnavailableException('El cotizador aún no está configurado');
    }
    return { publicationId: publication.id, pricing };
  }

  /** Contenido publicado de la landing (sin la parte de precios). 404 si nunca se publicó contenido. */
  async getContent(): Promise<{ publicationId: string; publishedAt: Date; content: unknown }> {
    const publication = await this.latest();
    const snapshot = publication?.snapshot as { content?: unknown } | null | undefined;
    if (!publication || !snapshot || typeof snapshot.content !== 'object' || snapshot.content === null) {
      throw new NotFoundException('Todavía no hay contenido publicado');
    }
    return { publicationId: publication.id, publishedAt: publication.publishedAt, content: snapshot.content };
  }
}

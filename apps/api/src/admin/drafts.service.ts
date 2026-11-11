import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.ts';
import type { PricingSnapshot, PublishedProfile } from '../simulation/pricing-snapshot.ts';
import { CONTENT_SECTIONS, type ContentSection } from './content/content-schema.ts';

/** Decimal de Prisma → texto sin notación científica (formato del snapshot). */
const dec = (d: { toFixed(): string }) => d.toFixed();

export interface DraftContent {
  sections: Partial<Record<ContentSection, Record<string, unknown>>>;
  services: Array<{ level: number; name: string; description: string; items: string[] }>;
  faq: Array<{ category: string; question: string; answer: string }>;
  testimonials: Array<{ author: string; text: string }>;
  propertyTypes: Array<{ code: string; name: string }>;
}

/**
 * Lee el BORRADOR (lo que el administrador edita). Solo lo usan el panel
 * (simulación de prueba) y el botón Publicar. Lo público lee la publicación.
 */
@Injectable()
export class DraftsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Parámetros del cotizador en borrador. null si falta la configuración de viáticos (base). */
  async buildPricing(): Promise<PricingSnapshot | null> {
    const [travel, profiles, params] = await Promise.all([
      this.prisma.travelConfig.findFirst({ orderBy: { id: 'asc' } }),
      this.prisma.calcProfile.findMany({
        include: { propertyType: { select: { code: true } } },
        orderBy: [{ propertyType: { sortOrder: 'asc' } }, { serviceLevel: 'asc' }],
      }),
      this.prisma.pricingParam.findMany(),
    ]);
    if (!travel) return null;

    const publishedProfiles: PublishedProfile[] = profiles.map((p) => ({
      propertyTypeCode: p.propertyType.code,
      serviceLevel: p.serviceLevel,
      visitsPerMonth: dec(p.visitsPerMonth),
      hoursPerVisit: dec(p.hoursPerVisit),
      travelHours: dec(p.travelHours),
      adminHours: dec(p.adminHours),
      coordHours: dec(p.coordHours),
      staffHours: dec(p.staffHours),
      hourlyRate: dec(p.hourlyRate),
      fixedCosts: dec(p.fixedCosts),
      premiumPct: dec(p.premiumPct),
      highCoef: dec(p.highCoef),
      highMonths: dec(p.highMonths),
    }));

    return {
      travel: {
        baseLabel: travel.baseLabel,
        baseLat: Number(travel.baseLat),
        baseLng: Number(travel.baseLng),
        freeRadiusKm: dec(travel.freeRadiusKm),
        routeFactor: dec(travel.routeFactor),
        costPerKm: dec(travel.costPerKm),
        mode: travel.mode,
      },
      profiles: publishedProfiles,
      params: Object.fromEntries(params.map((p) => [p.key, dec(p.value)])),
    };
  }

  /** Contenido de la landing en borrador. */
  async buildContent(): Promise<DraftContent> {
    const [blocks, services, faq, testimonials, propertyTypes] = await Promise.all([
      this.prisma.contentBlock.findMany({ where: { key: 'main' } }),
      this.prisma.serviceLevel.findMany({ orderBy: { level: 'asc' } }),
      this.prisma.faq.findMany({ where: { visible: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }),
      this.prisma.testimonial.findMany({ where: { visible: true }, orderBy: { authorizedAt: 'desc' } }),
      this.prisma.propertyType.findMany({ orderBy: { sortOrder: 'asc' } }),
    ]);
    const sections: DraftContent['sections'] = {};
    for (const b of blocks) {
      if (Object.hasOwn(CONTENT_SECTIONS, b.section)) {
        sections[b.section as ContentSection] = b.value as Record<string, unknown>;
      }
    }
    return {
      sections,
      services: services.map((s) => ({
        level: s.level,
        name: s.name,
        description: s.description,
        items: Array.isArray(s.includedItems) ? (s.includedItems as string[]) : [],
      })),
      faq: faq.map((f) => ({ category: f.category, question: f.question, answer: f.answer })),
      testimonials: testimonials.map((t) => ({ author: t.author, text: t.text })),
      propertyTypes: propertyTypes.map((t) => ({ code: t.code, name: t.name })),
    };
  }

  /** Secciones de contenido que faltan en el borrador (no se puede publicar incompleto). */
  missingSections(content: DraftContent): ContentSection[] {
    return (Object.keys(CONTENT_SECTIONS) as ContentSection[]).filter((s) => !content.sections[s]);
  }
}

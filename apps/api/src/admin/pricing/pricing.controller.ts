import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  ServiceUnavailableException,
} from '@nestjs/common';
import { computeFee, isWithinTerritory } from '@ats/pricing';
import { PrismaService } from '../../prisma/prisma.service.ts';
import type { AdminPrincipal } from '../../auth/auth.guard.ts';
import { DEFAULT_TERRITORY_TOLERANCE_KM, URUGUAY_GEOMETRY } from '../../geo/uruguay.ts';
import { quoteFor } from '../../publication/publication.service.ts';
import { CurrentAdmin } from '../current-admin.decorator.ts';
import { audit } from '../audit.ts';
import { DraftsService } from '../drafts.service.ts';
import {
  CalcProfileDto,
  PARAM_RULES,
  PricingParamDto,
  TestSimulationDto,
  TravelConfigDto,
  type ParamKey,
} from './pricing.dto.ts';

/**
 * Parámetros del cotizador y viáticos (BORRADOR). Nada de esto llega al cotizador
 * público hasta "Publicar". Todas las rutas exigen administrador con 2FA y se auditan.
 */
@Controller('admin/pricing')
export class AdminPricingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drafts: DraftsService,
  ) {}

  /** Borrador completo: perfiles (15 posibles), viático y parámetros. */
  @Get()
  async get() {
    // Los perfiles y parámetros se leen aunque todavía no exista la base de operaciones.
    const [types, profiles, pricing, params] = await Promise.all([
      this.prisma.propertyType.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.listProfiles(),
      this.drafts.buildPricing(),
      this.paramsMap(),
    ]);
    return {
      propertyTypes: types.map((t) => ({ code: t.code, name: t.name })),
      levels: [1, 2, 3],
      profiles,
      travel: pricing?.travel ?? null,
      params,
      configuredProfiles: profiles.length,
      totalProfiles: types.length * 3,
    };
  }

  private async listProfiles() {
    const rows = await this.prisma.calcProfile.findMany({
      include: { propertyType: { select: { code: true } } },
      orderBy: [{ propertyType: { sortOrder: 'asc' } }, { serviceLevel: 'asc' }],
    });
    return rows.map((p) => ({
      propertyTypeCode: p.propertyType.code,
      serviceLevel: p.serviceLevel,
      visitsPerMonth: p.visitsPerMonth.toFixed(),
      hoursPerVisit: p.hoursPerVisit.toFixed(),
      travelHours: p.travelHours.toFixed(),
      adminHours: p.adminHours.toFixed(),
      coordHours: p.coordHours.toFixed(),
      staffHours: p.staffHours.toFixed(),
      hourlyRate: p.hourlyRate.toFixed(),
      fixedCosts: p.fixedCosts.toFixed(),
      premiumPct: p.premiumPct.toFixed(),
      highCoef: p.highCoef.toFixed(),
      highMonths: p.highMonths.toFixed(),
    }));
  }

  private async paramsMap(): Promise<Record<string, string>> {
    const params = await this.prisma.pricingParam.findMany();
    return Object.fromEntries(params.map((p) => [p.key, p.value.toFixed()]));
  }

  @Put('profiles/:code/:level')
  async upsertProfile(
    @Param('code') code: string,
    @Param('level', ParseIntPipe) level: number,
    @Body() dto: CalcProfileDto,
    @CurrentAdmin() admin: AdminPrincipal,
  ) {
    if (level < 1 || level > 3) throw new NotFoundException('Nivel inexistente');
    const type = await this.prisma.propertyType.findUnique({ where: { code } });
    if (!type) throw new NotFoundException('Tipo de propiedad inexistente');

    // Validación con el motor real: si el perfil no se puede calcular, no se guarda.
    try {
      computeFee({ profile: dto, billableKm: 0, costPerKm: 0 });
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : 'Perfil inválido');
    }

    const data = { ...dto };
    return this.prisma.$transaction(async (tx) => {
      const where = { propertyTypeId_serviceLevel: { propertyTypeId: type.id, serviceLevel: level } };
      const before = await tx.calcProfile.findUnique({ where });
      const after = await tx.calcProfile.upsert({
        where,
        create: { propertyTypeId: type.id, serviceLevel: level, ...data },
        update: data,
      });
      await audit(tx, admin.id, before ? 'UPDATE' : 'CREATE', 'calc_profile', `${code}/${level}`, before, after);
      return { propertyTypeCode: code, serviceLevel: level, ...dto };
    });
  }

  @Delete('profiles/:code/:level')
  @HttpCode(204)
  async deleteProfile(
    @Param('code') code: string,
    @Param('level', ParseIntPipe) level: number,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<void> {
    const type = await this.prisma.propertyType.findUnique({ where: { code } });
    if (!type) throw new NotFoundException('Tipo de propiedad inexistente');
    await this.prisma.$transaction(async (tx) => {
      const where = { propertyTypeId_serviceLevel: { propertyTypeId: type.id, serviceLevel: level } };
      const before = await tx.calcProfile.findUnique({ where });
      if (!before) throw new NotFoundException('Perfil inexistente');
      await tx.calcProfile.delete({ where });
      await audit(tx, admin.id, 'DELETE', 'calc_profile', `${code}/${level}`, before, null);
    });
  }

  @Put('travel')
  async updateTravel(@Body() dto: TravelConfigDto, @CurrentAdmin() admin: AdminPrincipal) {
    const tolerance = Number((await this.paramsMap()).TERRITORY_TOLERANCE_KM ?? DEFAULT_TERRITORY_TOLERANCE_KM);
    if (!isWithinTerritory({ lat: dto.baseLat, lng: dto.baseLng }, URUGUAY_GEOMETRY, tolerance)) {
      throw new BadRequestException('La base de operaciones debe estar en Uruguay');
    }
    const data = {
      baseLabel: dto.baseLabel.trim(),
      baseLat: dto.baseLat.toFixed(6),
      baseLng: dto.baseLng.toFixed(6),
      freeRadiusKm: dto.freeRadiusKm,
      routeFactor: dto.routeFactor,
      costPerKm: dto.costPerKm,
      mode: dto.mode,
    };
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.travelConfig.findFirst({ orderBy: { id: 'asc' } });
      const after = before
        ? await tx.travelConfig.update({ where: { id: before.id }, data })
        : await tx.travelConfig.create({ data });
      await audit(tx, admin.id, before ? 'UPDATE' : 'CREATE', 'travel_config', after.id, before, after);
      return { ...dto, baseLabel: data.baseLabel };
    });
  }

  @Put('params/:key')
  async updateParam(@Param('key') key: string, @Body() dto: PricingParamDto, @CurrentAdmin() admin: AdminPrincipal) {
    if (!Object.hasOwn(PARAM_RULES, key)) throw new NotFoundException('Parámetro inexistente');
    const rule = PARAM_RULES[key as ParamKey];
    const n = Number(dto.value);
    if (n < rule.min || n > rule.max) throw new BadRequestException(`${key}: entre ${rule.min} y ${rule.max}`);
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.pricingParam.findUnique({ where: { key } });
      const after = await tx.pricingParam.upsert({
        where: { key },
        create: { key, value: dto.value },
        update: { value: dto.value, validFrom: new Date() },
      });
      await audit(tx, admin.id, before ? 'UPDATE' : 'CREATE', 'pricing_param', key, before, after);
      return { key, value: dto.value };
    });
  }

  /**
   * Simulación de prueba con el BORRADOR (plan 4.4: "probar una simulación antes de
   * publicar"). No se guarda ni afecta al cotizador público. Devuelve el detalle
   * completo porque solo lo ve el administrador.
   */
  @Post('test-simulation')
  @HttpCode(200)
  async testSimulation(@Body() dto: TestSimulationDto) {
    const pricing = await this.drafts.buildPricing();
    if (!pricing) throw new ServiceUnavailableException('Primero configura la base de operaciones (viáticos)');
    const q = quoteFor(pricing, dto.propertyTypeCode, dto.serviceLevel, { lat: dto.lat, lng: dto.lng });
    return {
      totalHours: q.fee.totalHours,
      distanceKm: q.travel.routeKm,
      billableKm: q.travel.billableKm,
      travelCostMonthly: q.fee.travelCost,
      lowFee: q.fee.lowFee,
      highFee: q.fee.highFee,
      annualFee: q.fee.annualFee,
      exact: q.fee.exact,
    };
  }
}

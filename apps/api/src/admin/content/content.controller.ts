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
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.ts';
import type { Prisma } from '../../generated/prisma/client.ts';
import type { AdminPrincipal } from '../../auth/auth.guard.ts';
import { CurrentAdmin } from '../current-admin.decorator.ts';
import { audit } from '../audit.ts';
import { DraftsService } from '../drafts.service.ts';
import { CONTENT_SECTIONS, isContentSection, validateSection } from './content-schema.ts';
import { FaqDto, TestimonialDto, UpdateSectionDto, UpdateServiceLevelDto } from './content.dto.ts';

/**
 * Edición de contenidos (BORRADOR). Los cambios no llegan a la web hasta "Publicar".
 * Todas las rutas exigen administrador con 2FA (guard global) y quedan auditadas.
 */
@Controller('admin/content')
export class AdminContentController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drafts: DraftsService,
  ) {}

  /** Todo el contenido en borrador + qué secciones faltan para poder publicar. */
  @Get()
  async getAll() {
    const content = await this.drafts.buildContent();
    const [faq, testimonials] = await Promise.all([
      this.prisma.faq.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }),
      this.prisma.testimonial.findMany({ orderBy: { authorizedAt: 'desc' } }),
    ]);
    return {
      sections: content.sections,
      sectionNames: Object.keys(CONTENT_SECTIONS),
      missingSections: this.drafts.missingSections(content),
      services: content.services,
      faq,
      testimonials,
      propertyTypes: content.propertyTypes,
    };
  }

  @Put('sections/:section')
  async updateSection(@Param('section') section: string, @Body() dto: UpdateSectionDto, @CurrentAdmin() admin: AdminPrincipal) {
    if (!isContentSection(section)) throw new NotFoundException('Sección inexistente');
    const result = validateSection(section, dto.value);
    if (!result.ok) throw new BadRequestException({ message: 'Contenido inválido', errors: result.errors });

    // Ya validado y normalizado por el esquema de la sección.
    const value = result.value as Prisma.InputJsonValue;
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.contentBlock.findUnique({ where: { section_key: { section, key: 'main' } } });
      const after = await tx.contentBlock.upsert({
        where: { section_key: { section, key: 'main' } },
        create: { section, key: 'main', value, updatedById: admin.id },
        update: { value, updatedById: admin.id },
      });
      await audit(tx, admin.id, 'UPDATE', 'content_block', section, before?.value ?? null, after.value);
      return { section, value: after.value };
    });
  }

  @Put('service-levels/:level')
  async updateServiceLevel(
    @Param('level', ParseIntPipe) level: number,
    @Body() dto: UpdateServiceLevelDto,
    @CurrentAdmin() admin: AdminPrincipal,
  ) {
    if (level < 1 || level > 3) throw new NotFoundException('Nivel inexistente');
    const data = { name: dto.name.trim(), description: dto.description.trim(), includedItems: dto.items.map((i) => i.trim()) };
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.serviceLevel.findUnique({ where: { level } });
      if (!before) throw new NotFoundException('Nivel inexistente');
      const after = await tx.serviceLevel.update({ where: { level }, data });
      await audit(tx, admin.id, 'UPDATE', 'service_level', String(level), before, after);
      return after;
    });
  }

  // ---------------- Preguntas frecuentes ----------------

  @Post('faq')
  async createFaq(@Body() dto: FaqDto, @CurrentAdmin() admin: AdminPrincipal) {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.faq.create({ data: { ...dto, question: dto.question.trim(), answer: dto.answer.trim() } });
      await audit(tx, admin.id, 'CREATE', 'faq', created.id, null, created);
      return created;
    });
  }

  @Put('faq/:id')
  async updateFaq(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: FaqDto, @CurrentAdmin() admin: AdminPrincipal) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.faq.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Pregunta inexistente');
      const after = await tx.faq.update({ where: { id }, data: { ...dto, question: dto.question.trim(), answer: dto.answer.trim() } });
      await audit(tx, admin.id, 'UPDATE', 'faq', id, before, after);
      return after;
    });
  }

  @Delete('faq/:id')
  @HttpCode(204)
  async deleteFaq(@Param('id', new ParseUUIDPipe()) id: string, @CurrentAdmin() admin: AdminPrincipal): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const before = await tx.faq.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Pregunta inexistente');
      await tx.faq.delete({ where: { id } });
      await audit(tx, admin.id, 'DELETE', 'faq', id, before, null);
    });
  }

  // ---------------- Testimonios ----------------

  private checkAuthorizedAt(value: string): Date {
    const date = new Date(value);
    if (date.getTime() > Date.now()) throw new BadRequestException('La fecha de autorización no puede ser futura');
    return date;
  }

  @Post('testimonials')
  async createTestimonial(@Body() dto: TestimonialDto, @CurrentAdmin() admin: AdminPrincipal) {
    const authorizedAt = this.checkAuthorizedAt(dto.authorizedAt);
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.testimonial.create({
        data: { author: dto.author.trim(), text: dto.text.trim(), authorizedAt, visible: dto.visible },
      });
      await audit(tx, admin.id, 'CREATE', 'testimonial', created.id, null, created);
      return created;
    });
  }

  @Put('testimonials/:id')
  async updateTestimonial(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: TestimonialDto,
    @CurrentAdmin() admin: AdminPrincipal,
  ) {
    const authorizedAt = this.checkAuthorizedAt(dto.authorizedAt);
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.testimonial.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Testimonio inexistente');
      const after = await tx.testimonial.update({
        where: { id },
        data: { author: dto.author.trim(), text: dto.text.trim(), authorizedAt, visible: dto.visible },
      });
      await audit(tx, admin.id, 'UPDATE', 'testimonial', id, before, after);
      return after;
    });
  }

  @Delete('testimonials/:id')
  @HttpCode(204)
  async deleteTestimonial(@Param('id', new ParseUUIDPipe()) id: string, @CurrentAdmin() admin: AdminPrincipal): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const before = await tx.testimonial.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Testimonio inexistente');
      await tx.testimonial.delete({ where: { id } });
      await audit(tx, admin.id, 'DELETE', 'testimonial', id, before, null);
    });
  }
}

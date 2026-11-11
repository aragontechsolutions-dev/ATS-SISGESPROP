import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Logger,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  ServiceUnavailableException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { randomUUID } from 'node:crypto';
import { IsString, Length, Matches } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service.ts';
import type { AdminPrincipal } from '../../auth/auth.guard.ts';
import { CurrentAdmin } from '../current-admin.decorator.ts';
import { audit } from '../audit.ts';
import { ImageRejectedError, MAX_UPLOAD_BYTES, OUTPUT_NAMES, processImage } from './image-processing.ts';
import { MEDIA_STORE, type MediaStore } from './media-store.ts';

/** Texto alternativo (accesibilidad y SEO): obligatorio, sin caracteres de control ni < >. */
const ALT_RULE = /^[^\u0000-\u001F\u007F<>]+$/;

export class MediaAltDto {
  @IsString()
  @Length(5, 150)
  @Matches(ALT_RULE)
  alt!: string;
}

/** Clave con la que el contenido referencia una imagen subida (las fijas usan su nombre). */
export const mediaKey = (id: string) => `media:${id}`;

/** Lo único que se usa del archivo recibido por multer (en memoria). */
interface UploadedImage {
  buffer: Buffer;
  size: number;
}

/** Serializa el procesamiento: Render gratuito tiene 512 MB y sharp usa memoria por imagen. */
let queue: Promise<unknown> = Promise.resolve();
function serialized<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

/**
 * Imágenes del panel (Etapa D4, ADR-020). Solo administradores con 2FA (guard global); todo
 * cambio se audita. La subida va a la API (no directo a Storage) para poder validar y
 * redibujar la imagen en el servidor: el navegador no es confiable.
 */
@Controller('admin/media')
export class AdminMediaController {
  private readonly logger = new Logger('AdminMedia');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(MEDIA_STORE) private readonly store: MediaStore,
  ) {}

  private view(m: { id: string; storagePath: string; altText: string; width: number; height: number; createdAt: Date }) {
    const base = `${this.store.publicBaseUrl}${m.storagePath}/`;
    return {
      id: m.id,
      key: mediaKey(m.id),
      alt: m.altText,
      width: m.width,
      height: m.height,
      createdAt: m.createdAt,
      thumbnailUrl: `${base}480.webp`,
    };
  }

  @Get()
  async list() {
    const rows = await this.prisma.mediaAsset.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
    return { uploadEnabled: this.store.enabled, baseUrl: this.store.publicBaseUrl, items: rows.map((m) => this.view(m)) };
  }

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('file', {
      // En memoria: el archivo nunca toca el disco del servidor. Un solo archivo y un solo campo.
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 1, fieldSize: 1024, parts: 2, headerPairs: 20 },
    }),
  )
  async upload(
    @CurrentAdmin() admin: AdminPrincipal,
    @UploadedFile() file: UploadedImage | undefined,
    @Body() body: MediaAltDto,
  ) {
    if (!this.store.enabled) {
      throw new ServiceUnavailableException('La subida de imágenes no está configurada (falta la clave de Storage).');
    }
    if (!file?.buffer) throw new BadRequestException('Falta el archivo de imagen.');

    let processed;
    try {
      processed = await serialized(() => processImage(file.buffer));
    } catch (e) {
      if (e instanceof ImageRejectedError) throw new BadRequestException(e.message);
      throw e;
    }

    const id = randomUUID();
    const uploaded: string[] = [];
    try {
      for (const f of processed.files) {
        const path = `${id}/${f.name}`;
        await this.store.put(path, f.data, 'image/webp');
        uploaded.push(path);
      }
    } catch {
      await this.store.remove(uploaded).catch(() => this.logger.warn(`No se pudieron limpiar archivos de ${id}`));
      throw new ServiceUnavailableException('No se pudo guardar la imagen. Intenta de nuevo en unos minutos.');
    }

    const alt = body.alt.trim();
    try {
      const asset = await this.prisma.$transaction(async (tx) => {
        const created = await tx.mediaAsset.create({
          data: { id, storagePath: id, altText: alt, width: processed.width, height: processed.height, uploadedById: admin.id },
        });
        await audit(tx, admin.id, 'media.upload', 'media_asset', id, null, {
          alt,
          originalBytes: file.size,
          files: processed.files.map((f) => ({ name: f.name, bytes: f.data.length })),
        });
        return created;
      });
      return this.view(asset);
    } catch (e) {
      await this.store.remove(uploaded).catch(() => this.logger.warn(`No se pudieron limpiar archivos de ${id}`));
      throw e;
    }
  }

  @Patch(':id')
  async updateAlt(@CurrentAdmin() admin: AdminPrincipal, @Param('id', ParseUUIDPipe) id: string, @Body() body: MediaAltDto) {
    const alt = body.alt.trim();
    const asset = await this.prisma.$transaction(async (tx) => {
      const before = await tx.mediaAsset.findUnique({ where: { id } });
      if (!before) throw new NotFoundException();
      const updated = await tx.mediaAsset.update({ where: { id }, data: { altText: alt } });
      await audit(tx, admin.id, 'media.alt', 'media_asset', id, { alt: before.altText }, { alt });
      return updated;
    });
    return this.view(asset);
  }

  /**
   * Borrar solo si NO se usa en el borrador ni en ninguna publicación (las publicaciones se pueden
   * restaurar: una imagen borrada dejaría la web restaurada con un hueco).
   */
  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentAdmin() admin: AdminPrincipal, @Param('id', ParseUUIDPipe) id: string) {
    if (!this.store.enabled) {
      throw new ServiceUnavailableException('La gestión de imágenes no está configurada (falta la clave de Storage).');
    }
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException();

    const needle = `%"${mediaKey(id)}"%`;
    const [inDraft, inPublications, inLevels] = await Promise.all([
      this.prisma.$queryRaw<Array<{ n: bigint }>>`SELECT count(*) AS n FROM content_block WHERE value::text LIKE ${needle}`,
      this.prisma.$queryRaw<Array<{ n: bigint }>>`SELECT count(*) AS n FROM publication WHERE snapshot::text LIKE ${needle}`,
      this.prisma.serviceLevel.count({ where: { imageId: id } }),
    ]);
    if (Number(inDraft[0]?.n ?? 0) > 0 || inLevels > 0) {
      throw new ConflictException('La imagen se usa en el contenido: cámbiala por otra antes de borrarla.');
    }
    if (Number(inPublications[0]?.n ?? 0) > 0) {
      throw new ConflictException('La imagen se usó en una publicación (se puede restaurar): no se puede borrar.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.mediaAsset.delete({ where: { id } });
      await audit(tx, admin.id, 'media.delete', 'media_asset', id, { alt: asset.altText }, null);
    });
    // Después de la base: si Storage falla, quedan archivos huérfanos (inofensivos), nunca una
    // referencia rota.
    await this.store
      .remove(OUTPUT_NAMES.map((n) => `${asset.storagePath}/${n}`))
      .catch(() => this.logger.warn(`Archivos de ${id} no se borraron de Storage (huérfanos)`));
  }
}

import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator.ts';
import { PublicationService } from '../publication/publication.service.ts';

/**
 * Contenido publicado de la landing (sin precios). Lo consume el build de la web
 * (prerender) para generar el HTML estático con lo último publicado desde el panel.
 */
@Controller('public/content')
export class PublicContentController {
  constructor(private readonly publications: PublicationService) {}

  @Public()
  @Get()
  get() {
    return this.publications.getContent();
  }
}

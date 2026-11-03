import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import type { AppConfig } from './config/app-config.ts';

/**
 * Configuración HTTP común (producción y pruebas):
 *  - Cabeceras de seguridad (helmet) y sin "X-Powered-By".
 *  - CORS con lista exacta de orígenes; sin cookies (se usa Bearer).
 *  - Cuerpo JSON limitado a 20 KB.
 *  - IP real detrás del proxy de Render (trust proxy).
 *  - Validación estricta: se rechazan campos no declarados en los DTO.
 */
export function configureApp(app: NestExpressApplication, config: AppConfig): void {
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxyHops);
  app.use(helmet());
  app.enableCors({
    origin: config.corsOrigins,
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    maxAge: 600,
  });
  app.useBodyParser('json', { limit: '20kb' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: config.nodeEnv === 'production',
    }),
  );
  app.enableShutdownHooks();
}

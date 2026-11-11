import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_CONFIG, isRateLimitDisabled, loadConfig, type AppConfig } from './config/app-config.ts';
import { PrismaService } from './prisma/prisma.service.ts';
import { AuthGuard } from './auth/auth.guard.ts';
import { TOKEN_VERIFIER, TokenVerifier } from './auth/token-verifier.ts';
import { HealthController } from './health/health.controller.ts';
import { PublicationService } from './publication/publication.service.ts';
import { SimulationController } from './simulation/simulation.controller.ts';
import { SimulationService } from './simulation/simulation.service.ts';
import { CoverageController } from './coverage/coverage.controller.ts';
import { LeadsController } from './leads/leads.controller.ts';
import { LeadsService } from './leads/leads.service.ts';
import { CAPTCHA_VERIFIER, TurnstileVerifier } from './leads/turnstile.verifier.ts';
import { LEAD_NOTIFIER, LogLeadNotifier } from './leads/lead-notifier.ts';
import { ResendLeadNotifier } from './leads/resend-notifier.ts';
import { MeController } from './admin/me.controller.ts';
import { PublicContentController } from './publication/content.controller.ts';
import { DraftsService } from './admin/drafts.service.ts';
import { AdminContentController } from './admin/content/content.controller.ts';
import { AdminPricingController } from './admin/pricing/pricing.controller.ts';
import { AdminPublishController } from './admin/publish/publish.controller.ts';
import { DEPLOY_TRIGGER, VercelDeployTrigger } from './admin/publish/deploy-trigger.ts';
import { AdminLeadsController } from './admin/leads/leads-admin.controller.ts';
import { AdminAuditController } from './admin/audit.controller.ts';
import { AdminMediaController } from './admin/media/media.controller.ts';
import { DisabledMediaStore, MEDIA_STORE, SupabaseMediaStore } from './admin/media/media-store.ts';

@Module({
  imports: [
    // Límite global por IP: 60 peticiones por minuto (rutas concretas pueden ser más estrictas).
    // RATE_LIMIT_DISABLED solo existe para escaneos de seguridad en entornos de prueba:
    // loadConfig impide arrancar con él en producción y aquí se vuelve a comprobar.
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 60 }],
      skipIf: () => isRateLimitDisabled(),
    }),
  ],
  controllers: [
    // Públicos
    HealthController,
    SimulationController,
    CoverageController,
    PublicContentController,
    LeadsController,
    // Panel (administrador con 2FA)
    MeController,
    AdminContentController,
    AdminPricingController,
    AdminPublishController,
    AdminLeadsController,
    AdminAuditController,
    AdminMediaController,
  ],
  providers: [
    { provide: APP_CONFIG, useFactory: () => loadConfig() },
    {
      provide: TOKEN_VERIFIER,
      useFactory: (config: AppConfig) => TokenVerifier.forSupabase(config.supabaseUrl),
      inject: [APP_CONFIG],
    },
    {
      provide: CAPTCHA_VERIFIER,
      useFactory: (config: AppConfig) =>
        new TurnstileVerifier(config.turnstileSecretKey, config.turnstileAllowedHostnames),
      inject: [APP_CONFIG],
    },
    {
      // Resend si está configurado (obligatorio en producción); si no, solo log.
      provide: LEAD_NOTIFIER,
      useFactory: (config: AppConfig) => (config.resend ? new ResendLeadNotifier(config.resend) : new LogLeadNotifier()),
      inject: [APP_CONFIG],
    },
    {
      provide: DEPLOY_TRIGGER,
      useFactory: (config: AppConfig) => new VercelDeployTrigger(config.vercelDeployHookUrl),
      inject: [APP_CONFIG],
    },
    {
      // Imágenes en Supabase Storage con la clave secreta (solo servidor). Sin clave: deshabilitado.
      provide: MEDIA_STORE,
      useFactory: (config: AppConfig) =>
        config.media.secretKey
          ? new SupabaseMediaStore(config.supabaseUrl, config.media.bucket, config.media.secretKey)
          : new DisabledMediaStore(`${config.supabaseUrl}/storage/v1/object/public/${config.media.bucket}/`),
      inject: [APP_CONFIG],
    },
    DraftsService,
    PrismaService,
    PublicationService,
    SimulationService,
    LeadsService,
    // El orden importa: primero el límite de peticiones, luego la autenticación.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}

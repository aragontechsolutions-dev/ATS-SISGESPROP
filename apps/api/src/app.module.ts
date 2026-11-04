import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_CONFIG, loadConfig, type AppConfig } from './config/app-config.ts';
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
import { MeController } from './admin/me.controller.ts';

@Module({
  imports: [
    // Límite global por IP: 60 peticiones por minuto (rutas concretas pueden ser más estrictas).
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 60 }]),
  ],
  controllers: [HealthController, SimulationController, CoverageController, LeadsController, MeController],
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
    { provide: LEAD_NOTIFIER, useClass: LogLeadNotifier },
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

import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.ts';
import { APP_CONFIG, type AppConfig } from '../config/app-config.ts';

/**
 * Cliente Prisma 7 con adaptador pg. Usa DATABASE_URL (pooler en modo transacción).
 * Es el ÚNICO punto de acceso a datos: el navegador nunca habla con la base.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    super({ adapter: new PrismaPg({ connectionString: config.databaseUrl }) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

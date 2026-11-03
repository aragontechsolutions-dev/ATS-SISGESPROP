import { defineConfig } from 'prisma/config';

/**
 * Configuración de la CLI de Prisma 7.
 * La CLI (migraciones) usa DIRECT_URL: conexión directa o session pooler (:5432).
 * La aplicación en ejecución usa DATABASE_URL (transaction pooler :6543) vía adaptador pg.
 * Se usa process.env (y no env()) para que `prisma generate` funcione sin base de datos.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DIRECT_URL,
  },
});

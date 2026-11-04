# ADR-007 – Prisma 7.10.1, NestJS 12 ESM y pruebas con `node --test`

**Contexto.** Al 03/11/2026 la etiqueta `latest` de `prisma` en npm apunta a `8.0.0-rc.30` (versión
candidata), mientras que `@prisma/client` `latest` es 7.10.1. NestJS 12 se publica como ESM.

**Decisión.**
- Prisma **7.10.1** (CLI y cliente alineados), generador `prisma-client` con salida ESM en
  `src/generated/prisma` (no se versiona, se genera en el build). La URL de la CLI está en `prisma.config.ts`
  (`DIRECT_URL`); la app usa `@prisma/adapter-pg` con `DATABASE_URL`.
- NestJS 12.3.2 (ESM). TypeScript 5.9.3 con `rewriteRelativeImportExtensions`, porque el cliente
  generado importa archivos `.ts`.
- Pruebas de la API con `node --test` sobre el código compilado por `tsc`. Así los decoradores emiten
  los metadatos que necesita la inyección de dependencias de NestJS, sin depender de un transformador
  de terceros. El motor (`packages/pricing`) usa Vitest 4.

**Consecuencias.** No se adopta Prisma 8 hasta que salga estable y pase un período de espera.

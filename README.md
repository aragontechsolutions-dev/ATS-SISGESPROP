# PRIVAT – Sistema de gestión de propiedades (Uruguay)

Plataforma de *Property Management* técnico de **PRIVAT** para Maldonado, Punta del Este y Rocha
(cobertura en todo Uruguay). Desarrollada por Aragon Tech Solutions por etapas.

> **Repositorio de trabajo:** `aragontechsolutions-dev/ATS-SISGESPROP` (Aragon Tech Solutions).
> Cuando PRIVAT tenga su propio repositorio, el código se traspasa siguiendo
> [la guía de traspaso](docs/guia-tecnica.md#10-traspaso-al-repositorio-del-cliente). **Etapa actual: 1** (landing, mapa de
cobertura, cotizador y panel admin), según el documento *Plan de desarrollo – Etapa 1*.

## Estado de la Etapa 1

| Bloque (plan) | Días | Estado |
|---|---|---|
| A. Base técnica: monorepo, API NestJS, seguridad, modelo de datos | 1–3 | ✅ Código y pruebas listos. Falta crear las cuentas del cliente (Supabase, Render, Vercel: P-16) |
| B. Motor de cálculo + viático (**Hito 1**) | 4 | ✅ Reproduce al centavo los 3 casos de la planilla |
| C. Landing, mapa, cotizador y formulario (**Hito 2**) | 5–9 | ✅ Con contenido provisorio. Falta el proveedor de email y el contenido del cliente |
| D. Panel admin | 10–13 | ⏳ Pendiente |
| E. Calidad y entrega | 14–15 | ⏳ Pendiente |

## Estructura

```
packages/pricing   Motor de cotización y viático (TypeScript puro, sin framework)
apps/api           API NestJS 12 + Prisma 7 (PostgreSQL / Supabase)
  prisma/          Esquema (17 tablas), migraciones (incluye seguridad RLS) y seed
  src/             Código de la API
  test/            Pruebas unitarias, de integración y de seguridad
apps/web           Landing prerenderizada (React 19 + Vite 8 + Tailwind 4); panel /admin en el Bloque D
docs/              Guía técnica, seguridad, decisiones (ADR), pendientes y bitácora
```

## Inicio rápido

```bash
# Node 24.22.1 o superior (rama 24)
npm ci --ignore-scripts
npm test -w @ats/pricing
```

La guía completa (base de datos local, variables de entorno, pruebas de la API,
despliegue) está en [docs/guia-tecnica.md](docs/guia-tecnica.md).

## Documentación

- [Guía técnica](docs/guia-tecnica.md)
- [Seguridad](docs/seguridad.md)
- [Decisiones de arquitectura (ADR)](docs/adr/README.md)
- [Pendientes del cliente y dudas abiertas](docs/pendientes.md)
- [Bitácora de desarrollo](docs/bitacora.md)

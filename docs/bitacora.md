# Bitácora de desarrollo

## 2026-11-03 – Etapa 1, bloques A y B (días 1–4 del plan)

**Hecho**
1. Monorepo con npm workspaces, Node 24.22.1, `.npmrc` endurecido ([ADR-001](adr/ADR-001-monorepo-npm-workspaces.md)).
2. Motor de cálculo `packages/pricing`: fórmula del abono, viático (Haversine × factor de ruta, radio
   sin cargo), validación de territorio con tolerancia. 25 pruebas; los 3 casos de la planilla dan
   el resultado al centavo (**Hito 1**).
3. Modelo de datos: 17 tablas del DER Etapa 1 en Prisma 7.10.1, migración inicial y migración de
   seguridad (RLS + REVOKE + `audit_log` inmutable + FK a `auth.users`); seed idempotente con datos
   confirmados.
4. API NestJS 12: configuración validada, helmet, CORS exacto, límite de 20 KB, límite de peticiones,
   guard global JWT/JWKS con 2FA y rol en base, `/health`, `/admin/me`, `POST /public/simulations`.
5. 41 pruebas de la API (unitarias, integración con PostgreSQL y seguridad).
6. CI en GitHub Actions con acciones fijadas por SHA, verificado localmente desde cero.

**Hallazgos durante el desarrollo**
- `_prisma_migrations` quedaba sin RLS: se agregó a la migración de seguridad.
- El contorno 1:10m deja fuera puntos costeros reales (Cabo Polonio, Punta Ballena): se agregó una
  tolerancia de 2 km ([ADR-006](adr/ADR-006-contorno-uruguay-tolerancia.md)).
- En la hoja CARTERA las visitas/mes del Apto (2) y de la Chacra (5) y los meses de alta del Apto (2,5)
  **están en la planilla**: no son deducciones. Solo el costo/km 0,35 es deducido.
- La etiqueta `latest` de `prisma` apunta a una versión candidata (8.0.0-rc): se fijó 7.10.1
  ([ADR-007](adr/ADR-007-versiones-y-pruebas.md)).

**Siguiente**: Bloque C (día 5): proyecto Vite + Tailwind con los tokens de identidad visual y prueba de
prerender.

# Guía técnica

## 1. Arquitectura (Etapa 1)

```
Visitante / Admin ──► Vercel (web estática + panel /admin) ──► API NestJS (Render) ──► Supabase PostgreSQL
                                     │                              │
                                     └── login ──► Supabase Auth ◄──┘ verifica JWT con JWKS
```

- **La web nunca toca la base de datos.** Toda lectura/escritura y todo cálculo de precio
  pasa por la API (ver [ADR-003](adr/ADR-003-calculo-en-servidor-con-publicacion.md)).
- La API es el único cliente de la base; usa Prisma 7 con el adaptador `pg`.
- Para la Data API de Supabase (`anon`/`authenticated`) todas las tablas están cerradas
  ([ADR-005](adr/ADR-005-seguridad-base-de-datos.md)).

## 2. Versiones

| Componente | Versión | Motivo |
|---|---|---|
| Node.js | 24.22.1+ (rama 24 LTS) | Parche de CVE-2026-111497 y otras 9 (21/10/2026). Fijado en `.node-version` y `engines` |
| NestJS | 12.3.2 (ESM) | Incluye `multer` 2.5.0 (CVE-2026-113872) y Express 5.3.0 |
| Prisma | 7.10.1 | Última estable; la etiqueta `latest` de npm apunta a una 8.0.0-rc ([ADR-007](adr/ADR-007-versiones-y-pruebas.md)) |
| TypeScript | 5.9.3 | Soporte probado de decoradores con metadatos (requerido por NestJS) |
| decimal.js | 10.6.0 | Aritmética decimal exacta en el motor |
| jose | 6.2.15 | Verificación de JWT con JWKS |

Todas las versiones se guardan exactas (`save-exact=true` en `.npmrc`).

## 3. Entorno local

### 3.1 Requisitos
- Node 24.22.1+ y npm 10+.
- PostgreSQL 15+ local (o un proyecto Supabase de desarrollo).

### 3.2 Instalación
```bash
npm ci --ignore-scripts          # nunca ejecutar scripts de instalación de terceros
npm run build -w @ats/pricing    # la API importa el motor compilado
```

### 3.3 Base de datos local
Se simula lo mínimo de Supabase: esquema `auth.users` (para la FK de `admin_profile`).
Los roles `anon` y `authenticated` los crea la propia migración si no existen.

```bash
sudo -u postgres psql -c "CREATE ROLE ats LOGIN PASSWORD 'ats_local_only' CREATEROLE;"
sudo -u postgres psql -c "CREATE DATABASE ats_dev OWNER ats;"
psql postgresql://ats:ats_local_only@localhost:5432/ats_dev \
  -c "CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);"

cd apps/api
export DIRECT_URL=postgresql://ats:ats_local_only@localhost:5432/ats_dev
npm run db:migrate   # prisma migrate deploy
npm run db:seed      # datos iniciales confirmados (idempotente)
```

### 3.4 Variables de entorno de la API
Ver `apps/api/.env.example`. La API **no arranca** si falta una variable crítica o es inválida
(`src/config/app-config.ts`).

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Conexión de la app: Supabase *transaction pooler* (:6543, `?pgbouncer=true`) |
| `DIRECT_URL` | Solo CLI/migraciones: conexión directa o *session pooler* (:5432). Nunca en Vercel |
| `SUPABASE_URL` | URL del proyecto. La API descarga las claves públicas de `/auth/v1/.well-known/jwks.json` |
| `CORS_ORIGINS` | Orígenes exactos permitidos, separados por coma. En producción solo `https` |
| `IP_HASH_SECRET` | Secreto (≥ 32 caracteres) del HMAC de IPs |
| `TRUST_PROXY_HOPS` | Proxies de confianza delante de la API (Render: valor inicial 1, **a verificar** en el despliegue) |
| `TURNSTILE_SECRET_KEY` | Clave **secreta** de Cloudflare Turnstile (solo en Render) |
| `TURNSTILE_ALLOWED_HOSTNAMES` | Dominios del sitio aceptados en el token (obligatorio en producción) |
| `VERCEL_DEPLOY_HOOK_URL` | Opcional y secreto. "Publicar" lo llama para recompilar la web |
| `SHADOW_DATABASE_URL` | Solo desarrollo: base vacía y descartable para `prisma migrate diff --from-migrations` |

### 3.4 bis Variables de la web (`apps/web/.env.example`)
Son **públicas** (quedan dentro del JavaScript): nunca poner secretos.

| Variable | Uso |
|---|---|
| `VITE_API_URL` | URL de la API. Obligatoria: también se usa para generar la CSP (`connect-src`) |
| `VITE_TURNSTILE_SITE_KEY` | Clave **de sitio** (pública) de Turnstile |
| `VITE_SITE_URL` | URL pública del sitio (canonical, sitemap). Sin ella no se generan |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Panel: URL del proyecto y clave **publicable** (nunca la service role) |
| `REQUIRE_PUBLISHED_CONTENT` | `true` en Vercel: el build falla si no puede leer el contenido publicado ([ADR-014](adr/ADR-014-contenido-publicado-en-el-build.md)) |

### 3.5 Pruebas
```bash
npm test -w @ats/pricing                     # motor: 3 casos de la planilla + validaciones
cd apps/api
TEST_DATABASE_URL=postgresql://ats:ats_local_only@localhost:5432/ats_dev npm test
```
Sin `TEST_DATABASE_URL` solo corren las pruebas unitarias (las de integración se omiten).
Las pruebas de la API usan el ejecutor nativo `node --test` sobre el código compilado
([ADR-007](adr/ADR-007-versiones-y-pruebas.md)).

### 3.6 Ejecutar la API
```bash
cd apps/api && npm run build && npm start   # con las variables de entorno cargadas
curl localhost:3000/health
```

## 4. Endpoints (Etapa 1, bloques A, B y C)

| Método y ruta | Acceso | Descripción |
|---|---|---|
| `GET /health` | Público | `{"status":"ok"}` si la base responde; 503 si no |
| `GET /public/coverage` | Público | Base de operaciones publicada `{ baseLabel, baseLat, baseLng }` (503 sin publicación) |
| `POST /public/travel-estimate` | Público, 20/min por IP | Entrada `lat`, `lng`. Devuelve `distanceKm`, `billableKm`, `travelCostPerVisit` (no guarda nada) |
| `POST /public/simulations` | Público, 10/min por IP | Cotización. Entrada: `propertyTypeCode`, `serviceLevel` (1–3), `lat`, `lng` |
| `POST /public/leads` | Público, 5/min por IP + Turnstile | Formulario de diagnóstico. Ver ADR-009 |
| `GET /public/content` | Público | Contenido de la última publicación (sin precios). Lo usa el build de la web |
| `GET /admin/me` | Admin con 2FA | Perfil del administrador autenticado |

### Endpoints del panel (Bloque D; todos exigen administrador con 2FA y quedan auditados)

| Método y ruta | Descripción |
|---|---|
| `GET /admin/content` | Borrador: secciones, secciones faltantes, niveles, FAQ, testimonios, tipos |
| `PUT /admin/content/sections/:section` | Guarda una sección `{ value }`, validada con `content-schema.ts` |
| `PUT /admin/content/service-levels/:level` | Nombre, descripción e ítems de un nivel |
| `POST/PUT/DELETE /admin/content/faq[/:id]` | Preguntas frecuentes |
| `POST/PUT/DELETE /admin/content/testimonials[/:id]` | Testimonios (fecha de autorización obligatoria, no futura) |
| `GET /admin/pricing` | Perfiles, viático, parámetros y cantidad configurada (de 15) |
| `PUT/DELETE /admin/pricing/profiles/:code/:level` | Perfil de cálculo (validado con el motor real) |
| `PUT /admin/pricing/travel` | Base (dentro de Uruguay), radio, factor (1–3), costo por km; solo `POR_KM` |
| `PUT /admin/pricing/params/:key` | Parámetros de una lista cerrada (`TERRITORY_TOLERANCE_KM`, 0–20) |
| `POST /admin/pricing/test-simulation` | Simulación con el borrador (no se guarda, no llega al público) |
| `GET /admin/publications` | Historial (50 más recientes) |
| `POST /admin/publications` | Publicar (422 si faltan secciones) y disparar el deploy hook |
| `POST /admin/publications/:id/restore` | Vuelve a publicar una versión anterior como publicación nueva |
| `GET /admin/leads?status=&page=` | Consultas (50 por página) |
| `PATCH /admin/leads/:id/status` | `NUEVA`, `CONTACTADA` o `CERRADA` |
| `GET /admin/leads/export.csv?status=` | CSV con BOM y protegido contra inyección de fórmulas (se audita) |
| `GET /admin/audit?page=` | Registro de cambios con antes/después |

Respuestas de `POST /public/leads`: 201 `{ ok: true }`; 400 datos inválidos o sin consentimiento;
403 anti-spam no superado (no se guarda nada); 429 demasiados envíos.

Respuestas de `POST /public/simulations`:

| Código | Cuándo |
|---|---|
| 200 | `{ simulationId, currency, distanceKm, billableKm, travelCostMonthly, lowFee, highFee, annualFee }` |
| 400 | Datos inválidos o campos no permitidos |
| 404 | No hay tarifa publicada para ese tipo y nivel |
| 422 | Ubicación fuera de Uruguay |
| 429 | Demasiadas simulaciones |
| 503 | El cotizador todavía no tiene una publicación con parámetros |

## 4 bis. Web (`apps/web`)

- React 19 + Vite 8 + Tailwind 4. Colores solo desde los tokens de `src/styles.css`
  (especificación de identidad, sección 8).
- **Contenido:** `src/content.ts`, provisorio y tomado del Documento Maestro. Lo que el cliente no
  entregó queda oculto: FAQ, testimonios, datos de contacto y legales, y el sello de seguro de RC.
  Un banner indica "Contenido provisorio" y la página lleva `noindex`.
- **Prerender** ([ADR-011](adr/ADR-011-prerender-vite-ssr.md)): `npm run build -w @ats/web` genera
  `dist/client` con el HTML completo, SEO, CSP y `sitemap.xml`.
- **Carga diferida:** el mapa (Leaflet + OSM) se descarga al acercarse a la sección "Cobertura" y
  Turnstile al interactuar con el formulario.
- **Flujo:** mapa (punto, distancia y viático por visita) → cotizador (tipo, nivel y ubicación →
  baja, alta y anual) → "Congela esta tarifa" → formulario con tipo y simulación precargados.
- **Desarrollo:** `npm run dev -w @ats/web` (escucha solo en 127.0.0.1; nunca exponer el servidor de
  desarrollo de Vite).

### Prueba e2e (navegador real)
Requiere Playwright con Chromium, la API corriendo con datos de prueba y la web servida:
```bash
# 1. Base de prueba con la publicación ficticia (NUNCA en producción)
cd apps/api
npx prisma migrate deploy && npm run db:seed
npx prisma db execute --file test/fixtures/e2e-publication.sql
npm run build && npm start      # con CORS_ORIGINS=http://127.0.0.1:4173 y el resto de variables

# 2. Web
cd apps/web
VITE_API_URL=http://127.0.0.1:3000 VITE_SITE_URL=http://127.0.0.1:4173 \
  VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA npm run build
npm run preview

# 3. Prueba (PLAYWRIGHT_MODULE si Playwright está instalado de forma global)
node e2e/smoke.e2e.mjs
```
La prueba verifica 9 puntos:
1. El HTML viene prerenderizado.
2. El mapa y Turnstile no se cargan al inicio.
3. El mapa estima distancia y viático.
4. El cotizador muestra lo que devuelve la API.
5. Se informa cuando no hay tarifa publicada.
6. La API rechaza un token anti-spam no válido.
7. No hay errores de consola (incluye violaciones de CSP).
8. En móvil no hay desplazamiento horizontal.
9. El menú móvil es accesible.

## 4 ter. Panel de administración (`/admin/`)

Ver [ADR-013](adr/ADR-013-panel-admin.md). Pestañas: **Contenidos**, **Precios y viáticos**,
**Consultas**, **Publicar** y **Registro de cambios**.

- **Flujo de trabajo:**
  1. Editar en borrador.
  2. Probar los precios con la *simulación de prueba*.
  3. **Publicar**. El cotizador cambia al instante y la landing cuando termina el build de Vercel.
- **Restaurar:** vuelve a publicar una versión anterior; el historial nunca se borra.
- **Revocar el acceso de un administrador:** se desactiva, no se borra
  ([ADR-012](adr/ADR-012-administradores-se-desactivan.md)):
  ```sql
  UPDATE admin_profile SET disabled_at = now() WHERE email = 'persona@dominio';
  ```
- **Dar de alta un administrador:**
  1. Crear el usuario en Supabase Auth.
  2. Insertar su fila:
     ```sql
     INSERT INTO admin_profile (id, email, full_name) VALUES ('<id de auth.users>', '<email>', '<nombre>');
     ```
  3. En su primer ingreso, el panel le pide dar de alta el segundo factor con un QR.

### Configuración obligatoria del proyecto Supabase (al crear las cuentas, P-16)
- Auth → MFA: **TOTP habilitado**.
- Auth → **registro público deshabilitado** (*Allow new users to sign up* desactivado). Aunque un
  usuario registrado sin `admin_profile` recibe 403, no tiene por qué poder registrarse.
- Duración de la sesión y del token de acceso: corta (p. ej., 1 h, con renovación). El panel además
  cierra la sesión tras 15 min de inactividad.
- Claves de firma asimétricas (ES256/RS256), para que la API pueda verificar con JWKS.

### Prueba e2e del panel
```bash
cd apps/web
FAKE_AUTH_PORT=54321 node e2e/fake-supabase-auth.mjs &      # Auth simulado (SOLO pruebas)
# API con SUPABASE_URL=http://127.0.0.1:54321 sobre la base e2e (seed + e2e-publication.sql)
VITE_API_URL=http://127.0.0.1:3000 VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY=anon-e2e \
  VITE_SITE_URL=http://127.0.0.1:4173 VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA npm run build
npm run preview &
node e2e/admin.e2e.mjs      # 15 pasos: login, 2FA, contenidos, precios, viáticos, simulación, publicar…
```
El servidor de Auth simulado guarda en memoria el factor verificado: reinícialo para repetir la prueba
desde el alta del segundo factor.

## 5. Motor de cálculo (`packages/pricing`)

Fórmula de la sección 4.3 del plan, validada con los 3 casos de la hoja CARTERA:

```
H       = v · (h_visita + h_traslado) + h_admin + h_coord + h_personal
T       = km_fact · v · c_km
A_baja  = (H · V_hora + T + G_fijos) · (1 + p)
A_alta  = A_baja · k_alta
A_anual = A_baja · (12 − m_alta) + A_alta · m_alta
```

Viático (sección 4.2): `d_ruta = d_lineal(Haversine) · f_ruta`; `km_fact = 2 · max(0, d_ruta − R)`.

| Caso | Baja | Alta | Anual |
|---|---|---|---|
| Casa San Rafael | 1114,32 | 2228,64 | 16157,64 |
| Apto Torre Península | 297,16 | 445,74 | 3937,37 |
| Chacra José Ignacio | 2171,875 → 2171,88 | 3909,375 → 3909,38 | 31275,00 |

Regla clave: **se redondea solo al presentar**. Si se redondea antes, la Chacra da 31275,06
([ADR-002](adr/ADR-002-motor-de-calculo-decimal.md)).

## 6. Publicación (borrador → publicado)

El administrador edita en tablas de borrador (`calc_profile`, `travel_config`, `content_block`…).
Al pulsar **Publicar** se guarda en `publication.snapshot` una copia inmutable. El
cotizador público solo lee la **última publicación**. Formato de la parte de precios
(`src/simulation/pricing-snapshot.ts`):

```json
{
  "pricing": {
    "travel":  { "baseLabel": "…", "baseLat": -34.9, "baseLng": -54.95,
                 "freeRadiusKm": "0", "routeFactor": "1.3", "costPerKm": "0.35", "mode": "POR_KM" },
    "profiles": [{ "propertyTypeCode": "CASA_PREMIUM", "serviceLevel": 3, "visitsPerMonth": "4", "…": "…" }],
    "params":  { "TERRITORY_TOLERANCE_KM": "2" }
  }
}
```
Los decimales van como texto para no perder precisión.

## 7. Base de datos

- 17 tablas del DER de Etapa 1 (`apps/api/prisma/schema.prisma`), con nombres en
  `snake_case` en PostgreSQL.
- Migraciones:
  - `20261103000000_init`: tablas, índices y FK (generada con `prisma migrate diff`).
  - `20261103000100_security`: RLS, REVOKE, `audit_log` inmutable y FK a `auth.users`.
- Seed (`prisma/seed.sql`): solo datos confirmados por el cliente. Ver [pendientes](pendientes.md).

Para crear una migración nueva:
```bash
cd apps/api
npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script \
  > prisma/migrations/<AAAAMMDDhhmmss>_<nombre>/migration.sql
```
**Toda tabla nueva** debe agregarse a la migración de seguridad equivalente (RLS + REVOKE).
La prueba `el rol anon (Data API pública) no puede leer ninguna tabla` falla si se olvida.

## 8. CI (GitHub Actions)

`.github/workflows/ci.yml` corre en cada push: `npm ci --ignore-scripts`, `npm audit`, pruebas del
motor, migraciones contra PostgreSQL 16 efímero, pruebas de la API y build. Ver
[seguridad](seguridad.md#cadena-de-suministro).

## 9. Despliegue (pendiente: cuentas del cliente, P-16)

**Web en Vercel:** proyecto con raíz `apps/web`. `vercel.json` define el comando de build, la carpeta
`dist/client` y las cabeceras (HSTS, `frame-ancestors 'none'`, nosniff, Referrer-Policy y
Permissions-Policy). Variables: `VITE_API_URL`, `VITE_SITE_URL` y `VITE_TURNSTILE_SITE_KEY`.
Que el `buildCommand` (`cd ../.. && npm ci …`) funcione con la raíz en `apps/web` está **a verificar
en el primer despliegue**.


Pasos previstos cuando existan las cuentas:
1. Supabase: crear proyecto (región cercana a Render Virginia), activar MFA TOTP en Auth.
2. Ejecutar `npm run db:migrate` y `npm run db:seed` con `DIRECT_URL` desde un entorno protegido.
3. Render: servicio web Node, plan pago (sin suspensión), región Virginia.
   - Build: `npm ci --ignore-scripts && npm run build -w @ats/pricing && npm run build -w @ats/api`
   - Start: `npm start -w @ats/api`
   - Health check: `/health`
4. Crear el usuario admin en Supabase Auth e insertar su fila en `admin_profile`.
5. Cloudflare Turnstile: crear el widget para el dominio. La clave de sitio va en Vercel y la secreta en
   Render (`TURNSTILE_SECRET_KEY`, `TURNSTILE_ALLOWED_HOSTNAMES`).

## 10. Traspaso al repositorio del cliente

**Situación actual (04/11/2026):** PRIVAT todavía no tiene repositorio propio. Se trabaja en
`aragontechsolutions-dev/ATS-SISGESPROP`. Cuando el cliente lo cree, se traspasa así.

### 10.1 Qué tiene que hacer el cliente
1. Crear un repositorio **vacío**: sin README, sin `.gitignore` y sin licencia. Así se evitan
   conflictos con el historial existente.
2. Dar acceso de escritura al desarrollador (o al usuario de Aragon Tech Solutions).
3. Activar la verificación en dos pasos (2FA) en su cuenta u organización de GitHub.

### 10.2 Traspaso del código (con todo el historial)
```bash
git remote add privat https://github.com/<organizacion-de-privat>/<repositorio>.git
git push privat main
git push privat claude/property-management-uruguay-sg6woy   # y cualquier otra rama en curso
git push privat --tags
```
`git push` lleva los commits y las ramas. **No** lleva pull requests, comentarios, issues ni la
configuración del repositorio: el pull request abierto se vuelve a crear en el repositorio nuevo.

### 10.3 Configuración del repositorio nuevo
- Rama predeterminada `main`, protegida (revisión obligatoria y CI en verde).
- *Secret scanning* y *push protection* activados.
- GitHub Actions habilitado. El workflow `ci.yml` no usa secretos, así que funciona sin cambios.
- Si se va a seguir trabajando con Claude Code, instalar la GitHub App de Claude en el repositorio
  nuevo.

### 10.4 Después del traspaso
- Conectar Vercel (web) y Render (API) al repositorio de PRIVAT, no al de Aragon Tech Solutions.
- Actualizar en el `README.md` la nota de "Repositorio de trabajo".
- Decidir qué hacer con el repositorio de Aragon Tech Solutions (archivarlo o mantenerlo como copia)
  según el acuerdo de propiedad del código (pregunta M-3 de la investigación).

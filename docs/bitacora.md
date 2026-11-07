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

## 2026-11-03/04 – Etapa 1, bloque C (días 5–9 del plan) – Hito 2

**Repositorio**
- Se creó `main` con un commit inicial mínimo y la rama de trabajo se reubicó encima (contenido
  idéntico) para abrir el PR aragontechsolutions-dev/ATS-SISGESPROP#1.

**Hecho**
1. Web `apps/web`: React 19.3.1 + Vite 8.3.5 + Tailwind 4.3.3 con los tokens de la especificación de
   identidad. Secciones: encabezado, hero, servicios, transparencia, cobertura, cotizador, testimonios y
   FAQ (ocultos si están vacíos), contacto y pie de página.
2. Prerender con SSR nativo de Vite (riesgo del día 5 resuelto, [ADR-011](adr/ADR-011-prerender-vite-ssr.md)).
3. Mapa de cobertura con Leaflet + OSM, carga diferida y contorno compartido con la API (movido a
   `@ats/pricing/uruguay.geometry.json`).
4. Cotizador de 3 pasos conectado a la API.
5. API:
   - `GET /public/coverage` y `POST /public/travel-estimate`;
   - `POST /public/leads` con Turnstile, consentimiento y aviso desacoplado
     ([ADR-009](adr/ADR-009-formulario-turnstile-consentimiento.md));
   - `PublicationService` y la función `travelFor` compartidas.
6. Seguridad web: CSP en `<meta>` generada en el build y cabeceras en `vercel.json`.
7. Pruebas:
   - API: 57 (antes 41);
   - motor: 25;
   - e2e en Chromium: 9 pasos, escritorio y móvil.

**Hallazgos durante el desarrollo**
- Los archivos de prueba en paralelo compartían la base: se fijó `--test-concurrency=1`.
- Las pruebas del formulario chocaban con el propio límite de 5/min: se usa una IP distinta por
  petición (`X-Forwarded-For`), lo que de paso prueba la IP real detrás de un proxy.
- Contraste: el foco dorado y el borde #E2DED5 de los campos no cumplían WCAG AA
  ([ADR-010](adr/ADR-010-contraste-wcag-vs-especificacion.md)).
- El encabezado se saturaba en 1366 px: se compactó "Acceso clientes · Pronto" y el menú completo se
  muestra desde 1280 px.
- Tailwind 4 no permite `@apply` de clases propias en `@layer components`: se usa `@utility`.
- La regla `coverage/` del `.gitignore` ignoraba la carpeta de código `apps/api/src/coverage/`: se
  limitó a las carpetas de reportes (`/coverage/`, `apps/*/coverage/`, `packages/*/coverage/`).
- `npm install` en un workspace a veces no guarda las dependencias en la primera ejecución: siempre se
  verifica el `package.json` después de instalar.

**Siguiente:** Bloque D (panel admin: login con 2FA, contenidos, parámetros, viáticos, consultas,
publicar).

## 2026-11-04 – Nombre de la empresa: PRIVAT

- El cliente confirmó el nombre comercial **PRIVAT** (P-1). Siguen pendientes el logo y el dominio.
- Se reemplazó el nombre provisorio en `apps/web/src/content.ts`, la única fuente del nombre: de ahí lo
  toman el encabezado, el pie, el `<title>` y los datos estructurados.
- Sin logo, "PRIVAT" se muestra como texto con espaciado amplio y el favicon sigue siendo genérico.
- Nombre agregado al README y a las descripciones de los paquetes. Los nombres técnicos de los paquetes
  (`@ats/*`) y del repositorio no cambian: no afectan al cliente y cambiarlos obligaría a tocar todas
  las importaciones.
- El cliente todavía no tiene repositorio. Se sigue trabajando en
  `aragontechsolutions-dev/ATS-SISGESPROP` y se documentó el traspaso en la
  [guía técnica, sección 10](guia-tecnica.md#10-traspaso-al-repositorio-del-cliente).
- La prueba e2e ahora verifica que el título y el encabezado muestren PRIVAT.

## 2026-11-04 – Etapa 1, bloque D (días 10–13 del plan) – Hito 3

**Repositorio:** el PR #1 ya estaba fusionado. Se abrió aragontechsolutions-dev/ATS-SISGESPROP#2 con
PRIVAT; los commits del Bloque D se suman a esa misma rama.

**Hecho**
1. **D1 – API del panel:** contenidos con esquema por sección, niveles, FAQ, testimonios, 15 perfiles
   validados con el motor, viáticos, parámetros, simulación de prueba, publicar/historial/restaurar,
   consultas con CSV seguro y auditoría. `quoteFor` es la única implementación del cálculo.
2. **D2 – Panel web `/admin/`:** página aparte con Supabase Auth, 2FA TOTP, `sessionStorage` y cierre
   por inactividad; cinco pestañas.
3. **D3 – Contenido publicado en la landing:** `fetch-content.mjs` + `content.ts` con respaldo;
   el build falla en producción si no hay contenido publicado.
4. **Pruebas:**
   - API: 79 (antes 57);
   - e2e del panel: 15 pasos (Auth simulado según el código fuente de `auth-js`);
   - e2e de la landing: 10 pasos, también con contenido publicado.

**Hallazgos durante el desarrollo**
- **Defecto de diseño:** no se podía revocar ni borrar un administrador con historial (la auditoría
  inmutable lo impedía) → se desactivan con `disabled_at` y las FK pasan a NO ACTION
  ([ADR-012](adr/ADR-012-administradores-se-desactivan.md)).
- **Defecto en una migración:** la migración de seguridad fallaba en la base *shadow* de Prisma
  (`_prisma_migrations` inexistente) → se hizo condicional. Se modificó una migración ya aplicada porque
  todavía no existe ninguna base de producción.
- **Defecto de interfaz:** el mensaje "Publicado." desaparecía al recargar los datos (`useLoad`).
  Lo detectó la prueba e2e.
- **Lógica redundante** en `GET /admin/pricing` (consultas duplicadas) → simplificada.
- **Pruebas:** `fetch().text()` descarta el BOM, así que se verifican los bytes crudos. `audit_log`
  acumula datos entre corridas, así que se miden diferencias.
- **Política de espera de versiones:** `supabase-js` 2.119.0 se publicó el mismo día → se usó 2.118.0.

**Siguiente:**
- D4: imágenes con URL firmada, cuando existan Supabase Storage y las fotos.
- Bloque E: calidad (OWASP ZAP, Lighthouse, accesibilidad, e2e en el CI) y entrega.

## 2026-11-04 – Documentos nuevos del cliente

- Se compararon palabra por palabra los 3 `.docx` recibidos con los PDF originales: **mismo contenido**
  (versiones editables).
- **Nuevos:** "Estudio de gastos y expensas de viviendas" (módulo de gastos, Etapa 2) y "Estructura
  documental de Google Drive". Análisis en
  [analisis-documentos-cliente-2026-11-04.md](analisis-documentos-cliente-2026-11-04.md).
- **Sin impacto en la Etapa 1.** Preguntas nuevas N-1 a N-4 agregadas en los pendientes.

## 2026-11-04 – Etapa 1, bloque E (día 14 del plan): calidad

**Hecho**
- **Lighthouse 13.6:** 100 en las cuatro categorías, en móvil y escritorio, con contenido final.
- **Accesibilidad:** axe-core en 12 estados y pantallas, más teclado: 15/15.
- **OWASP ZAP 2.17:** escaneo activo autenticado. Plan reproducible en `security/`.
- **CI:** *job* `e2e` (landing en Chromium, Firefox y WebKit; panel; accesibilidad).
- **Documentos:** manual del panel para el cliente ([manual-panel.md](manual-panel.md)) e
  [informe de calidad](informe-calidad.md) con el estado de los criterios de aceptación.

**Hallazgos corregidos**
- Contraste de los números dorados de Transparencia (Lighthouse/axe).
- Nombre accesible distinto del texto visible en la grilla de perfiles (WCAG 2.5.3).
- Formulario enviable sin JavaScript por GET, con datos personales en la URL (ZAP).
- `style-src 'unsafe-inline'` innecesario en la CSP (ZAP).
- `vite preview` no aplicaba las cabeceras de Vercel: el entorno de prueba no representaba producción (ZAP).
- Auth simulado con el mismo `kid` al reiniciar → la API rechazaba los tokens (caché del JWKS).

**No posible en este entorno**
- Firefox y WebKit: la descarga está bloqueada por la red de este entorno. **Verificados en GitHub Actions**:
  la landing pasa 11/11 en Chromium, Firefox y WebKit.
- Docker: sin demonio; ZAP se ejecutó con la distribución Java, verificada por SHA-256.
- Día 15 (dominio, SSL y publicación): requiere las cuentas del cliente (P-16).

## 2026-11-06 – Preparación del primer despliegue

**Contexto**
- El cliente aprobó **Resend** como proveedor de email y tiene el dominio **privatgp.com**.
- Entregó accesos a GitHub, Render, Vercel y Supabase.
- Aún faltan el logo y las fotos.

**Hecho**
- **Aviso de consultas por email con Resend** ([ADR-015](adr/ADR-015-aviso-email-resend.md)):
  - el email no incluye datos del visitante;
  - es obligatorio en producción;
  - lleva clave de idempotencia y tiempo máximo de 10 s.
- **Pruebas unitarias:** 3 nuevas (configuración y envío). La suite unitaria pasa completa.
- **`vercel.json`:** `installCommand` y `buildCommand` con `--include=dev`. Con
  `NODE_ENV=production`, npm omitía TypeScript, Vite y Prisma, y el build fallaba.
- **`apps/web/package.json`:** declara `engines` (Node 24), de donde lo toma Vercel.
- **`apps/api/.env.example`:**
  - nuevas variables de Resend;
  - se quitó `?pgbouncer=true`, que el driver `pg` ignora.
- **Guía de primer despliegue:** [despliegue.md](despliegue.md).

**Verificado en un clon limpio**
- Build de Render con `NODE_ENV=production`: OK.
- Arranque en producción sin Resend: la API se niega a iniciar, con un mensaje claro.
- Build de Vercel con los comandos de `vercel.json`, desde `apps/web`: OK.
- Con `REQUIRE_PUBLISHED_CONTENT=true` y la API inaccesible: el build falla, como corresponde.

**Limitación del entorno**
- Este contenedor solo tiene Node 22. Las simulaciones se hicieron desactivando únicamente la
  comprobación `engine-strict`. Render y Vercel usarán Node 24.22.1, y el CI ya corre con esa
  versión.

**Pendiente:** el despliegue real con las cuentas del cliente (requiere Cloudflare, DNS y los
emails de destino).
- Corrección en [despliegue.md](despliegue.md) (paso 1): al clonar solo se crea la rama predeterminada
  del repositorio. Hay que hacer `git checkout main` antes de `git log main`. Se detectó al hacer el
  traspaso desde la laptop.

## 2026-11-06 – Traspaso del código y decisiones del cliente

- **Código subido** a `privatgestor-uy/privat` (privado) desde la laptop, rama `main`, con el
  historial completo.
- **Decisiones del cliente:**
  - DNS en GoDaddy.
  - Sin cuenta de Cloudflare: se crea una solo para Turnstile.
  - Render en plan gratuito por ahora.
  - Destinatarios del aviso: el email del administrador hasta que el cliente defina otros.
- **[despliegue.md](despliegue.md):**
  - tabla de decisiones;
  - notas para GoDaddy;
  - consecuencias del plan gratuito de Render;
  - migraciones con comandos de PowerShell, sin archivo `.env` (la cadena se pide con `Read-Host`);
  - `npm ci` desde la raíz del monorepo.

## 2026-11-07 – Supabase de PRIVAT: claves de firma

- Verificado (captura del panel):
  - la clave de firma en uso es **ECC (P-256)**, compatible con la API (ES256);
  - la HS256 quedó como *Previous*.
- En [despliegue.md](despliegue.md):
  - se usa la clave publicable;
  - tras el despliegue, desactivar las claves legacy y revocar la HS256;
  - se suma una advertencia sobre el plan gratuito de Supabase.
- Supabase quedó en **Oregon (us-west)**, no en Virginia como se había previsto.
- **Decisión:** Render también va en **Oregon**, para que la API y la base estén en la misma región.
  Cada petición hace varias consultas a la base, así que esa latencia es la que más pesa.
- La distancia extra del visitante en Uruguay hasta Oregon se paga una sola vez por petición, y
  la landing se sirve desde la CDN de Vercel.
- Así se evita recrear el proyecto de Supabase.
- Configuración de Auth confirmada por el usuario: registro público desactivado, TOTP habilitado y
  *Site URL* `https://privatgp.com`.
- Migraciones y seed: el usuario indicó que todo lo demás está OK.

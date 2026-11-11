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
- ~~Migraciones y seed: el usuario indicó que todo lo demás está OK.~~ **Corrección (07/11/2026):** las migraciones **no** se habían ejecutado: el esquema `public` estaba vacío. Se dio por hecho sin pedir la consulta de comprobación. Ver la entrada "Administrador del panel".

## 2026-11-07 – Resend y DNS (GoDaddy)

- **Registros de envío:** DKIM (`resend._domainkey`) y SPF (CNAME `send` y `rsend` hacia
  `*.forge.rmta.net`) **verificados** en Resend.
- **MX:** `privatgp.com` no tiene MX, así que el dominio no recibe correo. La recepción de Resend
  se deja apagada; su MX en `@` no se carga.
- **DMARC:** había **dos** registros `_dmarc`, lo que invalida DMARC. Uno lo había creado GoDaddy
  con `p=quarantine` y el otro se agregó por error con `p=none`.
- **Decisión:** se mantiene el de GoDaddy y se borra el duplicado.
- **A verificar en el primer envío real:** que el aviso no llegue a spam.
- DMARC: confirmado contra el DNS autoritativo de GoDaddy (`ns41.domaincontrol.com`). Queda un solo
  registro (`p=quarantine`).
- Turnstile y API key de Resend creados por el usuario. Las claves no se compartieron en el chat.
- Destinatario de los avisos: `privat.gestor@gmail.com`.

## 2026-11-07 – Primer deploy en Render: *Timed Out*

**Qué pasó**
- El build en Render salió OK: Node 24.22.1, 0 vulnerabilidades, Prisma generado.
- Nest arrancó, pero a los 15 minutos el deploy terminó en *Timed Out*.

**Causa**
- `/health` (el health check de Render) consulta la base y respondía 503.
- El error se descartaba sin registrarse, así que el log no mostraba la causa.

**Corrección**
- `HealthController` registra el código y el mensaje del error de base de datos, **solo al cambiar
  de estado** para no llenar el log.
- Las URLs de conexión se tapan; se verificó que la contraseña no aparece.
- Prueba unitaria nueva.
- Tabla de diagnóstico en [despliegue.md](despliegue.md#51-si-el-deploy-termina-en-timed-out).
- **Causa real:** `DATABASE_URL` se cargó en Render **entre comillas**, y Render guarda el valor
  literal. Al quitarlas, `/health` respondió `ok` en `https://privat-api.onrender.com`.
- **Prevención:**
  - `loadConfig` rechaza cualquier variable obligatoria entre comillas.
  - Exige que `DATABASE_URL` sea una URL `postgresql://` con host.
  - Así la API falla al arrancar con un mensaje claro, en lugar de esperar 15 minutos hasta el
    *Timed Out*.
  - Los mensajes no incluyen el valor.
- Pruebas: 85/85.

## 2026-11-08 – Cuenta de Vercel del cliente

- El cliente había perdido el acceso a su cuenta de Vercel. Se evaluó desplegar en la cuenta del
  desarrollador y se descartó como primera opción: el sitio quedaría dependiendo de una cuenta
  ajena, y el plan Hobby no admite uso comercial.
- Se recuperó el acceso a la cuenta del cliente. Se agregó el checklist de endurecimiento de cuentas
  ([despliegue.md](despliegue.md), sección 0.1): método de acceso, 2FA, códigos de recuperación,
  tokens, miembros, integraciones y protección de las vistas previas.
- **Web desplegada** en Vercel (cuenta del cliente): `privat-web.vercel.app`. Build de 38 s, en
  producción.
- Cabeceras verificadas: HSTS, `X-Frame-Options DENY`, `frame-ancestors 'none'`, nosniff,
  Referrer-Policy, Permissions-Policy y COOP. Se sirve desde el nodo de São Paulo (`gru1`).
- `Access-Control-Allow-Origin: *` viene de Vercel por defecto. Se aceptó y quedó documentado en
  [seguridad.md](seguridad.md).
- No se activó *Speed Insights*: script de terceros, choca con la CSP y requiere declararlo en la
  política de privacidad.
- **Dominios en Vercel:**
  - `privatgp.com` es el dominio de producción;
  - `www.privatgp.com` hace 308 a `privatgp.com`, en línea con `VITE_SITE_URL`, `PANEL_URL` y `CORS_ORIGINS`.
- **DNS en GoDaddy:** se **editaron** los registros existentes en lugar de crear nuevos, para evitar
  duplicados.
  - `A @`: de "Parked" a `216.198.79.1`, la IP nueva que recomienda Vercel.
  - `CNAME www`: de `privatgp.com.` a `44ffce875f2eeba3.vercel-dns-017.com`.
  - Verificado contra `ns41.domaincontrol.com`. Vercel muestra *Valid Configuration*.

## 2026-11-07 – Administrador del panel: faltaban las migraciones

**Qué pasó**
- Al crear el administrador, `INSERT INTO public.admin_profile` falló con
  `42P01 relation "public.admin_profile" does not exist`.
- El *Table Editor* mostró el esquema `public` vacío.

**Causa**
- Las migraciones no se habían corrido.
- No se detectó antes porque `/health` solo hace `SELECT 1`, que funciona sin tablas.

**Lección**
- Confirmar cada paso con su comprobación (`count(*)` de `content_block` = 11 y RLS activa), y no con
  un "OK" general.
- Pendiente evaluar si `/health` debería comprobar también que existe el esquema.

## 2026-11-08 – Migraciones automáticas en el build de Render

**Contexto**
- Desde la laptop, `prisma migrate deploy` fallaba con *"datasource.url property is required"*:
  `DIRECT_URL` no llegaba a la variable de entorno de la terminal. Se probó `Read-Host` y el
  portapapeles, sin éxito.
- El usuario pidió automatizarlo en Render.

**Hecho**
- **Nuevos scripts:**
  - `db:deploy`: `db:migrate` seguido de `db:seed`.
  - `db:check-url`: `scripts/check-direct-url.mjs`, también previo a `db:migrate` y `db:seed`.
- **La comprobación de `DIRECT_URL`:**
  - falla con un mensaje claro si la variable falta, va entre comillas, no es `postgresql://` o
    usa el puerto 6543;
  - nunca imprime el valor.
- **Render:** el Build Command termina con `npm run db:deploy -w @ats/api`, y se agrega la variable
  `DIRECT_URL` (session pooler).

**Verificado con una base vacía**
- Primer deploy:
  - 3 migraciones aplicadas;
  - 11 bloques de contenido;
  - 18 tablas, todas con RLS.
- Segundo deploy: *No pending migrations*; el seed no cambia nada.
- Un bloque editado se conserva después del seed.
- Pruebas de la API: 85/85.

## 2026-11-08 – Ajustes pedidos tras el primer ingreso al panel

**Hecho**
- **Ojo en los campos de contraseña:** botón accesible con `aria-pressed`, `aria-controls` y
  etiqueta "Mostrar/Ocultar …". Solo cambia el `type` del campo.
- **Recuperación de contraseña** ([ADR-016](adr/ADR-016-recuperacion-de-contrasena.md)):
  - código por email, luego 2FA, luego contraseña nueva (mínimo 12 caracteres);
  - al terminar se cierran todas las sesiones;
  - mismo mensaje exista o no el email.
  - Verificado en el código de Supabase Auth: cambiar la contraseña con 2FA activo exige `aal2`.
- **Mapa sobre el menú:** el contenedor del mapa tiene `isolation: isolate`. Leaflet usa z-index de
  400 a 1000 y tapaba el menú fijo (z-40).

**Pruebas**
- Auth simulado: `/recover`, `/verify`, `PUT /user` (con la regla `aal2` de Supabase) y un endpoint
  solo de pruebas que restaura la contraseña para `a11y.e2e`.
- e2e:
  - nuevas: ojo, recuperación completa y menú por encima del mapa;
  - la prueba del mapa se validó también quitando la corrección: detecta el error;
  - corrección de la prueba: la página usa `scroll-behavior: smooth`, así que el scroll de la
    prueba es instantáneo.
- Resultado en limpio: landing 12/12, panel 19/19 y accesibilidad 17/17, con axe en las pantallas
  nuevas.

**Pendiente en Supabase para que funcione en producción**
- SMTP con Resend, plantilla *Reset Password* con `{{ .Token }}`, vencimiento del código y largo
  mínimo de contraseña. Ver [despliegue.md](despliegue.md), paso 2.

## 2026-11-08 – Plantillas de email con la identidad visual

**Inventario**
- El sistema usa **dos** correos:
  - el aviso de consulta nueva (API → Resend);
  - el código de recuperación de contraseña (Supabase Auth).
- Las demás plantillas de Supabase no se usan; el motivo de cada una está en
  [emails.md](emails.md).

**Hecho**
- `apps/api/src/leads/lead-email.ts`: el diseño del aviso, separado de `resend-notifier.ts`.
  - Cabecera verde con "PRIVAT", línea dorada y botón "Ver la consulta en el panel".
  - Versión de texto plano.
  - Valores escapados.
- `supabase/templates/reset-password.html`: mismo diseño, con el código en un recuadro destacado.
- Al escribir la plantilla de Supabase se detectó un riesgo: tenía un comentario con
  `{{ .ConfirmationURL }}`, y el motor de Go lo habría procesado. Se quitó, y una prueba exige que
  solo exista `{{ .Token }}`.

**Verificado**
- 3 pruebas nuevas; API 88/88.
- Vista previa en escritorio y móvil (390 px), sin scroll horizontal.

## 2026-11-08 – Vercel Hobby bloquea los despliegues

**Qué pasó**
- Los merges de los PR #5 y #6 llegaron a `privatgestor-uy/privat`, pero en Vercel quedaron
  **Blocked**. El mensaje: *"the commit author doesn't have permission to create deployments… Hobby
  teams do not support collaboration"*.
- La producción sigue en `c493fba` (PR #4): la web todavía no tiene el ojo de la contraseña, la
  recuperación ni la corrección del mapa.
- La API en Render sí se actualizó.

**Causa**
- El autor de los commits (`aragontechsolutions-dev`) no es miembro del equipo de Vercel, y en
  Hobby no se pueden agregar miembros.
- El primer deploy funcionó porque lo inició el dueño de la cuenta al importar el proyecto.

**Opciones**
- **Pro + agregar al desarrollador (recomendada):** además es el plan que corresponde a uso
  comercial.
- **Deploy hook:** pendiente de probar si Hobby lo permite.
- **CLI de Vercel con la sesión del dueño.**
- Se descarta hacer commits con la identidad del cliente.
- **Prueba del deploy hook (08/11/2026):** Vercel lo aceptó (`state=PENDING`), pero el despliegue
  quedó **Blocked**. Hobby bloquea por el autor del último commit de `main`, también cuando el
  despliegue viene de un hook.
- **Consecuencia:** en Hobby, el botón "Publicar" del panel tampoco actualiza la web.
- **Recomendación al cliente:** Pro y agregar al desarrollador como miembro. Alternativa sin
  verificar: que los merges los haga la cuenta de GitHub del cliente.
- La URL del hook se guarda igual en Render (`VERCEL_DEPLOY_HOOK_URL`).

## 2026-11-08 – Decisión: web temporalmente en la cuenta de Vercel del desarrollador

- **Decisión del cliente:** alojar la web en la cuenta del desarrollador hasta poder pagar Pro.
- **Por qué funciona:** el proyecto se conecta al repositorio del desarrollador, cuyos merges hace
  él mismo. Así se evita el bloqueo de Hobby por autor del commit, y el deploy hook (el botón
  "Publicar") debería funcionar. Se verifica en el paso 2 de la migración.
- **Riesgos comunicados:**
  - Hobby no admite uso comercial, según los términos de Vercel que conocemos; se recomendó
    dejarlo por escrito con el cliente;
  - el sitio depende de la cuenta del desarrollador;
  - hay dos repositorios que mantener iguales (`git pushall`).
- Plan de migración en [despliegue.md](despliegue.md), sección 6.1.

## 2026-11-08 – Logo de PRIVAT en la web y el panel

**Contexto**
- El cliente entregó `logo_Privat_05112026.pdf`, que es vectorial.
- La web pasó a la cuenta de Vercel del desarrollador (decisión del cliente, informado de lo que
  implica).

**Hecho**
- Se extrajeron del PDF el logotipo (en blanco y en verde) y el círculo verde oficial, sin
  redibujar nada ([marca.md](marca.md)).
- **Landing:** logotipo blanco en el menú y en el pie.
- **Panel:** logotipo verde en el login y blanco en el encabezado.
- **Favicon:** el círculo oficial.
- **`apple-touch-icon.png`:** nuevo, de 180 px.
- Componente `Logo` con `<img>` estático: sin cambios en la CSP y sin peso extra en el JavaScript.

**Verificado (e2e en limpio)**
- Landing 12/12, panel 19/19 y accesibilidad 17/17.
- Capturas en escritorio y móvil.

**Pendiente con el cliente:** tipografía, logo en los emails, imagen para redes y uso de la versión
dorada.

## 2026-11-10 – El cotizador fallaba en producción: API dormida (Render gratuito)

**Síntoma**
- En `privatgp.com`, el cotizador mostró *"No pudimos completar la consulta"*.
- El log de la API solo tenía un arranque, sin errores.

**Diagnóstico**
- Se creó un entorno de desarrollo con acceso a `api.privatgp.com` y `privatgp.com`.
- La API no respondió durante ~6 minutos de intentos, mientras la web respondía en 0,3 s.
- En el navegador, `/health` mostró la página de Render *"SERVICE WAKING UP"*.
- Render avisa: *"Your free instance will spin down with inactivity… 50 seconds or more"*.
- **Causa:** la web cortaba a los 15 s, y la página de espera llega sin CORS.

**Corrección** ([ADR-017](adr/ADR-017-api-dormida-render.md))
- `ensureApiAwake()` espera hasta 90 s, con aviso visible.
- La API se despierta de forma anticipada (al llegar al mapa o al usar el cotizador o el formulario).
- El panel usa la misma espera.
- Hay un mensaje propio para un fallo de red real.
- Postgres tiene un tiempo máximo de conexión de 10 s.

**Pruebas**
- Prueba e2e nueva que simula la API dormida.
- Suite completa en verde: landing 13/13, panel 19/19, accesibilidad 17/17, API 88/88.

**Recomendación:** plan pago de Render, para que ningún visitante tenga que esperar.

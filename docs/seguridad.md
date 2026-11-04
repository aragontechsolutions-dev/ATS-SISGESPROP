# Seguridad

Regla base: **el navegador nunca accede a la base de datos**. Todo pasa por la API.
Cada control lleva su verificación automática (archivo de prueba entre paréntesis).

## 1. Controles implementados (bloques A, B y C)

| Funcionalidad | Riesgo | Control | Verificación |
|---|---|---|---|
| Base de datos | Exposición pública por la Data API de Supabase (caso UpGuard, 16.326 bases, 09/2026) | RLS activa en las 18 tablas (incluida `_prisma_migrations`) sin políticas, más `REVOKE ALL` a `anon`/`authenticated` en tablas, secuencias, funciones y privilegios por defecto | `integration.test.ts` › *el rol anon no puede leer ninguna tabla* |
| Registro de cambios | Borrado o alteración de rastros | Trigger que rechaza UPDATE, DELETE y TRUNCATE en `audit_log` (también en cascada) | *audit_log rechaza UPDATE y DELETE* |
| Cotizador público | Robo de la estructura de precios | Cálculo en el servidor; la respuesta solo trae totales, distancia y viático; valor hora, prima y perfil nunca salen | *nunca expone valor hora, prima ni el perfil* |
| Cotizador público | Abuso / scraping | 10 simulaciones por minuto por IP (global: 60/min) | *429 al superar 10 simulaciones por minuto* |
| Cotizador público | Precio erróneo publicado al instante | Calcula solo con la última **publicación**, nunca con el borrador | *calcula con la publicación vigente* |
| Mapa | Coordenadas manipuladas | El servidor valida rango y recalcula todo; rechaza puntos fuera de Uruguay | *422 fuera de Uruguay*, `unit.test.ts` (contorno real) |
| Entradas | Inyección / campos inesperados | DTO con `class-validator`, `whitelist` + `forbidNonWhitelisted`, código de tipo con patrón `^[A-Z0-9_]{2,40}$`, Prisma parametrizado (sin `$queryRawUnsafe` en la app) | *400 ante campos extra o valores inválidos* |
| Entradas | Cuerpos enormes | Límite JSON 20 KB | *413 si el cuerpo supera 20 KB* |
| Panel admin | Token falsificado | JWT verificado con JWKS de Supabase: firma, `iss`, `aud=authenticated`, `exp`; algoritmos solo ES256/RS256 (se rechaza HS256/`none`) | *401 con token firmado por otra clave / HS256 / vencido / emisor o audiencia incorrectos* |
| Panel admin | Robo de contraseña | Segundo factor obligatorio: claim `aal` = `aal2` | *403 sin segundo factor* |
| Panel admin | Escalada de privilegios | Rol leído de `admin_profile` en la base, nunca del token ni de `user_metadata`; deny-by-default (solo `@Public()` abre rutas) | *403 si el usuario no tiene perfil* |
| Comunicación web ↔ API | Llamadas desde sitios no autorizados | CORS con lista exacta, sin `*`, sin cookies; `https` obligatorio en producción | *CORS: solo el origen permitido*, `unit.test.ts` › loadConfig |
| Cabeceras | XSS, clickjacking, sniffing | `helmet` (CSP, HSTS, nosniff, frame-options…), sin `X-Powered-By` | *GET /health responde ok con cabeceras de seguridad* |
| Datos personales (Ley 18.331) | IP como dato personal | IP guardada como HMAC-SHA256 con secreto del servidor (un SHA-256 simple de IPv4 se revierte por fuerza bruta) | *guarda la simulación… con la IP como HMAC* |
| Configuración | Arranque inseguro | La API no arranca sin variables críticas, con secreto corto o con URLs `http` en producción | `unit.test.ts` › loadConfig |
| Formulario de consultas | Spam y bots | Turnstile verificado en el servidor antes de tocar la base, falla cerrado y con `hostname` validado; 5 envíos/min por IP | `public.test.ts` › *403 y nada guardado si el anti-spam falla*, *429 al superar 5 consultas*; `unit.test.ts` › TurnstileVerifier; e2e |
| Formulario de consultas | Datos personales sin consentimiento (Ley 18.331) | `consent` debe ser exactamente `true`; consulta y consentimiento (versión de la política e IP como HMAC) en una transacción; datos mínimos con longitudes máximas | *guarda la consulta y el consentimiento*, *400 sin consentimiento…* |
| Formulario de consultas | Manipulación de estado / asociación ajena | Campos extra rechazados (p. ej. `status`); la simulación se asocia solo si es reciente (< 24 h) y no está asociada a otra | *400… campos extra*, *adjunta la simulación una sola vez* |
| Aviso de consultas | Fuga de datos por logs | El aviso provisional registra solo el id de la consulta | revisión de código |
| Web (navegador) | XSS / inyección de recursos | CSP en `<meta>`: scripts solo propios + Turnstile, `connect-src` limitado a la API, imágenes solo propias + teselas OSM, `object-src 'none'`; JSON-LD con `<` escapado; React escapa todo el texto (no se usa HTML crudo) | e2e › *sin errores de consola (incluye violaciones CSP)* |
| Web (navegador) | Clickjacking, sniffing, permisos | `vercel.json`: `frame-ancestors 'none'`, `X-Frame-Options DENY`, HSTS, nosniff, Referrer-Policy y Permissions-Policy (sin cámara, micrófono, geolocalización ni pagos) | revisión al desplegar |
| Web (navegador) | Secretos en el frontend | Solo variables `VITE_*` públicas; la clave secreta de Turnstile vive solo en la API | revisión de código |
| Contenido | Publicar textos no aprobados | Banner "Contenido provisorio" y `noindex, nofollow` mientras el contenido sea provisorio; sello de RC oculto sin póliza (P-15) | e2e › *banner…* |
| Errores | Fuga de información | Mensajes genéricos en autenticación; `/health` no expone versión ni entorno; mensajes de validación desactivados en producción | revisión de código |

## 2. "Octubre Negro" (octubre 2026): estado en este repositorio

| Vulnerabilidad | Estado |
|---|---|
| Node.js CVE-2026-111497 y otras 9 (21/10) | `.node-version` = 24.22.1 y `engines` ≥ 24.22.1 con `engine-strict` |
| multer CVE-2026-113872 | multer 2.5.0 (vía NestJS 12.3.2), forzado con `overrides`. Además, la API no recibe archivos: las imágenes irán directo a Storage con URL firmada (Bloque D) |
| Vite (dev server) | Vite 8.3.5. El servidor de desarrollo y el de vista previa escuchan solo en `127.0.0.1` (`vite.config.ts`); en producción solo se publican archivos estáticos compilados |
| React Server Components CVE-2026-23870 | No aplica: `npm ls react-server-dom-webpack` está vacío |
| GhostAction / npm comprometidos | Ver sección 3 |
| Cambio de GRANT de Supabase (30/10) | Cubierto: permisos explícitos (REVOKE) en la migración de seguridad |

## 3. Cadena de suministro

- `.npmrc`: `ignore-scripts=true`, `save-exact=true`, `engine-strict=true`.
- CI: `npm ci --ignore-scripts` + `npm audit --audit-level=high` (falla con severidad alta).
- Política de espera: no se adoptan versiones publicadas hace menos de 3–7 días. Por eso se usan
  `@vitejs/plugin-react` 6.1.2 (y no 6.2.x, del 02/11) y Tailwind 4.3.3 (y no 4.3.4, del 02/11).
- Acciones de GitHub **fijadas por SHA de commit**: `actions/checkout` v7.0.1
  (`3d3c42e5…`) y `actions/setup-node` v7.1.0 (`949feb24…`), verificados con `git ls-remote`.
- `permissions: contents: read` y `persist-credentials: false` en el workflow.
- El CI no usa secretos (base de datos efímera).

**Pendiente de configurar en GitHub** (requiere permisos de administrador del repositorio):
- Protección de la rama `main` (revisión obligatoria y CI en verde).
- *Secret scanning* y *push protection*.
- 2FA obligatoria en la organización.
- Revisión periódica de `.github/workflows` en busca de archivos desconocidos
  (`security-audit.yml`, `github_actions_security.yml`, patrones de GhostAction).

## 4. Pendiente para bloques siguientes

- Exportación CSV de consultas (Bloque D): neutralizar celdas que empiecen con `=`, `+`, `-` o `@` (inyección de fórmulas en Excel).
- Prueba e2e en el CI (requiere instalar navegadores en el workflow) y escaneo de accesibilidad automatizado (Bloque E).
- Subida de imágenes: URL firmada de un solo uso, solo JPG/PNG/WebP, tamaño máximo, sin metadatos (Bloque D).
- Cierre de sesión por inactividad en el panel (Bloque D).
- Escaneo OWASP ZAP y Lighthouse (Bloque E).
- Respaldo `pg_dump` cifrado y prueba de restauración (a acordar con el cliente).

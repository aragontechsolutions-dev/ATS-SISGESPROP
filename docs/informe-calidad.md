# Informe de calidad – Etapa 1 (Bloque E, día 14 del plan)

Fecha: 04/11/2026. Mediciones hechas sobre el **build de producción** en un entorno local de prueba:
API compilada, PostgreSQL 16, web prerenderizada servida con las cabeceras de `vercel.json` y Supabase
Auth simulado. **No** es el entorno de producción del cliente, que todavía no existe (P-16).

## 1. Rendimiento y SEO – Lighthouse 13.6.0

Medido con el contenido publicado y `provisional: false` (como quedará en producción):

| Perfil | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP | CLS |
|---|---|---|---|---|---|---|
| Móvil (simulación de red lenta) | **100** | **100** | **100** | **100** | **0,8 s** | 0 |
| Escritorio | **100** | **100** | **100** | **100** | **0,2 s** | 0 |

- **Objetivos del plan:** ≥ 90 en las cuatro categorías; LCP < 2,5 s en móvil y 1,5 s en escritorio. ✅
- **Con contenido provisorio**, el SEO da 66: es el `noindex` puesto a propósito para que Google no
  indexe textos no aprobados. Desaparece al desmarcar "contenido provisorio" en el panel.
- **Corrección hecha:** los números dorados de Transparencia no tenían contraste suficiente
  (2,54:1). Se reemplazaron por una línea dorada ([ADR-010](adr/ADR-010-contraste-wcag-vs-especificacion.md)).
- **Fuera de los criterios del plan:** la categoría nueva de Lighthouse 13 "Agentic Browsing"
  (`llms.txt`).

## 2. Accesibilidad – axe-core 4.14 (WCAG 2.0/2.1/2.2 A y AA) + teclado

`apps/web/e2e/a11y.e2e.mjs`: **15 de 15 verificaciones sin violaciones.**

- **Landing:** estado inicial y con mapa, resultado del cotizador y formulario, en escritorio y en
  móvil; también con el menú móvil abierto.
- **Teclado:** el primer Tab llega a "Saltar al contenido" con foco visible (3 px); el enlace lleva al
  contenido principal; con Tab se llega a los controles del cotizador.
- **Panel:** login, segundo factor y las 5 pestañas.

**Corrección hecha:** los botones de la grilla de perfiles tenían un nombre accesible distinto del texto
visible (WCAG 2.5.3, *Label in Name*).

**Límite:** axe detecta automáticamente solo una parte de los problemas. Falta una revisión con lector de
pantalla (NVDA o VoiceOver).

## 3. Seguridad

### 3.1 OWASP ZAP 2.17.0 (escaneo activo autenticado)

**Paquete verificado:** SHA-256 `efe799aa…ddde5a`, igual al publicado en `zaproxy/zap-admin/ZapVersions.xml`.

**Qué se escaneó:**
- landing y panel con *spider*;
- todas las rutas públicas de la API;
- las rutas del panel con un token de administrador `aal2` (plan en `security/zap-plan.yaml`, ejecutado
  con `security/run-zap.sh`).

**1.ª pasada:** 0 altos, 2 medios, 1 bajo y 5 informativos. Se corrigieron:

| Hallazgo | Causa | Corrección |
|---|---|---|
| Falta anti-clickjacking (medio) y `X-Content-Type-Options` (bajo) | `vite preview` no aplicaba las cabeceras de `vercel.json`, así que el entorno de prueba no representaba producción | `vite.config.ts` lee las cabeceras de `vercel.json` (fuente única) |
| CSP con `style-src 'unsafe-inline'` (medio) | Concesión innecesaria: Leaflet y React aplican estilos por CSSOM | CSP con `style-src 'self'` en la landing y el panel |
| Datos personales en la URL (info) | **Real:** sin JavaScript, el formulario se enviaba por GET con el email en la URL | `method="post"` y botón deshabilitado hasta que la página esté hidratada |

**2.ª pasada:** **0 altos, 0 bajos.** Quedan 5 medios analizados como no aplicables:

| Hallazgo | Análisis |
|---|---|
| 4 alertas de CSP (directiva sin respaldo, comodín, `script-src`/`style-src unsafe-inline`) | ZAP evalúa **solo la cabecera HTTP**, que lleva `frame-ancestors 'none'`. La política completa está en el `<meta>` generado en el build (depende de la URL de la API de cada entorno) y el navegador aplica **ambas**. Verificado: la prueba e2e *"la CSP efectiva bloquea scripts inline y estilos inline inyectados"* inyecta un script y un `style` y comprueba que el navegador los bloquea |
| Falta de tokens anti-CSRF | No aplica: la API no usa cookies (`credentials: 'omit'`), autentica con Bearer y solo acepta JSON |

**Límites del escaneo:** el escaneo activo duró poco (18–24 s), porque la superficie es chica (pocas rutas
y sin parámetros en la URL). Las reglas de inyección, XSS y control de acceso están cubiertas además por
las pruebas automáticas de la API (80).

### 3.2 Dependencias
- `npm audit`: **0 vulnerabilidades** (con y sin dependencias de desarrollo).
- Node 24.22.1; multer 2.5.0; Vite 8.3.5 (el servidor de desarrollo nunca se expone).
- Política de espera: no se usan versiones publicadas hace menos de 3–7 días.

### 3.3 Interruptor de prueba `RATE_LIMIT_DISABLED`
Existe **solo** para escaneos: el límite de peticiones bloquearía al escáner. La API **no arranca** si
está activo con `NODE_ENV=production`, y además se vuelve a comprobar en cada petición (pruebas en
`unit.test.ts`).

## 4. Pruebas automáticas (resumen)

| Conjunto | Resultado |
|---|---|
| Motor de cálculo (`packages/pricing`) | 25/25 |
| API (unitarias, integración, seguridad, panel) | 80/80 |
| e2e landing (Chromium, escritorio y móvil) | 11/11 |
| e2e panel (Chromium, Auth simulado) | 15/15 |
| Accesibilidad (axe + teclado) | 15/15 |

El CI (`.github/workflows/ci.yml`) corre todo esto en cada push. El *job* `e2e` se agregó en este bloque
y se reprodujo localmente con la misma secuencia de pasos.

## 5. Criterios de aceptación de la Etapa 1 (plan, sección 8)

| Criterio | Estado |
|---|---|
| Landing publicada en el dominio del cliente con HTTPS | ⏳ Requiere las cuentas y el dominio del cliente (P-1, P-16) |
| Funciona en móvil, tablet y escritorio (Chrome, Safari, Firefox, Edge) | ⚠️ Probado en **Chromium** (escritorio y móvil emulado). **Safari y Firefox no probados**: los motores WebKit y Firefox no están instalados en este entorno. Pendiente para el CI o una revisión manual |
| Lighthouse móvil ≥ 90 y LCP < 2,5 s (móvil) / 1,5 s (escritorio) | ✅ 100/100/100/100; 0,8 s / 0,2 s |
| El cotizador reproduce al centavo los 3 casos de la planilla | ✅ |
| El mapa calcula distancia y viático en Uruguay y rechaza puntos fuera | ✅ |
| Un cambio en el panel aparece en la web después de "Publicar" | ✅ Verificado en local (cotizador al instante; textos al recompilar). El deploy hook de Vercel está **sin probar** contra Vercel |
| El formulario guarda la consulta, avisa por email y bloquea envíos automatizados | ⚠️ Guarda y bloquea ✅. **Aviso por email pendiente** del proveedor (hoy queda en el log) |
| El panel exige segundo factor y no es accesible sin sesión | ✅ Con Auth simulado. Falta repetirlo contra el Supabase del cliente |
| Un usuario sin sesión no puede leer ninguna tabla (prueba automática) | ✅ |
| El escaneo de seguridad no muestra hallazgos altos | ✅ 0 altos |
| Colores, contraste y foco: identidad visual y WCAG 2.2 AA | ✅ Con la desviación de ADR-010 (borde de campos) **pendiente de aprobación** del cliente |
| Entregados: manual del panel, guía técnica, accesos a nombre del cliente | ✅ [Manual](manual-panel.md) y [guía técnica](guia-tecnica.md). ⏳ Accesos (P-16) |

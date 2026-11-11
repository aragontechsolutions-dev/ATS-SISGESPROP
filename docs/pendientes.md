# Pendientes del cliente y dudas abiertas

Referencias P-x = sección 10 del *Plan de desarrollo – Etapa 1*. ★ = imprescindible antes de empezar.

## Bloquean funcionalidad ya construida

| Ref. | Dato | Efecto mientras falte |
|---|---|---|
| ★ P-2 | Dirección exacta de la base de operaciones | El cotizador responde 503 (sin base no hay viático) |
| ★ P-3 | Regla del viático: ¿USD 0,35/km? ¿radio sin cargo? ¿tramos? Si son tramos: ¿monto por visita o por mes? | Modo por km con valores iniciales del plan (0 km de radio, 0,35 USD/km); modo por tramos bloqueado |
| ★ P-5 | Valores de los 15 perfiles (5 tipos × 3 niveles). **Plantilla para el cliente:** [`plantillas/PRIVAT_15_perfiles_cotizador.xlsx`](plantillas/PRIVAT_15_perfiles_cotizador.xlsx) (11/11/2026) | Sin perfiles, el cotizador responde 404 para esa combinación |
| P-4 | 3 o 4 trayectos reales con km por carretera | El factor de ruta queda en 1,3 (propuesto, sin calibrar) |
| ★ P-16 | Cuentas a nombre del cliente. **Recibidas (06/11/2026):** dominio privatgp.com, GitHub, Render, Vercel, Supabase y Resend. Repositorio `privatgestor-uy/privat` (privado), código subido. DNS en **GoDaddy**. Render en plan **gratuito** por ahora (se recomienda el pago). ~~Cloudflare (Turnstile)~~ creada. ~~Buzón de avisos~~ → `privat.gestor@gmail.com`. **Web en la cuenta de Vercel del desarrollador** de forma temporal, hasta que el cliente pase a Pro ([despliegue.md](despliegue.md), 6.1) | Desplegado en https://privatgp.com |

## Necesarios para los próximos bloques

| Ref. | Dato | Bloque |
|---|---|---|
| ★ P-1 | ~~Nombre comercial~~ → **PRIVAT** (confirmado 04/11/2026). ~~Dominio~~ → **privatgp.com** (06/11/2026). ~~Logo~~ → recibido (08/11/2026) e implementado en la web y el panel ([marca.md](marca.md)) | C (landing) |
| ★ P-13 / P-13b | Textos de la landing; fotos con derecho de uso (1 hero + 3 servicios) | C |
| P-13c | Testimonios reales autorizados (si no hay, la sección se oculta) | C |
| ★ P-14 | Teléfono, WhatsApp, email de consultas, dirección, redes | C |
| P-6, P-7 | ¿El visitante cambia las visitas/mes? ¿Se muestra el desglose? | C |
| P-8 | Meses exactos de temporada alta y cobro del medio mes | C/D |
| P-9 | ¿Solo USD o también pesos? | C |
| P-10, P-11 | Descuento de cartera en el cotizador; ¿publicar extras con rangos? | C |
| P-12 | Botón "Acceso Clientes": ¿oculto o "Próximamente"? | C |
| ★ P-15 | Asesor legal: política de privacidad, inscripción URCDP; póliza de RC (el sello no se publica sin ella) | C (formulario) |
| ★ P-17 | Persona que aprueba vistas previas (48 h) | Todos |
| P-16b | ~~Repositorio GitHub propio de PRIVAT~~ → `privatgestor-uy/privat` (privado, 06/11/2026). El desarrollo sigue en `aragontechsolutions-dev/ATS-SISGESPROP` y se lleva desde la laptop | Traspaso |

## Preguntas nuevas (documentos del 04/11/2026, ver [análisis](analisis-documentos-cliente-2026-11-04.md))

| Ref. | Pregunta | Etapa |
|---|---|---|
| N-1 | ¿PRIVAT administra **alquileres** (inquilinos, contratos de arrendamiento, cobro de alquiler, comisión)? El estudio de gastos los incluye; afecta el alcance y el encuadre de la Ley 19.574 | 2 |
| N-2 | Clasificación de propiedades: ¿se guardan los dos atributos, el tipo tarifario (5 tipos, para cotizar) y el régimen (6 tipos A–F, para gastos)? | 2 |
| N-3 | Documentos de cada propiedad: ¿Supabase Storage dentro de la plataforma o integración con su Google Drive? | 2/3 |
| N-4 | ¿El cliente usa Google Workspace (cuenta de empresa) o una cuenta personal de Google? Afecta la integración y la seguridad | 2/3 |

## Entrega del cliente del 11/11/2026 ([análisis](analisis-documentos-cliente-2026-11-11.md))

- **El cliente no aprueba todavía la web:** pide 4 cambios de prioridad alta (posicionamiento,
  bitácora, niveles y servicios complementarios, promesas financieras).
- **Plan:** la Etapa F1 está **implementada** (ADR-018 y ADR-019). F2 (datos del cliente) y F3 (cotizador v2) siguen pendientes (sección 7 del análisis).
- **Contradicciones a resolver:** C1 a C7 (sección 3).
- **Preguntas al cliente:** 11 (sección 8).
- **Respondidas:** N-1 (alquileres en temporada alta: sí, con anexo propio) y N-3 (Drive es
  interno; la bitácora va en la plataforma).
- **Siguen faltando:**
  - P-2 (base de operaciones);
  - P-5 (15 perfiles; la planilla trae solo 3 ejemplos y rangos "sin fuente oficial");
  - P-14 (contacto y WhatsApp);
  - P-15 (política de privacidad);
  - fotos reales del equipo.

## Decisiones que requieren aprobación del cliente

- **ADR-010:** borde de los campos de formulario en gris cálido (#686B67) en lugar de #E2DED5, para
  cumplir WCAG 2.2 AA (1,34:1 → 5,4:1).
- **Textos de la landing:** son provisorios, tomados del Documento Maestro y adaptados por el desarrollo
  en Transparencia, Cobertura y Contacto. El "límite de gasto" se redactó sin cifra (el documento dice
  "ej. USD 500").
- **Tipografía:** se usa la del sistema (cero descargas). El logo ya llegó: falta que el cliente confirme si quiere unificar la tipografía de la web ([marca.md](marca.md)).
- **Hero:** fondo verde con líneas arquitectónicas en SVG hasta tener la fotografía (P-13b).

## Pendiente técnico del Bloque D

- ~~**D4 – Imágenes**~~ **Hecho (11/11/2026)**, [ADR-020](adr/ADR-020-imagenes-subidas-storage.md):
  pestaña *Imágenes* del panel, validación y limpieza en la API, Supabase Storage público de solo
  lectura. **Falta activarlo en producción:** bucket `privat-media` y `SUPABASE_SECRET_KEY` en
  Render ([despliegue.md](despliegue.md), §7.2). Se diseñó con subida a través de la API (no URL
  firmada desde el navegador) para poder validar y quitar los metadatos en el servidor.
  - Limpieza futura: la columna `media_asset.variant` (y el enum `MediaVariant`) del modelo inicial no
    se usa. Se deja para no hacer una migración de borrado en producción sin necesidad.
- ~~**Panel contra Supabase real**~~: ingreso con 2FA verificado en producción (08/11/2026). Falta probar en real la recuperación de contraseña, después de configurar el SMTP y la plantilla ([emails.md](emails.md)).

## Dudas técnicas abiertas (NO SÉ todavía)

- **Claves de prueba secretas de Cloudflare Turnstile:** no se pudieron verificar (documentación
  bloqueada en el entorno). Las pruebas automáticas simulan el verificador.
- ~~**`buildCommand` de Vercel** con raíz `apps/web`~~: verificado en producción (07/11/2026).
- **Alternativa accesible al mapa:** hoy hay un enlace "Escríbenos". La lista de departamento y
  localidad depende de la fuente de localidades (ver abajo).

- **Saltos de proxy en Render** (`TRUST_PROXY_HOPS`): valor inicial 1. Hay que confirmarlo en el primer
  despliegue revisando que `req.ip` sea la IP del visitante.
- ~~**Herramienta de prerender (SSG) para Vite**~~: resuelto con el SSR nativo de Vite ([ADR-011](adr/ADR-011-prerender-vite-ssr.md)).
- **Fuente oficial de localidades** (tabla `locality`, para elegir "departamento y localidad"): sin
  cargar. Opciones a evaluar: INE / IDE Uruguay.
- **Región "adecuada" para la URCDP** (transferencia internacional de datos): la decide el asesor legal
  antes de cargar datos reales.

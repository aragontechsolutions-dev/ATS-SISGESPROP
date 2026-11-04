# Pendientes del cliente y dudas abiertas

Referencias P-x = sección 10 del *Plan de desarrollo – Etapa 1*. ★ = imprescindible antes de empezar.

## Bloquean funcionalidad ya construida

| Ref. | Dato | Efecto mientras falte |
|---|---|---|
| ★ P-2 | Dirección exacta de la base de operaciones | El cotizador responde 503 (sin base no hay viático) |
| ★ P-3 | Regla del viático: ¿USD 0,35/km? ¿radio sin cargo? ¿tramos? Si son tramos: ¿monto por visita o por mes? | Modo por km con valores iniciales del plan (0 km de radio, 0,35 USD/km); modo por tramos bloqueado |
| ★ P-5 | Valores de los 15 perfiles (5 tipos × 3 niveles) | Sin perfiles, el cotizador responde 404 para esa combinación |
| P-4 | 3 o 4 trayectos reales con km por carretera | El factor de ruta queda en 1,3 (propuesto, sin calibrar) |
| ★ P-16 | Cuentas a nombre del cliente: dominio, Vercel, Render (plan pago), Supabase, Cloudflare | No se puede desplegar ni probar contra Supabase real |

## Necesarios para los próximos bloques

| Ref. | Dato | Bloque |
|---|---|---|
| ★ P-1 | ~~Nombre comercial~~ → **PRIVAT** (confirmado 04/11/2026). Faltan: logo vectorial y dominio | C (landing) |
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
| P-16b | Repositorio GitHub propio de PRIVAT (el cliente lo está creando). Mientras tanto se trabaja en `aragontechsolutions-dev/ATS-SISGESPROP` | Traspaso |

## Decisiones que requieren aprobación del cliente

- **ADR-010:** borde de los campos de formulario en gris cálido (#686B67) en lugar de #E2DED5, para
  cumplir WCAG 2.2 AA (1,34:1 → 5,4:1).
- **Textos de la landing:** son provisorios, tomados del Documento Maestro y adaptados por el desarrollo
  en Transparencia, Cobertura y Contacto. El "límite de gasto" se redactó sin cifra (el documento dice
  "ej. USD 500").
- **Proveedor de email transaccional** para el aviso de consultas: hoy solo se registra en el log.
- **Tipografía:** se usa la del sistema (cero descargas) hasta definir la identidad visual del logo (P-1).
- **Marca sin logo:** "PRIVAT" se muestra como texto con espaciado amplio y el favicon es genérico hasta recibir el logo vectorial.
- **Hero:** fondo verde con líneas arquitectónicas en SVG hasta tener la fotografía (P-13b).

## Pendiente técnico del Bloque D

- **D4 – Imágenes** (hero escritorio/móvil y servicios): subida con URL firmada de Supabase Storage,
  solo JPG/PNG/WebP, tamaño máximo y sin metadatos (tabla `media_asset`, ya creada). Depende de
  Supabase Storage (P-16) y de las fotos (P-13b).
- **Panel contra Supabase real:** probado con un servidor de Auth simulado. Hay que repetir la prueba con
  el proyecto real del cliente.

## Dudas técnicas abiertas (NO SÉ todavía)

- **Claves de prueba secretas de Cloudflare Turnstile:** no se pudieron verificar (documentación
  bloqueada en el entorno). Las pruebas automáticas simulan el verificador.
- **`buildCommand` de Vercel** con raíz `apps/web` en el monorepo: a verificar en el primer despliegue.
- **Alternativa accesible al mapa:** hoy hay un enlace "Escríbenos". La lista de departamento y
  localidad depende de la fuente de localidades (ver abajo).

- **Saltos de proxy en Render** (`TRUST_PROXY_HOPS`): valor inicial 1. Hay que confirmarlo en el primer
  despliegue revisando que `req.ip` sea la IP del visitante.
- **Herramienta de prerender (SSG) para Vite**: no está validada; se prueba el día 5 (riesgo del plan).
- **Fuente oficial de localidades** (tabla `locality`, para elegir "departamento y localidad"): sin
  cargar. Opciones a evaluar: INE / IDE Uruguay.
- **Región "adecuada" para la URCDP** (transferencia internacional de datos): la decide el asesor legal
  antes de cargar datos reales.

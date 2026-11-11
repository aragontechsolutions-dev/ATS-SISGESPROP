# Registro de decisiones de arquitectura (ADR)

Cada decisión técnica relevante se registra con su contexto, la decisión y sus consecuencias.

| ADR | Decisión | Estado |
|---|---|---|
| [ADR-001](ADR-001-monorepo-npm-workspaces.md) | Monorepo con npm workspaces y Node 24.22.1 | Aceptada |
| [ADR-002](ADR-002-motor-de-calculo-decimal.md) | Motor de cálculo aislado, decimal exacto, redondeo al presentar | Aceptada |
| [ADR-003](ADR-003-calculo-en-servidor-con-publicacion.md) | Cotizador en el servidor con la última publicación | Aceptada |
| [ADR-004](ADR-004-autenticacion-jwks-2fa.md) | JWT de Supabase verificado con JWKS, 2FA obligatorio, rol en base | Aceptada |
| [ADR-005](ADR-005-seguridad-base-de-datos.md) | RLS deny-all, REVOKE y auditoría inmutable | Aceptada |
| [ADR-006](ADR-006-contorno-uruguay-tolerancia.md) | Contorno de Uruguay (Natural Earth) con tolerancia de 2 km | Aceptada |
| [ADR-007](ADR-007-versiones-y-pruebas.md) | Prisma 7.10.1, NestJS 12 ESM y pruebas con `node --test` | Aceptada |
| [ADR-008](ADR-008-sin-datos-inventados.md) | Sin datos inventados: lo no confirmado queda bloqueado | Aceptada |
| [ADR-009](ADR-009-formulario-turnstile-consentimiento.md) | Formulario: Turnstile en el servidor, consentimiento y aviso desacoplado | Aceptada |
| [ADR-010](ADR-010-contraste-wcag-vs-especificacion.md) | Contraste WCAG 2.2 AA frente a la especificación visual | Pendiente de aprobación del cliente |
| [ADR-011](ADR-011-prerender-vite-ssr.md) | Prerender de la landing con el SSR nativo de Vite | Aceptada |
| [ADR-012](ADR-012-administradores-se-desactivan.md) | Los administradores se desactivan, no se borran | Aceptada (actualiza ADR-004) |
| [ADR-013](ADR-013-panel-admin.md) | Panel: página aparte, sessionStorage, 2FA, validación en el servidor | Aceptada |
| [ADR-014](ADR-014-contenido-publicado-en-el-build.md) | La landing se genera con el contenido publicado | Aceptada |
| [ADR-015](ADR-015-aviso-email-resend.md) | Aviso de consultas por email con Resend, sin datos personales | Aceptada |
| [ADR-016](ADR-016-recuperacion-de-contrasena.md) | Recuperación de contraseña: código por email + 2FA | Aceptada |
| [ADR-017](ADR-017-api-dormida-render.md) | La web espera a que la API despierte (Render gratuito) | Aceptada |

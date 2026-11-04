# ADR-009 – Formulario de consultas: Turnstile en el servidor, consentimiento y aviso desacoplado

**Contexto.** El formulario de diagnóstico debe bloquear envíos automatizados, cumplir la Ley 18.331 y
avisar al equipo por email. El proveedor de email está "a definir" en el plan.

**Decisión.**
- **Anti-spam.** Cloudflare Turnstile, con el token verificado **siempre en el servidor**
  (`POST /public/leads`) antes de tocar la base. Ante error de red, HTTP o respuesta inválida, la
  verificación falla cerrada (rechaza).
  - Además de `success`, se valida que el `hostname` esté en `TURNSTILE_ALLOWED_HOSTNAMES`
    (obligatorio en producción). Así no sirven tokens emitidos en otros sitios.
  - Endpoint, parámetros (`secret`, `response`, `remoteip`) y campos de respuesta (`success`,
    `error-codes`, `hostname`) se tomaron del plugin **oficial** `@cloudflare/pages-plugin-turnstile`
    1.0.2. La documentación de Cloudflare no se pudo consultar desde el entorno de desarrollo
    (dominio bloqueado).
  - Las opciones del widget (`callback`, `expired-callback`, `error-callback`, `language`) se tomaron
    de `turnstile-types` 1.2.3.
- **Carga del widget.** El script de Turnstile se descarga solo cuando el visitante interactúa con el
  formulario, no en la carga inicial.
- **Consentimiento.** `consent` debe ser exactamente `true`. La consulta (`lead`) y su registro de
  consentimiento (`consent_record`: versión de la política y HMAC de la IP) se guardan en una sola
  transacción.
- **Simulación adjunta.** Se asocia a la consulta solo si existe, tiene menos de 24 h y no está ya
  asociada a otra.
- **Aviso al equipo.** Interfaz `LeadNotifier`. La implementación provisional `LogLeadNotifier`
  registra solo el id de la consulta, sin datos personales. Un fallo del aviso nunca impide guardar la
  consulta.
- **Límites.** 5 envíos por minuto por IP, además de Turnstile.

**Consecuencias.**
- Al elegir el proveedor de email se agrega una implementación de `LeadNotifier` y se cambia el
  `provider`; el resto no cambia.
- Las pruebas automáticas simulan el verificador. Las claves de prueba secretas de Cloudflare
  **NO están verificadas** (solo la clave de sitio `1x00000000000000000000AA`, vista en un README de
  terceros): hay que confirmarlas con las claves reales del cliente (P-16).

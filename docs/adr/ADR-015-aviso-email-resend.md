# ADR-015 – Aviso de consultas por email con Resend, sin datos personales

**Contexto.** Cuando llega una consulta desde la web, el equipo de PRIVAT tiene que enterarse
(ADR-009 dejó el aviso desacoplado detrás de la interfaz `LeadNotifier`). El 06/11/2026 el cliente
aprobó **Resend** como proveedor y el dominio **privatgp.com**.

**Decisión.**
- `ResendLeadNotifier` (`apps/api/src/leads/resend-notifier.ts`) envía el aviso con la API HTTP de
  Resend: `POST https://api.resend.com/emails` con `Authorization: Bearer`. La API se verificó en el
  código del SDK oficial `resend` 6.37.0. No se agrega el SDK como dependencia: basta `fetch`, y así
  hay un paquete menos en la cadena de suministro.
- **El correo no incluye datos del visitante.** No lleva nombre, email, teléfono ni mensaje. Solo
  dice que hay una consulta nueva, con fecha y hora de Uruguay, y enlaza al panel, donde los datos
  se ven con 2FA. Motivo: minimización (Ley 18.331). Los datos personales no pasan por el proveedor
  de email ni quedan copiados en bandejas de correo.
- La cabecera `Idempotency-Key: lead-<id>` evita avisos duplicados si el envío se reintenta.
- El envío tiene un tiempo máximo de 10 s. Un fallo **no** impide guardar la consulta:
  `LeadsService` captura el error y lo registra solo con el id.
- Configuración con `RESEND_API_KEY`, `LEAD_NOTIFY_FROM`, `LEAD_NOTIFY_TO` y `PANEL_URL`:
  - En **producción** las 4 son obligatorias: la API no arranca sin ellas. Así se evita un sitio
    en producción que recibe consultas sin avisar a nadie.
  - Fuera de producción, sin ellas se usa `LogLeadNotifier`, que solo escribe en el log.
  - Las 4 van juntas: si se define una, se exigen las demás.
  - El remitente y los destinatarios (1 a 10) se validan como emails.
  - `PANEL_URL` debe ser `https` en producción.
- La API key se crea con permiso **Sending access** restringido al dominio. No se usa *Full access*.

**Consecuencias.**
- El equipo tiene que entrar al panel para ver la consulta. Es un paso más, a cambio de no
  dispersar datos personales.
- El aviso se envía antes de responder al visitante. Si Resend tarda, la respuesta puede demorar
  hasta 10 s, y la consulta ya quedó guardada.
- Si en el futuro se quiere el contenido en el correo, hace falta una nueva decisión, con
  evaluación de privacidad.

**Verificado.**
- Pruebas unitarias del envío: URL, Bearer, idempotencia, ausencia de datos del visitante y hora
  de Uruguay.
- Prueba de que falla ante un error HTTP.
- Pruebas de la configuración.
- Arranque real en producción sin las variables: la API se niega a iniciar.
- El envío real se prueba en el primer despliegue ([despliegue.md](../despliegue.md), paso 8).

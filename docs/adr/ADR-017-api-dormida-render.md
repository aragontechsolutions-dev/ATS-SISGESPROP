# ADR-017 – La web espera a que la API despierte (plan gratuito de Render)

**Contexto (10/11/2026).** En producción, el cotizador mostró *"No pudimos completar la consulta"*.

**Causa confirmada:**
- Render (plan gratuito) apaga el servicio tras un rato sin tráfico. Su propio aviso: *"can delay
  requests by 50 seconds or more"*.
- Mientras despierta, responde con su página de espera (*"SERVICE WAKING UP"*), sin cabeceras CORS.
  El navegador descarta esa respuesta.
- La web cortaba a los 15 s y mostraba el mensaje genérico. En el log de la API no había errores,
  porque la petición nunca llegaba a la aplicación.
- **Verificado:**
  - desde el entorno de desarrollo, `api.privatgp.com` no respondió en ~6 minutos de intentos,
    mientras `privatgp.com` (Vercel) respondía en 0,3 s;
  - en el navegador, `/health` mostró la página de espera de Render.

**Decisión.**
1. **`apps/web/src/api.ts`, `ensureApiAwake()`:** antes de cada llamada comprueba `GET /health`.
   - Si la API no responde, reintenta cada 3 s, con un máximo de 10 s por intento y 90 s en total.
   - **Una sola espera compartida** por toda la página.
   - Una respuesta correcta reciente (menos de 60 s) evita la comprobación.
2. **Aviso visible** (`ApiWakingNotice`, en zonas `aria-live`) si la espera supera 2,5 s: *"Conectando
   con el servidor… la primera vez puede tardar hasta un minuto"*. Aparece en el mapa, el cotizador
   y el formulario.
3. **Despertar anticipado.** La espera empieza en cuanto el visitante llega al mapa (que pide la
   cobertura) o pone el foco en el cotizador o en el formulario. Así, al pedir el resultado, la API
   suele estar lista.
4. **Panel.** `adminFetch` usa la misma espera.
5. **Mensaje para un fallo de red real** (código 0): *"No pudimos conectar con el servidor. Revisa tu
   conexión e intenta de nuevo en un minuto."*
6. **API:** `connectionTimeoutMillis: 10_000` en el pool de Postgres. Si la base no responde (por
   ejemplo, un proyecto pausado), la petición falla a los 10 s con un error en el log, en lugar de
   quedar colgada.

**Lo que NO resuelve.** El primer visitante después de un rato sin tráfico **espera alrededor de un
minuto**, ahora con aviso y sin error. La solución de fondo es el **plan pago de Render** (sin
apagado). Al contratarlo no hay que cambiar nada del código: la comprobación pasa a tardar
milisegundos.

**Alternativa descartada por ahora.** Un servicio externo que llame a la API cada pocos minutos
para mantenerla despierta. Es un parche, consume las horas gratuitas y **no sabemos** si las
condiciones de Render lo permiten.

**Seguridad.**
- `/health` ya era público, sin límite de peticiones y sin datos internos.
- Las comprobaciones no envían datos del visitante ni credenciales (`credentials: 'omit'`).

**Verificado.**
- e2e *"API dormida (Render gratuito)"*: Playwright simula la página de espera sin CORS durante
  6 s. Se comprueba que aparece el aviso, que la estimación llega sin error y que el aviso
  desaparece.
- Suite completa: landing 13/13, panel 19/19, accesibilidad 17/17. API: 88/88.

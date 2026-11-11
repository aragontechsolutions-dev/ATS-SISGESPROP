# Primer despliegue de PRIVAT (privatgp.com)

Guía paso a paso para dejar el sistema en producción con las cuentas del cliente. Sigue el orden:
cada paso usa datos del anterior.

| Pieza | Servicio | Dirección prevista |
|---|---|---|
| Código | GitHub (repositorio de PRIVAT) | – |
| Base de datos y login del panel | Supabase | `https://<proyecto>.supabase.co` |
| API | Render (región **Oregon**, la misma que Supabase) | `https://api.privatgp.com` |
| Web y panel | Vercel | `https://privatgp.com` y `https://privatgp.com/admin/` |
| Email de avisos | Resend | remitente `avisos@privatgp.com` |
| Anti-spam del formulario | Cloudflare Turnstile | – |

> **Nombres de menú:** los paneles de estos servicios cambian con frecuencia. Los nombres de esta
> guía son orientativos. Los valores (claves, registros DNS, URLs) se copian siempre de la pantalla
> del servicio; nunca se inventan.

## Decisiones del cliente (06/11/2026)

| Tema | Decisión | Efecto en esta guía |
|---|---|---|
| Repositorio | `privatgestor-uy/privat`, **privado**. Código subido el 06/11/2026 | En el plan gratuito de GitHub, los repositorios privados tienen un cupo mensual de minutos de Actions, y la protección de ramas y el *secret scanning* pueden requerir un plan pago. Revisar en *Settings* qué ofrece la cuenta |
| DNS | Dominio comprado en **GoDaddy**. Los registros se cargan en GoDaddy (*Mis productos → Dominio → DNS*) | Ver "Notas para GoDaddy" en el paso 3 |
| Cloudflare | El cliente **no tiene cuenta**. Hay que crearla (gratis) solo para Turnstile | El DNS sigue en GoDaddy: no se mueve a Cloudflare |
| Vercel | El cliente había perdido el acceso; lo recuperó el 08/11/2026 y se endureció la cuenta (0.1). El proyecto va **en la cuenta del cliente**. Plan Hobby: no admite uso comercial, se recomienda Pro | – |
| Vercel Hobby: despliegues **bloqueados** | Desde el 08/11/2026, los push con merges hechos por `aragontechsolutions-dev` quedan *Blocked*: *"the commit author doesn't have permission… Hobby teams do not support collaboration"*. En Hobby no se pueden agregar miembros. Se recomienda **Pro** y agregar al desarrollador; el deploy hook **también queda bloqueado** (probado el 08/11/2026), así que en Hobby el botón "Publicar" no actualiza la web | La web queda en la última versión desplegada hasta resolverlo; la API (Render) no se ve afectada |
| Vercel: decisión temporal (08/11/2026) | Por decisión del cliente, la web se aloja **temporalmente en la cuenta de Vercel del desarrollador**, conectada al repositorio `aragontechsolutions-dev/ATS-SISGESPROP`, hasta pasar a Pro. Riesgo aceptado: Hobby no admite uso comercial. Al pasar a Pro se **transfiere el proyecto** al equipo del cliente. Ver sección 6.1 | Web desde el repositorio del desarrollador y API desde el del cliente: subir siempre a los dos (`git pushall`) |
| Render | **Plan gratuito por ahora.** Se le insiste al cliente para pasar al pago | El servicio se duerme tras un rato sin tráfico y tarda en despertar (ver paso 5) |
| Región | Supabase quedó en **Oregon** | Render también en **Oregon** (API y base juntas) |
| Destinatarios del aviso | `privat.gestor@gmail.com` (confirmado 07/11/2026) | `LEAD_NOTIFY_TO` en Render |

## 0. Reglas de seguridad para todo el proceso

- **Nada de contraseñas compartidas.** Lo correcto es que el cliente invite al desarrollador como
  miembro o colaborador en cada servicio: GitHub (colaborador), Vercel (miembro del equipo),
  Render (miembro del workspace) y Supabase (miembro de la organización). Si ya se recibieron
  contraseñas, al terminar el cliente las cambia.
- **2FA activado** en GitHub, Vercel, Render, Supabase, Resend, Cloudflare y en el registrador del
  dominio.
- **Los secretos se pegan solo en el panel de cada servicio** (variables de entorno de Render o Vercel).
  Nunca van en el repositorio, en un chat, en un email ni en un ticket.
- **Solo hay un archivo `.env` local**, en la laptop, para correr migraciones. Está en `.gitignore`.
  Se borra al terminar el despliegue.

### 0.1 Endurecer cada cuenta del cliente (checklist)

Se aplicó a Vercel el 08/11/2026, después de que el cliente recuperara el acceso. Vale para todos los
servicios.

1. **Método de inicio de sesión:** solo métodos **del cliente** (su email o su GitHub). Desconectar
   los que no se reconozcan o que sean del desarrollador. En Vercel: *Account Settings →
   Authentication*.
2. **Asegurar el email y el GitHub de acceso.** Vercel suele entrar con un código por email o con
   GitHub, y quien los controla controla la cuenta. Para el Gmail del cliente: verificación en dos
   pasos, teléfono y correo de recuperación del cliente, y revisión de dispositivos.
3. **2FA en el servicio** con una app autenticadora en el **teléfono del cliente**, o con passkeys.
   Los **códigos de recuperación** van en el gestor de contraseñas del cliente.
4. **Limpieza de accesos:**
   - borrar tokens de API desconocidos o sin uso;
   - dejar solo miembros del cliente;
   - desinstalar integraciones desconocidas;
   - en GitHub, dar a las apps (Vercel, Render) acceso **solo** al repositorio `privat`.
5. **Al terminar:** cerrar sesión. Si el cliente compartió alguna contraseña, que la cambie.
   Usar un perfil de navegador separado para sus cuentas.
6. **Meta:** que el cliente invite al desarrollador como miembro, en lugar de compartir la cuenta.
   En Vercel eso requiere el plan Pro, que además corresponde a un sitio comercial: el plan Hobby es
   de uso personal y no comercial, según los términos de Vercel que conocemos. Verificarlo en
   Vercel.
7. **Vercel, proyecto `privat-web`:** en *Settings → Deployment Protection*, proteger las vistas
   previas (*Vercel Authentication*). La producción es pública.

Secretos y dónde vive cada uno:

| Secreto | Dónde se guarda |
|---|---|
| Contraseña de la base (`DATABASE_URL`, `DIRECT_URL`) | Render (`DATABASE_URL`); `DIRECT_URL` solo en la laptop durante las migraciones |
| `IP_HASH_SECRET` | Render |
| `TURNSTILE_SECRET_KEY` | Render |
| `RESEND_API_KEY` | Render |
| `VERCEL_DEPLOY_HOOK_URL` | Render |
| Clave `service_role` de Supabase | **En ningún lado.** El sistema no la usa |

## 1. Llevar el código al repositorio de PRIVAT (desde la laptop)

**Requisitos:** Git y Node 24.22.1 (`.node-version`) instalados, más acceso de lectura a
`aragontechsolutions-dev/ATS-SISGESPROP` y de escritura al repositorio de PRIVAT.

1. El cliente crea en su cuenta un repositorio **privado y vacío**: sin README, sin `.gitignore`
   y sin licencia. Después invita al desarrollador con permiso *Write* o *Maintain*.
2. Clonar el repositorio de trabajo:
   ```bash
   git clone https://github.com/aragontechsolutions-dev/ATS-SISGESPROP.git privat
   ```
   ```bash
   cd privat
   ```
3. Crear la rama local `main` y comprobar que tiene todo lo aprobado (último commit y CI en verde
   en GitHub). Al clonar, Git crea en local **solo la rama predeterminada** del repositorio. Si esa
   no es `main` (en el repositorio de trabajo era `claude/property-management-uruguay-sg6woy`),
   `git log main` falla con *"ambiguous argument 'main'"*. `git checkout main` la crea a partir de
   `origin/main`:
   ```bash
   git checkout main
   ```
   ```bash
   git log --oneline -5 main
   ```
4. Agregar el repositorio del cliente como segundo remoto. Se llama `privat`, y `origin` sigue
   apuntando al de Aragon Tech Solutions:
   ```bash
   git remote add privat https://github.com/<cuenta-de-privat>/<repositorio>.git
   ```
5. Subir `main` con todo el historial:
   ```bash
   git push privat main
   ```
   Si hay etiquetas, súbelas también:
   ```bash
   git push privat --tags
   ```
6. Configurar en el repositorio de PRIVAT (Settings):
   - Rama predeterminada `main`, con protección: pull request obligatorio y CI (`test` y `e2e`) en verde.
   - *Secret scanning* y *push protection* activados.
   - Actions habilitado. `ci.yml` no necesita secretos.
7. Comprobar que el CI corre y termina en verde en el repositorio nuevo (pestaña *Actions*).

Git autentica con el navegador (Git Credential Manager), con `gh auth login` o con SSH. **No pegues
un token en la URL del remoto**, porque queda guardado en `.git/config`.

Desde aquí, Vercel y Render se conectan al **repositorio de PRIVAT**.

## 2. Supabase (base de datos y login del panel)

1. Crear el proyecto en la organización del cliente:
   - Región: la API y la base **deben estar en la misma región**, porque cada petición hace varias
     consultas a la base. El proyecto de PRIVAT quedó en **West US (Oregon)** (07/11/2026), así que
     Render va en Oregon.
   - Contraseña de la base: larga y aleatoria, guardada en el gestor de contraseñas del cliente.
2. **Authentication** (configuración):
   - Desactivar el **registro público** (*Allow new users to sign up* en off). El panel solo tiene
     usuarios creados a mano.
   - **MFA TOTP** activado. El panel exige 2FA (`aal2`).
   - *Site URL*: `https://privatgp.com`.
   - **Recuperación de contraseña del panel** ([ADR-016](adr/ADR-016-recuperacion-de-contrasena.md)).
     El panel usa un **código** por email, no un enlace. Sin esta configuración, el email que
     llega no sirve.
     1. **SMTP propio con Resend** (*Authentication → Emails → SMTP Settings*). Según la
        documentación de Supabase que conocemos, el servidor de correo incluido tiene un límite muy
        bajo de envíos y puede enviar solo a miembros del equipo. Datos de Resend:
        - host `smtp.resend.com`, puerto `465`;
        - usuario `resend`;
        - contraseña: una **API key nueva** de Resend con *Sending access* solo a `privatgp.com`
          (por ejemplo `supabase-smtp`; no reutilizar la de Render);
        - remitente `no-responder@privatgp.com`, nombre `PRIVAT`.

        Confirmar los datos de SMTP en la documentación de Resend al configurarlo.
     2. **Plantilla *Reset Password*** (*Authentication → Emails → Templates*), con la identidad de
        PRIVAT:
        - **Asunto:** `Código para recuperar tu contraseña – PRIVAT`
        - **Cuerpo:** el contenido **completo** de
          [`supabase/templates/reset-password.html`](../supabase/templates/reset-password.html).
          Muestra `{{ .Token }}` y no tiene enlaces. Instrucciones en [emails.md](emails.md).
     3. **Vencimiento del código** (*Email OTP Expiration*): `900` segundos (15 minutos).
     4. **Largo mínimo de contraseña** (*Authentication → Providers → Email*, o *Auth → Password
        settings*): `12`, igual que el panel. Si el plan lo permite, activar también la detección
        de contraseñas filtradas.
     5. **Probar:** en `/admin/`, entrar a *¿Olvidaste tu contraseña?* y comprobar que llega el
        código, que pide el 2FA y que cambia la contraseña.
3. **Claves JWT:** confirmar que la clave de firma activa es **asimétrica** (ECC P-256 o RSA), en
   *JWT Keys / Signing Keys*. La API solo acepta ES256 o RS256 y verifica con las claves públicas
   (JWKS). Si el proyecto usa el secreto compartido HS256 (*legacy*), hay que migrar a claves
   asimétricas. Si no, el panel responde 401.
   - **Verificado en el proyecto de PRIVAT (07/11/2026):** la clave en uso (*Current*) es
     **ECC (P-256)**. La HS256 figura como *Previous*.
   - En Vercel usar la **clave publicable** (`sb_publishable_…`), no la `anon` legacy (que es un JWT
     firmado con el secreto HS256).
   - Ni la API ni la web usan las claves legacy `anon` o `service_role`.
4. Anotar estos valores (en *Connect* / *API settings*):
   - `SUPABASE_URL`: `https://<proyecto>.supabase.co`.
   - **Clave publicable** (`anon` o `sb_publishable_…`). Va en Vercel. Es pública por diseño.
   - Cadena del **transaction pooler** (puerto **6543**) → `DATABASE_URL` en Render.
   - Cadena del **session pooler** (puerto **5432**) → `DIRECT_URL`, solo para migraciones. Se
     recomienda el session pooler y no la conexión directa porque esta puede requerir IPv6.
   - No hace falta agregar `?pgbouncer=true`: el driver `pg` lo ignora.
5. Ejecutar las migraciones y los datos iniciales **desde la laptop**, con Node 24.22.1.
   No se crea ningún archivo `.env`: la cadena de conexión se pide en la terminal, vive solo en esa
   sesión y se borra al terminar. Si la contraseña de la base tiene caracteres especiales
   (`@ : / ? # [ ] %`), van codificados en la URL (por ejemplo, `@` → `%40`). Lo más simple es una
   contraseña solo con letras y números, pero larga (32 o más).

   **Windows (PowerShell)**, desde la raíz del repositorio (`C:\dev\privat`):
   ```powershell
   node -v
   ```
   ```powershell
   npm ci --ignore-scripts
   ```
   ```powershell
   $env:DIRECT_URL = Read-Host "Cadena del session pooler (5432)"
   ```
   Lo que se escribe en `Read-Host` no queda en el historial de PowerShell.
   ```powershell
   cd apps\api
   ```
   ```powershell
   npm run db:migrate
   ```
   ```powershell
   npm run db:seed
   ```
   ```powershell
   Remove-Item Env:DIRECT_URL
   ```

   **Linux o macOS (bash)**, desde la raíz del repositorio:
   ```bash
   npm ci --ignore-scripts
   ```
   ```bash
   read -rs -p "Cadena del session pooler (5432): " DIRECT_URL && export DIRECT_URL
   ```
   ```bash
   cd apps/api && npm run db:migrate && npm run db:seed
   ```
   ```bash
   unset DIRECT_URL
   ```
   - `db:migrate` crea las 17 tablas y aplica la seguridad (RLS deny-all y REVOKE a `anon` y
     `authenticated`).
   - `db:seed` es idempotente: carga tipos, niveles, tolerancia territorial y textos provisorios.
6. Comprobar en el *SQL editor* de Supabase:
   ```sql
   SELECT count(*) FROM public.content_block;
   ```
   ```sql
   SELECT relname, relrowsecurity FROM pg_class
   WHERE relnamespace = 'public'::regnamespace AND relkind = 'r';
   ```
   La primera consulta debe devolver 11. La segunda debe mostrar `relrowsecurity = true` en todas
   las tablas.
7. Si en algún momento creaste un `apps/api/.env` en la laptop, bórralo. Está en `.gitignore`,
   pero no debe quedar ahí.

## 3. Resend (email de avisos)

1. Crear la cuenta (o entrar a la del cliente) y agregar el dominio **privatgp.com**.
2. Cargar en el DNS del dominio **exactamente** los registros que muestra Resend: SPF/MX del
   subdominio de envío y DKIM. Esperar a que figure como *Verified*.
   **Notas para GoDaddy** (valen también para los registros de Vercel y Render):
   - En el campo *Nombre/Host*, GoDaddy agrega el dominio solo. Se escribe `send`, no
     `send.privatgp.com`; para el dominio raíz se usa `@`.
   - Antes de cargar los registros de Vercel, borra cualquier registro `A` de `@` que apunte a
     "Parked", así como el *reenvío de dominio* (forwarding), si está activado.
   - Si el dominio ya tiene correo (MX en `@`), **no lo toques**. Resend usa el subdominio de envío.
   - Los cambios pueden tardar desde minutos hasta horas en verse.
3. **DMARC: un solo registro `_dmarc`.** Si hay dos o más, los receptores ignoran DMARC por
   completo (RFC 7489).
   - **Estado en privatgp.com (07/11/2026):** GoDaddy ya había creado uno:
     `v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:…@onsecureserver.net`. Se agregó otro por
     error y se indicó borrarlo.
   - **Se mantiene el de GoDaddy (`p=quarantine`).** Los avisos de Resend pasan porque van firmados
     con DKIM de `privatgp.com` y la alineación es relajada (`adkim=r`). Confirmar en la verificación
     final que el aviso no llegue a spam.
   - **Advertencia a futuro:** si el cliente envía correo desde @privatgp.com con otro servicio
     (por ejemplo Google Workspace), antes hay que configurar el SPF y el DKIM de ese servicio. Si
     no, con `p=quarantine` esos correos van a spam.
   - **Comprobar** desde PowerShell: `Resolve-DnsName -Type TXT _dmarc.privatgp.com` (debe aparecer
     uno solo).
   - **Enable receiving** en Resend: apagado. El dominio no tiene MX (no recibe correo) y no debe
     apuntar a Resend.
4. Crear una **API key** con permiso **Sending access** restringido al dominio privatgp.com. No
   usar *Full access*. Se copia una sola vez y se pega directamente en Render (paso 5).
5. Definir:
   - **Remitente:** `PRIVAT <avisos@privatgp.com>`. Resend envía desde ahí sin que exista un buzón
     con ese nombre. Las respuestas a ese correo no llegarían a nadie, y por eso el aviso no
     invita a responder.
   - **Destinatarios:** de 1 a 10 **buzones reales** que el equipo lea; nunca direcciones
     inventadas. Mientras el cliente no defina otros, se usa el email del administrador del
     panel. Se cambia cuando quieras editando `LEAD_NOTIFY_TO` en Render, sin tocar el código.

**Privacidad:** el aviso **no incluye datos del visitante**. Solo avisa que hay una consulta nueva y
enlaza al panel, donde se ve con 2FA. Así los datos personales no pasan por el proveedor de email
(Ley 18.331, minimización).

## 4. Cloudflare Turnstile (anti-spam)

Requiere una cuenta de Cloudflare. El cliente no tiene una: hay que crearla con un email del
cliente y 2FA activado. Es gratuita y **no** obliga a mover el DNS a Cloudflare: el dominio sigue
en GoDaddy.

1. En *Turnstile*, agregar un widget con los hostnames `privatgp.com` y `www.privatgp.com`, en modo
   *Managed*.
2. Anotar:
   - **Site key** (pública): va a Vercel como `VITE_TURNSTILE_SITE_KEY`.
   - **Secret key**: va a Render como `TURNSTILE_SECRET_KEY`.

## 5. Render (API)

1. *New → Web Service*. Conectar el **repositorio de PRIVAT**, rama `main`.
2. Configuración:
   - Región **Oregon (US West)**, la misma que Supabase. No elegir otra.
   - Runtime **Node**.
   - Plan **pago** (recomendado). El cliente arranca con el **gratuito**. Consecuencias:
     - El servicio se duerme sin tráfico, y la primera visita después de eso tarda en responder.
     - El cotizador y el formulario pueden demorar en esa primera llamada.
     - El build de Vercel reintenta la lectura del contenido durante unos 90 s (6 intentos ×
       15 s, ADR-014), justamente para dar tiempo a que Render despierte.
     - Pasar al plan pago es un cambio de plan en Render; no hay que tocar nada del código.
     - **Verificado en producción (10/11/2026):** el cotizador fallaba con la API dormida. La web ahora espera hasta 90 s y avisa al visitante ([ADR-017](adr/ADR-017-api-dormida-render.md)). El primer visitante tras la inactividad espera alrededor de un minuto: el plan pago lo elimina.
   - *Root directory*: vacío (la raíz del monorepo).
   - *Build command*:
     ```bash
     npm ci --include=dev --ignore-scripts && npm run build -w @ats/pricing && npm run build -w @ats/api && npm run db:deploy -w @ats/api
     ```
     - `--include=dev` es necesario: con `NODE_ENV=production`, npm omite las devDependencies
       (TypeScript, Prisma CLI) y el build falla. Verificado en una simulación limpia.
     - **`db:deploy` (desde el 08/11/2026)** aplica las migraciones pendientes y el seed en cada
       deploy. Necesita `DIRECT_URL` en las variables de Render.
       - Si la base ya está al día, no hace nada.
       - El seed usa `ON CONFLICT DO NOTHING`, así que nunca pisa lo editado en el panel
         (verificado).
       - Si falla, el build falla y **sigue funcionando la versión anterior**.
     - En el plan gratuito de Render no hay *Pre-Deploy Command* (según su documentación, es de
       planes pagos). Por eso las migraciones van en el build. Contrapartida: si la migración
       sale bien pero el deploy falla después, la versión anterior queda corriendo sobre el esquema
       nuevo. Las migraciones deben ser **compatibles hacia atrás** (agregar, no borrar ni
       renombrar en el mismo paso).
     - **Con plan pago:** mover `npm run db:deploy -w @ats/api` al *Pre-Deploy Command* y
       quitarlo del build.
   - *Start command*:
     ```bash
     npm start -w @ats/api
     ```
   - *Health check path*: `/health`.
   - *Auto-deploy*: activado sobre `main`.
3. Variables de entorno. La API **no arranca** si falta alguna obligatoria o es inválida.

   | Variable | Valor |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | Cadena del transaction pooler de Supabase (:6543) |
   | `SUPABASE_URL` | `https://<proyecto>.supabase.co` |
   | `CORS_ORIGINS` | `https://privatgp.com,https://www.privatgp.com` |
   | `IP_HASH_SECRET` | Aleatorio, de 32 caracteres o más (ver abajo) |
   | `TRUST_PROXY_HOPS` | `1` (a verificar con el tráfico real) |
   | `TURNSTILE_SECRET_KEY` | Secret key de Turnstile |
   | `TURNSTILE_ALLOWED_HOSTNAMES` | `privatgp.com,www.privatgp.com` |
   | `RESEND_API_KEY` | API key de Resend |
   | `LEAD_NOTIFY_FROM` | `PRIVAT <avisos@privatgp.com>` |
   | `LEAD_NOTIFY_TO` | `privat.gestor@gmail.com` (más emails, separados por coma) |
   | `NODE_VERSION` | `24.22.1` (fija la versión de Node en Render) |
   | `PANEL_URL` | `https://privatgp.com/admin/` |
   | `DIRECT_URL` | Cadena del **session pooler** de Supabase (:5432). La usan las migraciones del build. Mismo usuario y contraseña que `DATABASE_URL`, así que no agrega exposición |
   | `VERCEL_DEPLOY_HOOK_URL` | Se completa en el paso 6.5 |

   - **Los valores se pegan sin comillas**, ni simples ni dobles. Render los guarda tal cual. Si
     una variable obligatoria va entre comillas, la API no arranca y lo indica en el log.
   - `PORT` no se define: la asigna Render, y la API escucha en `0.0.0.0:$PORT`.

   Para generar `IP_HASH_SECRET` en la laptop:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```
   Pégalo directamente en Render. Una vez en uso, no se cambia: cambiarlo invalida la agrupación
   de IPs ya guardadas.
4. Primer deploy. En el log, comprobar:
   - Que use **Node 24.22.1** (`NODE_VERSION` lo fija explícitamente).
   - Que termine con la API escuchando.
5. Probar:
   ```bash
   curl -sS https://<servicio>.onrender.com/health
   ```
6. **Dominio propio:** en *Settings → Custom Domains*, agregar `api.privatgp.com`. Cargar en el DNS
   el registro que indique Render (CNAME) y esperar el certificado TLS.

### 5.1 Si el deploy termina en *Timed Out*

Render da el deploy por bueno cuando `/health` responde 200. `/health` hace `SELECT 1` en la base:
si la base no responde, devuelve 503 y, a los 15 minutos, Render corta con *Timed Out*, aunque el
log diga *Nest application successfully started*. Casi siempre es `DATABASE_URL`.

Desde el 07/11/2026 la API registra la causa en el log, **una vez** por cada cambio de estado, sin la
URL ni la contraseña. Por ejemplo:
`[Health] Base de datos no disponible (P2010: … Code: 28P01 … password authentication failed …)`.

| Código o texto en el log | Causa probable |
|---|---|
| Cadena entre comillas (`"postgresql://…"`) | Render guarda el valor literal, comillas incluidas. **Caso real del 07/11/2026.** Desde entonces la API no arranca y avisa `DATABASE_URL no debe ir entre comillas` |
| `28P01` / `password authentication failed` | Contraseña incorrecta, o quedó el texto `[YOUR-PASSWORD]` de la plantilla |
| `Tenant or user not found` | Usuario o host del pooler equivocados. El usuario del pooler es `postgres.<id-del-proyecto>` |
| `ENOTFOUND` / `Can't reach database server` | Host mal escrito o conexión directa (IPv6). Usar el *pooler* |
| `ETIMEDOUT` | Puerto o host incorrectos: el transaction pooler usa el puerto **6543** |
| URL inválida | Caracteres especiales de la contraseña sin codificar (`@` → `%40`, `#` → `%23`, etc.) |

Prueba de la cadena desde la laptop, en PowerShell y en la raíz del repositorio:
```powershell
$env:DATABASE_URL = Read-Host "Cadena del transaction pooler (6543)"
```
```powershell
node -e "const {Client}=require('pg'); const c=new Client({connectionString:process.env.DATABASE_URL}); c.connect().then(()=>c.query('select 1')).then(()=>{console.log('CONEXION OK'); return c.end()}).catch(e=>{console.error('ERROR', e.code, e.message); process.exit(1)})"
```
```powershell
Remove-Item Env:DATABASE_URL
```

## 6. Vercel (web y panel)

1. *Add New → Project*. Importar el **repositorio de PRIVAT**.
2. Configuración:
   - *Root Directory*: `apps/web`.
   - Activar *Include files outside the root directory in the Build Step*. El build usa el
     monorepo completo.
   - *Framework preset*: Other. `vercel.json` ya define los comandos de instalación y build, la
     carpeta `dist/client`, las cabeceras de seguridad y las rutas.
   - *Node.js Version*: **24.x**. `apps/web/package.json` lo declara en `engines`; confirmarlo en
     *Settings*.
3. Variables de entorno (*Production*). **Todas son públicas**: terminan dentro del JavaScript.
   Nunca pongas aquí un secreto.

   | Variable | Valor |
   |---|---|
   | `VITE_API_URL` | `https://api.privatgp.com` (sin barra final) |
   | `VITE_SITE_URL` | `https://privatgp.com` (sin barra final) |
   | `VITE_TURNSTILE_SITE_KEY` | Site key de Turnstile |
   | `VITE_SUPABASE_URL` | `https://<proyecto>.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | Clave **publicable** de Supabase (nunca la `service_role`) |
   | `REQUIRE_PUBLISHED_CONTENT` | **No definirla en el primer deploy** (ver paso 7) |

4. Deploy. Como todavía no hay contenido publicado, el build usa los textos provisorios y muestra
   el aviso *"La API no respondió. Se usa el contenido provisorio"* o equivalente. Es lo esperado.
5. **Deploy hook:** en *Settings → Git → Deploy Hooks*, crear uno para la rama `main`. Copiar la URL
   y pegarla en Render como `VERCEL_DEPLOY_HOOK_URL`. Es un secreto: quien la conoce puede disparar
   builds. Render redespliega solo al cambiar la variable.
6. **Dominios:** en *Settings → Domains*, agregar `privatgp.com` y `www.privatgp.com`:
   - `privatgp.com` como dominio principal.
   - `www` redirige a `privatgp.com`.
   - Cargar en el DNS los registros que indique Vercel.

### 6.1 Migración temporal a la cuenta de Vercel del desarrollador (08/11/2026)

1. En la cuenta del desarrollador, crear `privat-web`:
   - importar `aragontechsolutions-dev/ATS-SISGESPROP`;
   - raíz `apps/web`, *Framework* Other;
   - las 5 variables `VITE_*`.
   Comprobar que el deploy termine **Ready** en `.vercel.app`.
2. Crear el deploy hook (`publicar-panel`, rama `main`) y dispararlo. Debe terminar **Ready**.
3. Quitar `privatgp.com` y `www` del proyecto del cliente y agregarlos al nuevo:
   - `privatgp.com` como Production y `www` con 308 a `privatgp.com`;
   - TXT `_vercel` si Vercel lo pide;
   - revisar el **CNAME de `www`**, que puede cambiar de un proyecto a otro.
4. En Render, poner en `VERCEL_DEPLOY_HOOK_URL` el hook nuevo.
5. Comprobar el sitio, `www`, `/admin/` y las cabeceras.
6. En la cuenta del cliente, borrar el hook viejo y el proyecto (o dejarlo sin dominios).
7. La cuenta del desarrollador debe tener 2FA y tokens revisados (0.1).
8. **Alias para mantener los dos repositorios iguales:**
   `git config alias.pushall "!git push origin main && git push privat main"`.
9. **Al pasar a Pro:** transferir el proyecto al equipo del cliente (*Settings → General →
   Transfer*, si Vercel lo ofrece en ese momento), reconectarlo al repositorio `privatgestor-uy/privat`
   y actualizar el hook en Render.

## 7. Administrador y primera publicación

1. En Supabase, *Authentication → Users → Add user*. Crear el usuario con el email del
   administrador, una contraseña fuerte y la confirmación automática.
2. Darle acceso al panel. En el *SQL editor*:
   ```sql
   INSERT INTO public.admin_profile (id, email, full_name)
   SELECT id, email, 'Nombre Apellido' FROM auth.users WHERE email = 'admin@privatgp.com';
   ```
   La fila de `admin_profile` es lo que da acceso: un usuario de Auth sin esa fila no entra al panel.
3. Entrar a `https://privatgp.com/admin/`. El panel pide enrolar el 2FA con una app autenticadora
   (Google Authenticator, 1Password, etc.).
4. En el panel ([manual-panel.md](manual-panel.md)):
   - Cargar la **base de operaciones**: dirección exacta (P-2) y regla de viático (P-3).
   - Cargar los **perfiles de precio** (P-5).
   - Revisar los textos.
   - **Publicar.**
5. Verificar que la publicación disparó el build en Vercel. Si `VERCEL_DEPLOY_HOOK_URL` está
   configurada, ocurre solo.
6. En Vercel, agregar `REQUIRE_PUBLISHED_CONTENT=true` y redesplegar. Desde aquí, un build que no
   pueda leer el contenido publicado **falla** en lugar de publicar textos provisorios
   ([ADR-014](adr/ADR-014-contenido-publicado-en-el-build.md)).

## 8. Verificación final (smoke test)

- [ ] `https://privatgp.com` carga con candado y `https://www.privatgp.com` redirige.
- [ ] `https://api.privatgp.com/health` responde OK.
- [ ] Cabeceras de seguridad presentes: `curl -sI https://privatgp.com` muestra HSTS,
  `X-Frame-Options` o `frame-ancestors`, `X-Content-Type-Options` y `Referrer-Policy`.
- [ ] Mapa de cobertura y cotizador funcionan con la base y los perfiles reales.
- [ ] Formulario de contacto:
  - se envía (Turnstile real);
  - llega el email de aviso a los destinatarios, **sin datos del visitante**;
  - la consulta aparece en el panel.
- [ ] El panel exige 2FA y cierra la sesión por inactividad.
- [ ] Desde la consola del navegador en otro dominio, una llamada a la API es rechazada por CORS.
- [ ] En el log de Render no aparecen datos personales ni claves.
- [ ] Registrar el resultado en [informe-calidad.md](informe-calidad.md) y en la
  [bitácora](bitacora.md).

## 9. Después del despliegue

- El cliente cambia las contraseñas compartidas y revisa los miembros de cada servicio.
- **Supabase, claves legacy:** con el panel ya verificado en producción, desactivar las API keys
  basadas en JWT (`anon` y `service_role` legacy) en *Settings → API Keys*. Después, cuando hayan
  vencido los tokens viejos, revocar la clave HS256 *Previous* en *JWT Keys*. Así deja de existir
  un secreto compartido capaz de firmar tokens válidos para Supabase.
- **Supabase, plan gratuito:**
  - Según la política publicada por Supabase, los proyectos gratuitos pueden pausarse por
    inactividad y no incluyen copias de seguridad diarias.
  - Revisar las condiciones vigentes en su web y proponer al cliente el plan Pro antes de cargar
    datos reales.
- Actualizar la nota "Repositorio de trabajo" del `README.md`.
- Decidir el destino del repositorio de Aragon Tech Solutions: archivar o mantener como copia
  (pregunta M-3).
- Pendientes que siguen abiertos: logo y fotos (D4, P-1, P-13b), textos definitivos,
  `TRUST_PROXY_HOPS` verificado con tráfico real, y prueba del panel contra Supabase real
  ([pendientes.md](pendientes.md)).

## Verificado antes del despliegue (06/11/2026)

- **Build de Render** simulado en un clon limpio con `NODE_ENV=production`: genera
  `apps/api/dist/src/main.js`.
- **La API se niega a arrancar** en producción sin las variables de Resend, con el mensaje
  *"En producción el aviso por email es obligatorio…"*.
- **Build de Vercel** simulado con los comandos de `vercel.json`, desde `apps/web` y con
  `NODE_ENV=production`:
  - genera `dist/client/index.html`, `admin/index.html`, `sitemap.xml` y `robots.txt`;
  - con `REQUIRE_PUBLISHED_CONTENT=true` y la API inaccesible, el build falla, como corresponde.
- **No verificable aquí** (requiere las cuentas reales):
  - DNS y certificados;
  - envío real por Resend;
  - Turnstile real;
  - Supabase real (JWKS, 2FA);
  - el valor correcto de `TRUST_PROXY_HOPS` en Render.

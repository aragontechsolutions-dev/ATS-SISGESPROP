# ADR-016 – Recuperación de contraseña del panel: código por email + segundo factor

**Contexto.** El cliente pidió poder recuperar la contraseña del panel (08/11/2026). El panel
exige 2FA (TOTP) y guarda la sesión en `sessionStorage` (ADR-013). Supabase Auth ofrece la
recuperación con un **enlace** (con tokens en la URL) o con un **código** (`{{ .Token }}` en la
plantilla del email).

**Decisión.**
1. **Código, no enlace.** El panel pide el email (`resetPasswordForEmail`), el usuario escribe el
   código que recibe (`verifyOtp` con `type: 'recovery'`) y se sigue en la misma pestaña.
   - Ningún token viaja en la URL, el historial ni los registros de terceros.
   - Funciona con `detectSessionInUrl: false` y con la sesión en `sessionStorage`. Un enlace abierto
     en otra pestaña no tendría la sesión.
2. **Segundo factor obligatorio antes de cambiar la contraseña.** Con el código del email la sesión
   es `aal1`. El panel pide el código TOTP y solo con `aal2` muestra el formulario de contraseña
   nueva.
   - **Verificado en el código de Supabase Auth** (`internal/api/user.go`): *"AAL2 session is
     required to update email or password when MFA is enabled"*. Es una barrera **del servidor**:
     quien solo controle el email no puede cambiar la contraseña.
3. **Sin enumeración de cuentas.** El mensaje tras pedir el código es el mismo exista o no el email.
   Solo se distingue el exceso de intentos (HTTP 429).
4. **Contraseña nueva:**
   - mínimo 12 caracteres y máximo 72 bytes (límite de bcrypt en Supabase), con confirmación;
   - se rechaza la misma contraseña anterior (`same_password`);
   - Supabase vuelve a validar en el servidor.
5. **Al cambiarla se cierran todas las sesiones** (`signOut` con alcance global) y se vuelve a
   ingresar con la contraseña nueva y el 2FA.
6. **Ojo para mostrar la contraseña:**
   - botón `type="button"` con `aria-pressed`, `aria-controls` y una etiqueta que dice la acción;
   - el estado se anuncia a lectores de pantalla;
   - solo cambia el `type` del campo en el navegador.

**Configuración necesaria en Supabase** ([despliegue.md](../despliegue.md), paso 2):
- plantilla *Reset Password* con `{{ .Token }}` y **sin** `{{ .ConfirmationURL }}`;
- SMTP propio con Resend;
- vencimiento del código;
- largo mínimo de contraseña.

**Consecuencias.**
- **Si se pierde el teléfono con la app autenticadora, el usuario no puede recuperar el acceso
  solo.** Es intencional: lo resuelve el responsable técnico borrando el factor desde Supabase
  (*Authentication → Users*). Así el usuario vuelve a enrolar el 2FA al ingresar.
- **El email de recuperación pasa a ser una pieza de seguridad.** La cuenta de correo del
  administrador debe tener su propio 2FA.

**Verificado.**
- e2e del panel con el Auth simulado, que reproduce la regla `aal2` de Supabase:
  - código incorrecto, y código correcto que pide el 2FA;
  - validaciones de la contraseña nueva;
  - cambio, cierre de sesión y fallo de la contraseña vieja;
  - ingreso con la nueva y el 2FA.
- axe-core en las pantallas nuevas.

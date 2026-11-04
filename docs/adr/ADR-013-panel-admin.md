# ADR-013 – Panel de administración: página aparte, sesión en sessionStorage, 2FA y validación en el servidor

**Contexto.** El plan (4.4) pide acceso con email y contraseña, segundo factor, cierre por inactividad y
módulos para contenidos, parámetros, viáticos, consultas y publicación.

**Decisión.**
- **Página aparte** (`apps/web/admin/index.html`, entrada `src/admin/main.tsx`). La landing no descarga
  el código del panel ni el de Supabase (verificado: 0 referencias). Tiene su propia CSP: API, Supabase
  Auth e `img data:` para el QR. Se marca `noindex` y Vercel le agrega `X-Robots-Tag` y
  `Cache-Control: no-store`.
- **Autenticación.** `@supabase/supabase-js` 2.118.0 solo para Auth. Los datos van siempre por la API.
  - El flujo de segundo factor (alta TOTP con QR, desafío y verificación, nivel `aal`) se implementó
    según el código fuente de `@supabase/auth-js` 2.118.0.
  - La API exige `aal2` en cada petición: la pantalla es comodidad, no la barrera de seguridad.
- **Sesión.** Se guarda en `sessionStorage` (se borra al cerrar la pestaña) y se cierra por inactividad
  a los 15 minutos (`useIdleLogout`). Un 401 de la API cierra la sesión.
- **Formularios.** Se generan a partir de `src/admin/fields.ts`, que refleja el esquema del servidor
  (`content-schema.ts`). La validación autoritativa es la del servidor y sus errores se muestran tal
  cual.
- **Exportación CSV.** Se descarga con `fetch` autenticado y un Blob: el token nunca va en una URL.
- **Prueba e2e del panel.** Usa `e2e/fake-supabase-auth.mjs`, un servidor de Auth simulado **solo para
  pruebas** que reproduce los endpoints leídos en el código fuente y publica un JWKS. La API real
  verifica esos tokens igual que en producción.

**Consecuencias.**
- Contra un Supabase real **no está probado**: requiere las cuentas del cliente (P-16).
- En el proyecto Supabase hay que configurar: MFA TOTP habilitado, **registro público deshabilitado** y
  la duración de sesión (ver guía técnica).

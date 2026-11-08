# Correos del sistema – PRIVAT

Inventario de los correos que envía el sistema, su diseño y cómo mantenerlos. Creado el 08/11/2026.

## 1. Qué correos existen

| Correo | Lo envía | Fuente en el repositorio | Cómo se instala |
|---|---|---|---|
| **Aviso de consulta nueva** (al equipo) | La API, por Resend | `apps/api/src/leads/lead-email.ts` | Automático con cada despliegue de la API |
| **Código para recuperar la contraseña** (al administrador) | Supabase Auth, por el SMTP de Resend | `supabase/templates/reset-password.html` | **Manual:** copiar en Supabase (sección 3) |

**Plantillas de Supabase que no hacen falta** (no se usan, quedan con el texto por defecto):

| Plantilla | Por qué no se usa |
|---|---|
| *Confirm signup* | El registro público está desactivado |
| *Invite user* | Los administradores se crean a mano, con contraseña. La invitación usa un enlace, y el panel no procesa enlaces de sesión (ADR-016) |
| *Magic Link* | El panel no permite ingresar con enlace |
| *Change Email Address* | El panel no permite cambiar el email |
| *Reauthentication* | Solo se usa si se activa *Secure password change*. El cambio de contraseña ya exige 2FA |

Si en el futuro se usa alguna, hay que diseñarla con estas mismas reglas y sumarla a esta tabla.

## 2. Diseño (identidad visual)

- **Colores** (los de la web, `apps/web/src/styles.css`):

  | Color | Uso |
  |---|---|
  | Verde `#183D32` | Cabecera, títulos y botón |
  | Verde oscuro `#123027` | Texto |
  | Dorado `#B7A06A` | **Solo** la línea decorativa bajo la cabecera, por contraste (ADR-010) |
  | Crema `#F5F1E8` | Fondo y recuadros |
  | Gris `#686B67` | Texto secundario |
  | Borde `#E2DED5` | Bordes |

- **Marca:** "PRIVAT" en texto con espaciado amplio, igual que la web, hasta que llegue el logo
  (P-1). Cuando llegue, se puede agregar como imagen **alojada en privatgp.com**, nunca en un
  servicio de terceros.
- **Reglas de email HTML:**
  - tablas y estilos **en línea**, porque muchos clientes de correo ignoran `<style>`;
  - fuentes del sistema;
  - **sin imágenes ni recursos externos**, que además evitan píxeles de rastreo;
  - ancho máximo de 560 px, que se adapta al móvil sin scroll horizontal (verificado a 390 px);
  - `lang="es"`;
  - modo de color claro declarado (`color-scheme: light`);
  - texto de vista previa (*preheader*) oculto.
- **Contenido:**
  - el aviso de consulta **no incluye datos del visitante** (Ley 18.331, ADR-015);
  - los dos correos indican que no se debe responder, porque `privatgp.com` no recibe correo.
- **Seguridad:** el aviso escapa todos los valores que inserta. La plantilla de Supabase no tiene
  enlaces: el código se escribe en el panel.

## 3. Instalar o actualizar la plantilla de Supabase

1. En Supabase, ve a *Authentication → Emails → Templates → Reset Password*.
2. **Asunto:** `Código para recuperar tu contraseña – PRIVAT`.
3. **Cuerpo:** borra el contenido y pega **todo** `supabase/templates/reset-password.html`.
4. Guarda.
5. Prueba con *¿Olvidaste tu contraseña?* en `https://privatgp.com/admin/`. Debe llegar el correo
   con el código, que no tiene que caer en spam.

**Requisitos:**
- **SMTP con Resend** configurado en Supabase ([despliegue.md](despliegue.md), paso 2). Sin él, el
  correo sale del servidor de Supabase, con límites bajos y sin el dominio privatgp.com.
- **Vencimiento del código:** 15 minutos (900 s). El texto del correo lo menciona; si se cambia el
  vencimiento, hay que cambiar también el texto.

> ⚠ **Las plantillas de Supabase se procesan con el motor de plantillas de Go**, que interpreta
> `{{ … }}` incluso dentro de comentarios HTML. La plantilla solo debe contener `{{ .Token }}`.
> Una prueba lo verifica.

## 4. Pruebas

En `apps/api/test/unit.test.ts`, *plantillas de email con la identidad de PRIVAT*:
- **Aviso:** marca, colores, botón al panel, versión de texto plano y ausencia de datos del
  visitante. Sin scripts, imágenes ni recursos externos. Escapa valores maliciosos.
- **Plantilla de Supabase:** solo `{{ .Token }}`, sin `ConfirmationURL` ni enlaces, y con la paleta.

Vista previa: se genera el HTML del aviso con `renderNewLeadEmail()` y se abre en el navegador. Para
la plantilla de Supabase, se abre el archivo reemplazando `{{ .Token }}` por un código de ejemplo.

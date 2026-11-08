# Plantillas de email de Supabase Auth – PRIVAT

Estas plantillas **no se aplican solas**: se copian en el panel de Supabase.

| Archivo | Plantilla en Supabase | Asunto |
|---|---|---|
| `reset-password.html` | *Authentication → Emails → Templates → Reset Password* | `Código para recuperar tu contraseña – PRIVAT` |

- Las plantillas se procesan con el motor de plantillas de Go. **No escribas `{{ … }}` en
  comentarios ni en ningún otro lugar**: solo `{{ .Token }}`, donde va el código.
- No uses `{{ .ConfirmationURL }}`: el panel recupera con código, no con enlace (ADR-016).
- Si cambias el diseño, mantén igual el del aviso de consultas
  (`apps/api/src/leads/lead-email.ts`). Las pruebas (`apps/api/test/unit.test.ts`) verifican la
  paleta y que solo exista `{{ .Token }}`.

Guía completa: [docs/emails.md](../../docs/emails.md).

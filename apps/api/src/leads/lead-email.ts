/**
 * Plantilla del email "consulta nueva" con la identidad visual de PRIVAT (docs/emails.md).
 *
 * Reglas de email HTML: tablas y estilos en línea (muchos clientes de correo ignoran <style>),
 * sin imágenes ni fuentes externas (no hay logo todavía y evita rastreo), ancho máximo 560 px y
 * versión de texto plano. Los valores se escapan aunque vengan de la configuración.
 *
 * Privacidad (Ley 18.331, ADR-015): NO recibe ni muestra datos del visitante.
 */
export const BRAND = {
  primary: '#183D32',
  primaryDark: '#123027',
  accent: '#B7A06A',
  background: '#F5F1E8',
  surface: '#FFFFFF',
  border: '#E2DED5',
  textSecondary: '#686B67',
} as const;

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export interface NewLeadEmail {
  subject: string;
  text: string;
  html: string;
}

/** `when`: fecha y hora ya formateadas en hora de Uruguay. `panelUrl`: URL https validada en la configuración. */
export function renderNewLeadEmail({ when, panelUrl }: { when: string; panelUrl: string }): NewLeadEmail {
  const subject = 'Nueva consulta en la web de PRIVAT';
  const text = [
    'Se recibió una nueva consulta desde la web de PRIVAT.',
    `Fecha: ${when} (hora de Uruguay).`,
    '',
    `Para verla, ingresa al panel (pestaña Consultas): ${panelUrl}`,
    '',
    'Por privacidad, este aviso no incluye los datos del visitante.',
    'Este es un aviso automático: no respondas a este correo.',
  ].join('\n');

  const url = escapeHtml(panelUrl);
  const html = layout({
    preheader: `Consulta recibida el ${when}. Revísala en el panel.`,
    title: 'Nueva consulta en la web',
    body: `
      <p style="margin:0 0 16px;">Se recibió una nueva consulta desde la web de PRIVAT.</p>
      <p style="margin:0 0 24px;color:${BRAND.textSecondary};">Fecha: <strong style="color:${BRAND.primary};">${escapeHtml(when)}</strong> (hora de Uruguay).</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
        <tr>
          <td style="background:${BRAND.primary};border-radius:6px;">
            <a href="${url}" style="display:inline-block;padding:12px 24px;font-family:${FONT};font-size:16px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:6px;">Ver la consulta en el panel</a>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 8px;font-size:14px;color:${BRAND.textSecondary};">La encontrarás en la pestaña <strong style="color:${BRAND.primary};">Consultas</strong>. Si el botón no funciona, copia este enlace:</p>
      <p style="margin:0 0 24px;font-size:14px;word-break:break-all;"><a href="${url}" style="color:${BRAND.primary};">${url}</a></p>
      <p style="margin:0;padding:12px 16px;font-size:13px;color:${BRAND.textSecondary};background:${BRAND.background};border-radius:6px;">Por privacidad, este aviso no incluye los datos del visitante: se ven solo en el panel, con segundo factor.</p>`,
    footer: 'Aviso automático de PRIVAT · privatgp.com. No respondas a este correo.',
  });
  return { subject, text, html };
}

/** Estructura común de los emails de PRIVAT. La plantilla de Supabase (supabase/templates) replica este diseño. */
function layout({ preheader, title, body, footer }: { preheader: string; title: string; body: string; footer: string }): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.background};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${BRAND.background};">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.background};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background:${BRAND.primary};padding:24px 32px;font-family:${FONT};font-size:20px;font-weight:700;letter-spacing:6px;color:#FFFFFF;">PRIVAT</td>
        </tr>
        <tr>
          <td style="height:3px;line-height:3px;font-size:0;background:${BRAND.accent};">&nbsp;</td>
        </tr>
        <tr>
          <td style="padding:32px;font-family:${FONT};font-size:16px;line-height:1.5;color:${BRAND.primaryDark};">
            <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:700;color:${BRAND.primary};">${escapeHtml(title)}</h1>
            ${body}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid ${BRAND.border};font-family:${FONT};font-size:12px;line-height:1.5;color:${BRAND.textSecondary};">${escapeHtml(footer)}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

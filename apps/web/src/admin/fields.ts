/**
 * Descripción de los formularios de contenido. Refleja el esquema del servidor
 * (apps/api/src/admin/content/content-schema.ts); el SERVIDOR es quien valida.
 */
export type FieldMeta =
  | { key: string; label: string; kind: 'text' | 'textarea'; max: number; optional?: boolean; hint?: string }
  | { key: string; label: string; kind: 'url' | 'email'; hint?: string }
  | { key: string; label: string; kind: 'bool' }
  | { key: string; label: string; kind: 'enum'; options: Array<{ value: string; label: string }> }
  | { key: string; label: string; kind: 'list'; max: number; maxItems: number }
  | { key: string; label: string; kind: 'objectList'; maxItems: number; fields: FieldMeta[] };

const t = (key: string, label: string, max: number, hint?: string): FieldMeta => ({ key, label, kind: 'text', max, hint });
const ta = (key: string, label: string, max: number): FieldMeta => ({ key, label, kind: 'textarea', max });
const opt = (key: string, label: string, max: number): FieldMeta => ({ key, label, kind: 'text', max, optional: true });

const ANCHORS = [
  { value: '#servicios', label: 'Servicios' },
  { value: '#transparencia', label: 'Transparencia' },
  { value: '#cobertura', label: 'Cobertura' },
  { value: '#cotizador', label: 'Cotizador' },
  { value: '#contacto', label: 'Contacto' },
  { value: '#preguntas', label: 'Preguntas frecuentes' },
];

export const SECTIONS: Array<{ id: string; title: string; fields: FieldMeta[] }> = [
  {
    id: 'settings',
    title: 'Ajustes generales',
    fields: [
      { key: 'provisional', label: 'Contenido provisorio (muestra el aviso y evita que Google indexe)', kind: 'bool' },
      { key: 'clientAccess', label: 'Botón "Acceso clientes"', kind: 'enum', options: [{ value: 'proximamente', label: 'Mostrar como "Pronto"' }, { value: 'oculto', label: 'Ocultar' }] },
      t('privacyPolicyVersion', 'Versión de la política de privacidad', 40, 'Se guarda con cada consentimiento. Cámbiala al publicar una política nueva.'),
    ],
  },
  { id: 'brand', title: 'Marca', fields: [t('name', 'Nombre comercial', 60)] },
  { id: 'seo', title: 'Buscadores (SEO)', fields: [t('title', 'Título', 70), ta('description', 'Descripción', 170)] },
  { id: 'nav', title: 'Menú', fields: [{ key: 'items', label: 'Enlaces del menú', kind: 'objectList', maxItems: 8, fields: [t('label', 'Texto', 30), { key: 'href', label: 'Sección', kind: 'enum', options: ANCHORS }] }] },
  { id: 'hero', title: 'Portada (hero)', fields: [ta('title', 'Titular', 140), ta('subtitle', 'Subtítulo', 320), t('cta', 'Botón principal', 40), { key: 'badges', label: 'Sellos de confianza', kind: 'list', max: 80, maxItems: 4 }] },
  { id: 'services', title: 'Servicios (encabezado)', fields: [t('eyebrow', 'Antetítulo', 40), ta('title', 'Título', 140), ta('intro', 'Introducción', 320)] },
  { id: 'transparency', title: 'Transparencia', fields: [t('eyebrow', 'Antetítulo', 40), ta('title', 'Título', 140), { key: 'items', label: 'Puntos', kind: 'objectList', maxItems: 6, fields: [t('title', 'Título', 80), ta('text', 'Texto', 400)] }] },
  { id: 'coverage', title: 'Cobertura', fields: [t('eyebrow', 'Antetítulo', 40), ta('title', 'Título', 140), ta('text', 'Texto', 320), ta('viaticoNote', 'Nota del viático', 320)] },
  { id: 'quoter', title: 'Cotizador', fields: [t('eyebrow', 'Antetítulo', 40), ta('title', 'Título', 140), ta('intro', 'Introducción', 320), ta('disclaimer', 'Aviso legal del resultado', 200), t('cta', 'Botón del resultado', 80)] },
  { id: 'contact', title: 'Contacto', fields: [t('eyebrow', 'Antetítulo', 40), ta('title', 'Título', 140), ta('text', 'Texto', 320), opt('phone', 'Teléfono', 30), opt('whatsapp', 'WhatsApp (con código de país)', 30), { key: 'email', label: 'Email de contacto', kind: 'email' }, opt('address', 'Dirección', 160)] },
  { id: 'footer', title: 'Pie de página', fields: [{ key: 'legal', label: 'Datos legales', kind: 'textarea', max: 300, optional: true }, { key: 'privacyPolicyUrl', label: 'URL de la política de privacidad (https)', kind: 'url' }, { key: 'termsUrl', label: 'URL de términos y condiciones (https)', kind: 'url' }] },
];

/** Valor vacío de un campo (para secciones todavía sin contenido). */
export function emptyValue(f: FieldMeta): unknown {
  switch (f.kind) {
    case 'bool':
      return false;
    case 'enum':
      return f.options[0]?.value ?? '';
    case 'list':
    case 'objectList':
      return [];
    case 'url':
    case 'email':
      return null;
    default:
      return f.optional ? null : '';
  }
}

/**
 * Esquema de los bloques de contenido editables desde el panel (tabla content_block).
 * Cada sección acepta SOLO estos campos, con tipo y longitud máxima: no se guarda JSON
 * arbitrario. La forma coincide con SiteContent de la web (apps/web/src/content.ts).
 */

type Field =
  | { kind: 'string'; max: number; min?: number }
  | { kind: 'nullableString'; max: number }
  | { kind: 'url'; nullable: true }
  | { kind: 'email'; nullable: true }
  | { kind: 'boolean' }
  | { kind: 'enum'; values: readonly string[] }
  | { kind: 'stringArray'; maxItems: number; max: number }
  | { kind: 'objectArray'; maxItems: number; fields: Record<string, Field> };

const s = (max: number, min = 1): Field => ({ kind: 'string', max, min });
const ns = (max: number): Field => ({ kind: 'nullableString', max });

/** Anclas válidas del menú (secciones de la landing). */
export const NAV_ANCHORS = [
  '#servicios',
  '#complementarios',
  '#bitacora',
  '#transparencia',
  '#cobertura',
  '#cotizador',
  '#preguntas',
  '#contacto',
] as const;

/**
 * Imágenes incluidas en la web (apps/web/public/img, ver docs/marca.md). El panel elige una clave
 * de esta lista cerrada: nunca una URL libre (sin contenido externo ni cambios de CSP). Son
 * imágenes ilustrativas entregadas por el cliente (al menos una generada con IA): no representan
 * propiedades administradas ni al equipo de PRIVAT.
 */
export const IMAGE_KEYS = [
  'casa-piscina-jardin',
  'casa-colinas',
  'galeria-laguna',
  'living-hogar',
  'cocina-parrillero',
  'casa-hormigon-madera',
  'casa-bosque',
  'penthouse-terraza',
  'casa-piedra-campo',
  'casa-frente-mar',
  'oficina-administracion',
  'inspeccion-cocina',
  'inspeccion-exterior-piedra',
  'inspeccion-exterior-tablet',
  'inspeccion-azotea',
  'inspeccion-tablero',
] as const;
const image: Field = { kind: 'enum', values: ['ninguna', ...IMAGE_KEYS] };

export const CONTENT_SECTIONS = {
  settings: {
    provisional: { kind: 'boolean' },
    clientAccess: { kind: 'enum', values: ['oculto', 'proximamente'] },
    privacyPolicyVersion: { kind: 'string', max: 40, min: 1 },
  },
  brand: { name: s(60) },
  seo: { title: s(70), description: s(170) },
  nav: {
    items: { kind: 'objectArray', maxItems: 8, fields: { label: s(30), href: { kind: 'enum', values: NAV_ANCHORS } } },
  },
  hero: {
    title: s(140),
    subtitle: s(320),
    complement: s(400),
    cta: s(40),
    secondaryCta: s(40),
    slogan: ns(80),
    badges: { kind: 'stringArray', maxItems: 4, max: 80 },
    image,
  },
  services: { eyebrow: s(40), title: s(140), intro: s(320) },
  complementary: {
    eyebrow: s(40),
    title: s(140),
    intro: s(320),
    items: { kind: 'objectArray', maxItems: 8, fields: { title: s(60), text: s(300), image } },
    note: ns(200),
  },
  bitacora: {
    eyebrow: s(40),
    title: s(140),
    text: s(600),
    items: { kind: 'objectArray', maxItems: 6, fields: { title: s(60), text: s(300) } },
    note: ns(240),
    image,
  },
  transparency: {
    eyebrow: s(40),
    title: s(140),
    items: { kind: 'objectArray', maxItems: 6, fields: { title: s(80), text: s(400) } },
  },
  coverage: { eyebrow: s(40), title: s(140), text: s(320), viaticoNote: s(320) },
  quoter: { eyebrow: s(40), title: s(140), intro: s(320), disclaimer: s(200), cta: s(80) },
  faqsection: {
    eyebrow: s(40),
    title: s(140),
    intro: s(320),
    closingTitle: s(80),
    closingText: s(400),
    closingCta: s(40),
  },
  contact: {
    eyebrow: s(40),
    title: s(140),
    text: s(320),
    phone: ns(30),
    whatsapp: ns(30),
    email: { kind: 'email', nullable: true },
    address: ns(160),
  },
  footer: {
    legal: ns(300),
    privacyPolicyUrl: { kind: 'url', nullable: true },
    termsUrl: { kind: 'url', nullable: true },
  },
} as const satisfies Record<string, Record<string, Field>>;

export type ContentSection = keyof typeof CONTENT_SECTIONS;

export function isContentSection(v: string): v is ContentSection {
  return Object.hasOwn(CONTENT_SECTIONS, v);
}

/** Quita caracteres de control (excepto salto de línea y tabulación) y espacios en los extremos. */
function clean(v: string): string {
  // eslint-disable-next-line no-control-regex
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
}

function validateField(path: string, field: Field, value: unknown, errors: string[]): unknown {
  switch (field.kind) {
    case 'string': {
      if (typeof value !== 'string') return void errors.push(`${path}: debe ser texto`);
      const v = clean(value);
      if (v.length < (field.min ?? 1) || v.length > field.max) errors.push(`${path}: entre ${field.min ?? 1} y ${field.max} caracteres`);
      return v;
    }
    case 'nullableString': {
      if (value === null || value === '') return null;
      if (typeof value !== 'string') return void errors.push(`${path}: debe ser texto o vacío`);
      const v = clean(value);
      if (v.length > field.max) errors.push(`${path}: máximo ${field.max} caracteres`);
      return v || null;
    }
    case 'url': {
      if (value === null || value === '') return null;
      if (typeof value !== 'string') return void errors.push(`${path}: debe ser una URL`);
      try {
        const u = new URL(value);
        // Solo https (evita javascript:, data:, http:).
        if (u.protocol !== 'https:') errors.push(`${path}: la URL debe empezar con https://`);
      } catch {
        errors.push(`${path}: URL inválida`);
      }
      return value.trim();
    }
    case 'email': {
      if (value === null || value === '') return null;
      if (typeof value !== 'string' || !/^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}\.[a-z]{2,}$/i.test(value.trim())) {
        return void errors.push(`${path}: email inválido`);
      }
      return value.trim().toLowerCase();
    }
    case 'boolean':
      if (typeof value !== 'boolean') errors.push(`${path}: debe ser verdadero o falso`);
      return value;
    case 'enum':
      if (typeof value !== 'string' || !field.values.includes(value)) errors.push(`${path}: valor no permitido`);
      return value;
    case 'stringArray': {
      if (!Array.isArray(value)) return void errors.push(`${path}: debe ser una lista`);
      if (value.length > field.maxItems) errors.push(`${path}: máximo ${field.maxItems} elementos`);
      return value.map((v, i) => validateField(`${path}[${i}]`, { kind: 'string', max: field.max }, v, errors));
    }
    case 'objectArray': {
      if (!Array.isArray(value)) return void errors.push(`${path}: debe ser una lista`);
      if (value.length > field.maxItems) errors.push(`${path}: máximo ${field.maxItems} elementos`);
      return value.map((v, i) => validateObject(`${path}[${i}]`, field.fields, v, errors));
    }
  }
}

function validateObject(path: string, fields: Record<string, Field>, value: unknown, errors: string[]) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    errors.push(`${path}: debe ser un objeto`);
    return {};
  }
  const input = value as Record<string, unknown>;
  for (const key of Object.keys(input)) if (!Object.hasOwn(fields, key)) errors.push(`${path}.${key}: campo no permitido`);
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(fields)) out[key] = validateField(`${path}.${key}`, field, input[key], errors);
  return out;
}

/** Valida y normaliza el valor de una sección. Devuelve errores legibles para el panel. */
export function validateSection(
  section: ContentSection,
  value: unknown,
): { ok: true; value: Record<string, unknown> } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const out = validateObject(section, CONTENT_SECTIONS[section] as Record<string, Field>, value, errors);
  return errors.length ? { ok: false, errors } : { ok: true, value: out };
}

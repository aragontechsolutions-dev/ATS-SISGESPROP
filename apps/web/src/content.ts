/**
 * Contenido de la landing.
 *
 * Origen (Bloque D3):
 *  1. Contenido PUBLICADO desde el panel: scripts/fetch-content.mjs lo descarga de la API
 *     (GET /public/content) antes del build en src/generated/published-content.json.
 *  2. Si no hay publicación (desarrollo / CI), FALLBACK_CONTENT: contenido provisorio del
 *     "Documento Maestro" con el nombre PRIVAT confirmado. En producción el build exige (1).
 *
 * Regla: lo que el cliente no entregó queda vacío/oculto, nunca inventado:
 *  - FAQ y testimonios: vacíos -> la sección no se muestra (P-13c).
 *  - Datos de contacto y legales: null -> no se muestran (P-14).
 *  - Sello "Seguro de Responsabilidad Civil": oculto hasta tener la póliza (P-15).
 */

export interface PropertyTypeOption {
  code: string;
  name: string;
  segment: 'Apartamento' | 'Casa' | 'Chacra';
}

export interface ServiceLevelContent {
  level: 1 | 2 | 3;
  name: string;
  description: string;
  items: string[];
}

export interface SiteContent {
  provisional: boolean;
  brand: { name: string };
  seo: { title: string; description: string };
  nav: Array<{ label: string; href: string }>;
  clientAccess: 'oculto' | 'proximamente';
  hero: { title: string; subtitle: string; cta: string; badges: string[] };
  services: { eyebrow: string; title: string; intro: string; levels: ServiceLevelContent[] };
  transparency: { eyebrow: string; title: string; items: Array<{ title: string; text: string }> };
  coverage: { eyebrow: string; title: string; text: string; viaticoNote: string };
  quoter: { eyebrow: string; title: string; intro: string; disclaimer: string; cta: string };
  testimonials: Array<{ author: string; text: string }>;
  faq: Array<{ question: string; answer: string }>;
  contact: {
    eyebrow: string;
    title: string;
    text: string;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    address: string | null;
  };
  footer: { legal: string | null; privacyPolicyUrl: string | null; termsUrl: string | null };
  /** Versión de la política de privacidad que se acepta en el formulario (Ley 18.331). */
  privacyPolicyVersion: string;
}

/** Tipos de propiedad (hoja TARIFARIO). Mismos códigos que property_type en la base. */
const BASE_PROPERTY_TYPES: PropertyTypeOption[] = [
  { code: 'APTO_TORRE', name: 'Apartamento en torre', segment: 'Apartamento' },
  { code: 'CASA_150_300', name: 'Casa 150-300 m² con piscina', segment: 'Casa' },
  { code: 'CASA_PREMIUM', name: 'Casa premium 400-700 m²', segment: 'Casa' },
  { code: 'MANSION_CHACRA', name: 'Mansión o chacra con personal', segment: 'Chacra' },
  { code: 'CHACRA_PRODUCTIVA', name: 'Chacra productiva o múltiples padrones', segment: 'Chacra' },
];

const FALLBACK_CONTENT: SiteContent = {
  provisional: true,
  /** Nombre confirmado por el cliente (P-1). Logo y dominio: pendientes. */
  brand: { name: 'PRIVAT' },
  seo: {
    title: 'Property Management técnico en Maldonado, Punta del Este y Rocha',
    description:
      'Administración patrimonial transparente con supervisión de arquitectos: cuentas separadas, fondo rotativo, informes mensuales y mantenimiento preventivo.',
  },
  nav: [
    { label: 'Servicios', href: '#servicios' },
    { label: 'Transparencia', href: '#transparencia' },
    { label: 'Cobertura', href: '#cobertura' },
    { label: 'Cotizador', href: '#cotizador' },
    { label: 'Contacto', href: '#contacto' },
  ],
  clientAccess: 'proximamente',
  hero: {
    title: 'Gestión patrimonial inteligente y rigor técnico para tu propiedad en el Este',
    subtitle:
      'Olvídate de la operativa diaria. Combinamos administración contable transparente, control de proveedores y supervisión de arquitectura en Maldonado, Punta del Este y Rocha.',
    cta: 'Solicitar diagnóstico',
    badges: ['Supervisión directa por arquitectos', 'Cuentas bancarias separadas y fondo rotativo'],
  },
  services: {
    eyebrow: 'Servicios',
    title: 'Tres niveles de servicio, según lo que necesita tu propiedad',
    intro: 'No solo pagamos facturas: auditamos, planificamos el mantenimiento y te rendimos cuentas con fotos y números.',
    levels: [
      {
        level: 1,
        name: 'Cuidador / Control periódico',
        description: 'Ideal para casas cerradas.',
        items: ['Rondas de inspección', 'Control post-temporada', 'Custodia de llaves', 'Aviso inmediato'],
      },
      {
        level: 2,
        name: 'Administración integral',
        description: 'Operativa y finanzas al día, con rendición de cuentas mensual.',
        items: [
          'Pago puntual de UTE, OSE, Contribución Inmobiliaria e Impuesto de Primaria',
          'Gestión de personal en BPS',
          'Rendición de cuentas mensual',
        ],
      },
      {
        level: 3,
        name: 'Property Management técnico',
        description: 'Todo lo anterior, con la mirada técnica de un arquitecto.',
        items: [
          'Relevamiento inicial de patologías',
          'Plan de mantenimiento preventivo a 24 meses',
          'Presupuesto anual proyectado',
          'Dirección de obras menores o reformas',
        ],
      },
    ],
  },
  transparency: {
    eyebrow: 'Cómo trabajamos',
    title: 'Transparencia operativa',
    items: [
      {
        title: 'Cuentas claras',
        text: 'Operamos con cuentas bancarias separadas y un fondo rotativo con reposición mensual. Tu dinero nunca se mezcla con el de la empresa.',
      },
      {
        title: 'Límites de gasto',
        text: 'Política clara por escrito: definimos contigo el monto que podemos gastar sin consulta previa. Por encima de ese límite, siempre pedimos tu aprobación.',
      },
      {
        title: 'Informe mensual',
        text: 'Cada mes recibes el reporte fotográfico de la propiedad, el estado financiero y la evolución de consumos para detectar pérdidas o consumos anómalos.',
      },
    ],
  },
  coverage: {
    eyebrow: 'Cobertura',
    title: 'Trabajamos en todo Uruguay',
    text: 'Toca el mapa donde está tu propiedad y te mostramos la distancia aproximada desde nuestra base y el viático de traslado.',
    viaticoNote:
      'La distancia es una estimación: línea recta corregida por un factor de ruta. El valor definitivo se confirma en la auditoría inicial.',
  },
  quoter: {
    eyebrow: 'Cotizador',
    title: 'Conoce una estimación de tu abono',
    intro: 'Tres pasos: tipo de propiedad, nivel de servicio y ubicación.',
    disclaimer: 'Estimación orientativa sujeta a auditoría inicial.',
    cta: 'Congela esta tarifa programando una auditoría inicial',
  },
  testimonials: [],
  faq: [],
  contact: {
    eyebrow: 'Contacto',
    title: 'Solicita un diagnóstico inicial',
    text: 'Cuéntanos sobre tu propiedad y te contactamos para coordinar la auditoría.',
    phone: null,
    whatsapp: null,
    email: null,
    address: null,
  },
  footer: { legal: null, privacyPolicyUrl: null, termsUrl: null },
  privacyPolicyVersion: 'provisoria-0',
};

// ---------------------------------------------------------------------------
// Contenido publicado (si existe). import.meta.glob devuelve {} si el archivo no
// existe, así el build y el chequeo de tipos funcionan sin la API.
// ---------------------------------------------------------------------------

interface PublishedContent {
  sections: {
    settings: { provisional: boolean; clientAccess: SiteContent['clientAccess']; privacyPolicyVersion: string };
    brand: SiteContent['brand'];
    seo: SiteContent['seo'];
    nav: { items: SiteContent['nav'] };
    hero: SiteContent['hero'];
    services: { eyebrow: string; title: string; intro: string };
    transparency: SiteContent['transparency'];
    coverage: SiteContent['coverage'];
    quoter: SiteContent['quoter'];
    contact: SiteContent['contact'];
    footer: SiteContent['footer'];
  };
  services: Array<{ level: number; name: string; description: string; items: string[] }>;
  faq: SiteContent['faq'];
  testimonials: SiteContent['testimonials'];
  propertyTypes: Array<{ code: string; name: string }>;
}

const generated = import.meta.glob<{ content: PublishedContent }>('./generated/published-content.json', {
  eager: true,
  import: 'default',
});
const published = Object.values(generated)[0]?.content;

function fromPublished(p: PublishedContent): SiteContent {
  const s = p.sections;
  return {
    provisional: s.settings.provisional,
    clientAccess: s.settings.clientAccess,
    privacyPolicyVersion: s.settings.privacyPolicyVersion,
    brand: s.brand,
    seo: s.seo,
    nav: s.nav.items,
    hero: s.hero,
    services: {
      ...s.services,
      levels: p.services
        .filter((l): l is typeof l & { level: 1 | 2 | 3 } => l.level >= 1 && l.level <= 3)
        .map((l) => ({ level: l.level, name: l.name, description: l.description, items: l.items })),
    },
    transparency: s.transparency,
    coverage: s.coverage,
    quoter: s.quoter,
    contact: s.contact,
    footer: s.footer,
    faq: p.faq,
    testimonials: p.testimonials,
  };
}

export const content: SiteContent = published ? fromPublished(published) : FALLBACK_CONTENT;

/** Nombres publicados de los tipos de propiedad (el segmento del formulario es fijo por código). */
export const PROPERTY_TYPES: PropertyTypeOption[] = BASE_PROPERTY_TYPES.map((t) => ({
  ...t,
  name: published?.propertyTypes.find((p) => p.code === t.code)?.name ?? t.name,
}));

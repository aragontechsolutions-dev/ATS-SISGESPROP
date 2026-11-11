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

import type { ImageKey } from './images';

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

/** Clave de imagen elegida en el panel ('ninguna' = sin imagen). */
export type ImageChoice = ImageKey | 'ninguna';

export interface FaqItem {
  category: string;
  question: string;
  answer: string;
}

export interface SiteContent {
  provisional: boolean;
  brand: { name: string };
  seo: { title: string; description: string };
  nav: Array<{ label: string; href: string }>;
  clientAccess: 'oculto' | 'proximamente';
  hero: {
    title: string;
    subtitle: string;
    complement: string;
    cta: string;
    secondaryCta: string;
    slogan: string | null;
    badges: string[];
    image: ImageChoice;
  };
  services: { eyebrow: string; title: string; intro: string; levels: ServiceLevelContent[] };
  complementary: {
    eyebrow: string;
    title: string;
    intro: string;
    items: Array<{ title: string; text: string; image: ImageChoice }>;
    note: string | null;
  };
  bitacora: {
    eyebrow: string;
    title: string;
    text: string;
    items: Array<{ title: string; text: string }>;
    note: string | null;
    image: ImageChoice;
  };
  transparency: { eyebrow: string; title: string; items: Array<{ title: string; text: string }> };
  coverage: { eyebrow: string; title: string; text: string; viaticoNote: string };
  quoter: { eyebrow: string; title: string; intro: string; disclaimer: string; cta: string };
  testimonials: Array<{ author: string; text: string }>;
  faq: FaqItem[];
  faqSection: {
    eyebrow: string;
    title: string;
    intro: string;
    closingTitle: string;
    closingText: string;
    closingCta: string;
  };
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
    "title": "Gestión y administración de propiedades en Uruguay",
    "description": "Administramos, supervisamos y conservamos propiedades en Maldonado, Punta del Este y zonas seleccionadas de Uruguay. Gestión documentada, estés donde estés."
  },
  nav: [
    {
      "label": "Servicios",
      "href": "#servicios"
    },
    {
      "label": "Bitácora",
      "href": "#bitacora"
    },
    {
      "label": "Cómo trabajamos",
      "href": "#transparencia"
    },
    {
      "label": "Cobertura",
      "href": "#cobertura"
    },
    {
      "label": "Cotizador",
      "href": "#cotizador"
    },
    {
      "label": "Preguntas",
      "href": "#preguntas"
    },
    {
      "label": "Contacto",
      "href": "#contacto"
    }
  ],
  clientAccess: 'proximamente',
  hero: {
    "title": "Gestión integral y conservación patrimonial de propiedades en Uruguay",
    "subtitle": "Administramos, supervisamos y conservamos propiedades para que sus propietarios tengan tranquilidad, control y respaldo, estén donde estén.",
    "complement": "Nos ocupamos de la administración, el mantenimiento y la supervisión de tu propiedad. Coordinamos profesionales, controlamos gastos y documentamos cada actuación para que tengas información clara y tranquilidad en todo momento.",
    "cta": "Solicitar una propuesta",
    "secondaryCta": "Calcular mi abono",
    "slogan": "Tu propiedad, nuestro compromiso.",
    "badges": [
      "Gestión profesional y documentada",
      "Para propietarios en Uruguay y en el exterior"
    ],
    "image": "casa-frente-mar"
  },
  services: {
    eyebrow: 'Servicios',
    title: "Tres niveles de contratación, según lo que necesita tu propiedad",
    intro: "Niveles simples y comparables, que se completan con servicios complementarios. Cada propuesta se adapta a las necesidades de tu propiedad.",
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
  complementary: {
    "eyebrow": "Servicios complementarios",
    "title": "Prestaciones que se suman a cualquier nivel",
    "intro": "Se contratan por separado, con alcance, responsables y presupuesto acordados previamente.",
    "items": [
      {
        "title": "Puertas Abiertas",
        "text": "Visitas programadas para ventilar y renovar el aire de la propiedad, con la frecuencia acordada y según el clima, la seguridad y el estado del inmueble. No reemplaza un diagnóstico técnico de humedad.",
        "image": "living-hogar"
      },
      {
        "title": "Preparación de llegadas",
        "text": "Acondicionamiento de la propiedad y coordinación de servicios antes de que llegues.",
        "image": "cocina-parrillero"
      },
      {
        "title": "Gestión de temporada alta",
        "text": "Administración de la propiedad durante su uso por terceros en temporada alta, con un alcance definido en un acuerdo específico.",
        "image": "penthouse-terraza"
      },
      {
        "title": "Mantenimiento y proveedores",
        "text": "Coordinación de mantenimiento preventivo y correctivo, y de proveedores especializados, dentro del alcance contratado.",
        "image": "inspeccion-tablero"
      },
      {
        "title": "Espacios exteriores",
        "text": "Coordinación de piscina, jardinería, limpieza y áreas complementarias.",
        "image": "casa-piedra-campo"
      },
      {
        "title": "Obras y reformas",
        "text": "Coordinación y seguimiento de obras y reformas, con presupuesto, alcance y responsables expresamente acordados.",
        "image": "inspeccion-exterior-tablet"
      }
    ],
    "note": "Los servicios complementarios se presupuestan por separado."
  },
  bitacora: {
    "eyebrow": "Gestión digital",
    "title": "Cada propiedad tiene su propio historial. Cada actuación queda registrada.",
    "text": "En PRIVAT creemos que una gestión transparente necesita información documentada. Por eso, cada propiedad contará con una bitácora digital donde registramos incidencias, visitas, intervenciones, observaciones y situaciones relevantes, con fecha, responsable y evidencias.",
    "items": [
      {
        "title": "Visitas e inspecciones",
        "text": "Fecha, motivo, observaciones y resultados."
      },
      {
        "title": "Incidencias",
        "text": "Desperfectos, anomalías, daños y situaciones imprevistas."
      },
      {
        "title": "Mantenimiento",
        "text": "Trabajos realizados, intervenciones y recomendaciones."
      },
      {
        "title": "Proveedores",
        "text": "Visitas, diagnósticos, presupuestos y trabajos ejecutados."
      },
      {
        "title": "Comunicaciones y documentos",
        "text": "Autorizaciones, fotografías, documentos y comprobantes."
      }
    ],
    "note": "Próximamente: acceso de clientes a la plataforma para consultar el historial actualizado de su propiedad desde cualquier lugar.",
    "image": "inspeccion-cocina"
  },
  transparency: {
    "eyebrow": "Cómo trabajamos",
    "title": "Transparencia operativa",
    "items": [
      {
        "title": "Cuentas claras",
        "text": "Los fondos de tu propiedad se manejan separados de nuestros honorarios, con registro y rendición de cada movimiento."
      },
      {
        "title": "Límites de gasto",
        "text": "Definimos contigo, por escrito, el monto que podemos gastar sin consulta previa. Por encima de ese límite, siempre pedimos tu aprobación. Ante una urgencia que ponga en riesgo personas o el patrimonio, actuamos para contener el daño y te informamos a la mayor brevedad."
      },
      {
        "title": "Informes periódicos",
        "text": "Recibes informes con fotografías, gastos y comprobantes, con la frecuencia acordada en tu contrato."
      },
      {
        "title": "Registro documental",
        "text": "Visitas, incidencias, intervenciones y situaciones relevantes quedan documentadas, con fecha, responsable y evidencias."
      }
    ]
  },
  coverage: {
    "eyebrow": "Cobertura",
    "title": "Gestión de propiedades en Maldonado, Punta del Este y zonas seleccionadas de Uruguay",
    "text": "Nuestra operación se concentra en Maldonado y Punta del Este, con posibilidad de atender otras localidades según las características del inmueble y el alcance del servicio. Toca el mapa donde está tu propiedad para ver la distancia aproximada desde nuestra base.",
    "viaticoNote": "La distancia es una estimación: línea recta corregida por un factor de ruta. El valor definitivo se confirma en la propuesta personalizada."
  },
  quoter: {
    "eyebrow": "Cotizador",
    "title": "Calcula una estimación preliminar de tu abono",
    "intro": "Tres pasos: tipo de propiedad, nivel de servicio y ubicación.",
    "disclaimer": "Estimación preliminar en dólares, sin IVA. No es una cotización definitiva: el valor final se confirma en una propuesta personalizada.",
    "cta": "Solicitar propuesta personalizada"
  },
  testimonials: [],
  /** FAQ del cliente (documento PRIVAT_FAQ_especificacion_web, con las correcciones C1/C2). */
  faq: [
    {
      "category": "Sobre PRIVAT y sus servicios",
      "question": "¿Qué es PRIVAT y a qué se dedica?",
      "answer": "PRIVAT es una empresa especializada en la gestión y administración de propiedades. Nos ocupamos de coordinar, supervisar y gestionar las necesidades de cada inmueble, procurando conservar su valor, optimizar su funcionamiento y brindar tranquilidad a sus propietarios."
    },
    {
      "category": "Sobre PRIVAT y sus servicios",
      "question": "¿Qué tipo de propiedades administra PRIVAT?",
      "answer": "Trabajamos con apartamentos, casas, residencias, propiedades de temporada y otros inmuebles. Adaptamos nuestros servicios a las características y necesidades particulares de cada propiedad."
    },
    {
      "category": "Sobre PRIVAT y sus servicios",
      "question": "¿PRIVAT trabaja únicamente en Punta del Este?",
      "answer": "Nuestra área de actuación está centrada en Maldonado y Punta del Este, aunque podemos evaluar solicitudes de otras localidades de Uruguay según las características del inmueble y el servicio requerido."
    },
    {
      "category": "Sobre PRIVAT y sus servicios",
      "question": "¿Qué diferencia a PRIVAT de una inmobiliaria tradicional?",
      "answer": "Nuestro enfoque está orientado a la gestión y conservación de propiedades. No nos limitamos a una operación inmobiliaria: buscamos establecer una relación continua con el propietario, ocupándonos de los aspectos operativos, administrativos y de mantenimiento de su inmueble."
    },
    {
      "category": "Administración y gestión",
      "question": "¿Qué servicios puedo contratar?",
      "answer": "Ofrecemos diferentes servicios que pueden contratarse individualmente o mediante una propuesta integral. Entre ellos:\n• Administración y seguimiento de gastos.\n• Control de facturas y vencimientos.\n• Inspecciones periódicas del inmueble.\n• Supervisión del estado general de la propiedad.\n• Coordinación de mantenimiento y reparaciones.\n• Gestión de proveedores y servicios técnicos.\n• Limpieza y acondicionamiento.\n• Mantenimiento de jardines y piscinas.\n• Atención y coordinación ante imprevistos.\n• Gestión integral de propiedades destinadas al uso de terceros durante la temporada alta en Punta del Este.\n• Preparación de la propiedad para la llegada de sus propietarios.\nCada propuesta se adapta a las necesidades de la propiedad."
    },
    {
      "category": "Administración y gestión",
      "question": "¿Tengo que contratar todos los servicios?",
      "answer": "No. Cada propietario puede seleccionar los servicios que necesita. Elaboramos una propuesta personalizada, evitando contratar prestaciones que no resulten necesarias para su inmueble."
    },
    {
      "category": "Administración y gestión",
      "question": "¿Puedo contratar solamente el mantenimiento de mi propiedad?",
      "answer": "Sí. Es posible solicitar servicios específicos, como inspecciones, mantenimiento preventivo, coordinación de reparaciones o acondicionamiento de la propiedad."
    },
    {
      "category": "Administración y gestión",
      "question": "¿PRIVAT realiza inspecciones cuando no estoy en Uruguay?",
      "answer": "Sí. Uno de nuestros servicios consiste en establecer un cronograma de visitas para verificar el estado general del inmueble, identificar posibles inconvenientes y comunicar cualquier situación que requiera atención.\nAdemás, contamos con una iniciativa denominada Puertas Abiertas: según la frecuencia acordada con el cliente, abrimos las aberturas de la propiedad durante una visita programada para favorecer la circulación de aire. Esta práctica contribuye a renovar el ambiente interior, regular la humedad y reducir los olores característicos de los espacios que permanecen cerrados durante períodos prolongados."
    },
    {
      "category": "Administración y gestión",
      "question": "¿Puedo recibir fotografías o informes sobre el estado de mi propiedad?",
      "answer": "Sí. Proporcionamos informes periódicos acompañados de fotografías y observaciones relevantes, de acuerdo con la modalidad de servicio contratada. También podemos generar informes adicionales cuando el propietario lo necesite."
    },
    {
      "category": "Propietarios en el exterior",
      "question": "Vivo fuera de Uruguay. ¿Puedo contratar PRIVAT igualmente?",
      "answer": "Por supuesto. Uno de nuestros enfoques principales es brindar soluciones a propietarios que residen fuera de Uruguay y necesitan contar con un referente local de confianza para gestionar sus propiedades."
    },
    {
      "category": "Propietarios en el exterior",
      "question": "¿Cómo puedo mantenerme informado sobre mi propiedad desde otro país?",
      "answer": "Mantenemos comunicación directa con nuestros clientes, dondequiera que se encuentren, y proporcionamos información sobre las gestiones realizadas, gastos, mantenimiento e incidencias relevantes. Próximamente, los clientes contarán además con una bitácora digital de su propiedad o propiedades, con el historial de gestión actualizado. Mantenemos canales de comunicación abiertos para atender consultas y coordinar situaciones que requieran seguimiento."
    },
    {
      "category": "Propietarios en el exterior",
      "question": "¿Puedo autorizar a PRIVAT para que gestione pagos y gastos de mi propiedad?",
      "answer": "Sí. Podemos coordinar el seguimiento y la gestión administrativa de facturas, servicios y gastos asociados al inmueble. Los procedimientos de autorización, disponibilidad de fondos y rendición se establecen previamente con cada propietario."
    },
    {
      "category": "Propietarios en el exterior",
      "question": "¿Qué sucede si surge un problema mientras estoy fuera del país?",
      "answer": "Actuamos como referente local para identificar la situación, evaluar las alternativas y coordinar su resolución. Cuando sea necesario, nos comunicamos con el propietario para solicitar autorización antes de realizar trabajos o asumir gastos extraordinarios."
    },
    {
      "category": "Mantenimiento y reparaciones",
      "question": "¿PRIVAT se encarga de coordinar reparaciones?",
      "answer": "Sí. Coordinamos la intervención de proveedores y técnicos especializados para atender las necesidades de mantenimiento y reparación de la propiedad."
    },
    {
      "category": "Mantenimiento y reparaciones",
      "question": "¿Cómo se seleccionan los proveedores?",
      "answer": "Trabajamos con proveedores y profesionales seleccionados según el tipo de servicio requerido, considerando su experiencia y trayectoria, y priorizando la calidad del trabajo, la confiabilidad y una adecuada relación entre costo y resultado."
    },
    {
      "category": "Mantenimiento y reparaciones",
      "question": "¿Puedo solicitar presupuestos antes de realizar una reparación?",
      "answer": "Sí. Cuando una intervención requiere autorización o representa un gasto extraordinario, podemos gestionar presupuestos para que el propietario evalúe y apruebe la propuesta antes de avanzar."
    },
    {
      "category": "Mantenimiento y reparaciones",
      "question": "¿Qué sucede ante una emergencia?",
      "answer": "Ante una situación urgente, PRIVAT coordina las acciones necesarias para procurar proteger la propiedad y reducir posibles daños. Los alcances de actuación y las autorizaciones correspondientes se establecen previamente en el contrato de servicio."
    },
    {
      "category": "Costos y contratación",
      "question": "¿Cuánto cuesta contratar PRIVAT?",
      "answer": "El costo depende de las características de la propiedad, su ubicación, los servicios solicitados y la frecuencia de atención requerida. Elaboramos propuestas personalizadas para que cada propietario conozca claramente el alcance del servicio y sus honorarios."
    },
    {
      "category": "Costos y contratación",
      "question": "¿Los gastos de mantenimiento están incluidos en el servicio?",
      "answer": "No necesariamente. Los honorarios de administración y gestión se diferencian de los gastos propios de la propiedad, como reparaciones, materiales, servicios públicos, proveedores y mantenimiento. Estos gastos son responsabilidad del propietario y se gestionan según las condiciones acordadas."
    },
    {
      "category": "Costos y contratación",
      "question": "¿PRIVAT adelanta dinero para pagar gastos de la propiedad?",
      "answer": "No. Los fondos necesarios para cubrir los gastos corresponden al propietario. PRIVAT puede encargarse de su coordinación, seguimiento y rendición, conforme a las condiciones establecidas."
    },
    {
      "category": "Costos y contratación",
      "question": "¿Existe un contrato de prestación de servicios?",
      "answer": "Sí. Formalizamos la relación mediante un contrato donde se especifican los servicios contratados, responsabilidades, honorarios, condiciones de funcionamiento y demás aspectos relevantes."
    },
    {
      "category": "Costos y contratación",
      "question": "¿Puedo modificar los servicios contratados posteriormente?",
      "answer": "Sí. Las necesidades de una propiedad pueden cambiar con el tiempo. Es posible revisar y ajustar el alcance de los servicios mediante un acuerdo entre ambas partes."
    },
    {
      "category": "Costos y contratación",
      "question": "¿Existe un plazo mínimo de contratación?",
      "answer": "PRIVAT no establece un plazo mínimo de contratación. Las condiciones de permanencia y finalización del servicio se detallan en la propuesta y el contrato correspondiente."
    },
    {
      "category": "Confianza y seguridad",
      "question": "¿Cómo puedo saber que mi propiedad está siendo correctamente atendida?",
      "answer": "Trabajamos con seguimiento de las tareas, comunicación directa e información sobre las gestiones realizadas. Nuestro objetivo es que el propietario tenga conocimiento y control sobre lo que sucede con su inmueble."
    },
    {
      "category": "Confianza y seguridad",
      "question": "¿PRIVAT puede tomar decisiones sobre mi propiedad sin consultarme?",
      "answer": "Las decisiones se toman respetando las facultades y autorizaciones establecidas en el contrato. Las intervenciones extraordinarias y los gastos que requieran aprobación se comunican previamente al propietario, salvo las actuaciones urgentes que hayan sido expresamente autorizadas o situaciones de fuerza mayor —como desastres naturales— que requieran una actuación inmediata para proteger o salvaguardar el patrimonio del cliente."
    },
    {
      "category": "Confianza y seguridad",
      "question": "¿PRIVAT se responsabiliza por los trabajos realizados por terceros?",
      "answer": "PRIVAT coordina y supervisa las intervenciones dentro del alcance del servicio contratado. La ejecución técnica y las garantías de los trabajos corresponden a los proveedores o profesionales responsables, según las condiciones de cada contratación."
    },
    {
      "category": "Confianza y seguridad",
      "question": "¿Cómo puedo comenzar a trabajar con PRIVAT?",
      "answer": "El primer paso es contactarnos y compartir algunos datos de tu propiedad y tus necesidades. Evaluaremos el caso, coordinaremos una instancia de intercambio y prepararemos una propuesta de servicios adaptada a tus requerimientos."
    },
    {
      "category": "Plataforma y seguimiento digital",
      "question": "¿Puedo consultar la información de mi propiedad desde una plataforma online?",
      "answer": "Estamos preparando una bitácora digital para que cada cliente pueda consultar la información de gestión de su propiedad, de acuerdo con las funcionalidades habilitadas y el servicio contratado. Estará disponible próximamente."
    },
    {
      "category": "Plataforma y seguimiento digital",
      "question": "¿Puedo acceder a facturas, comprobantes y documentos de mi propiedad?",
      "answer": "Sí. Cuando el espacio de clientes esté disponible, la documentación digital asociada a la gestión podrá consultarse allí una vez cargada en la plataforma. Mientras tanto, la compartimos con los informes y rendiciones."
    },
    {
      "category": "Plataforma y seguimiento digital",
      "question": "¿Puedo consultar el historial de mantenimiento de mi propiedad?",
      "answer": "Sí. Registramos las gestiones e intervenciones realizadas, lo que facilita el seguimiento de trabajos, incidencias y tareas de mantenimiento. La consulta en línea de ese historial estará disponible con el espacio de clientes."
    },
    {
      "category": "Plataforma y seguimiento digital",
      "question": "¿Puedo contratar PRIVAT para administrar más de una propiedad?",
      "answer": "Sí. Podemos gestionar varias propiedades de un mismo titular. La propuesta se adapta a la cantidad de inmuebles, sus ubicaciones y las necesidades de administración de cada uno."
    },
    {
      "category": "Plataforma y seguimiento digital",
      "question": "¿Los informes quedan disponibles para consultarlos más adelante?",
      "answer": "Los informes y registros digitales que se generen y carguen en la plataforma podrán consultarse posteriormente, de acuerdo con las funcionalidades habilitadas y las condiciones del servicio contratado."
    }
  ],
  faqSection: {
    "eyebrow": "Preguntas frecuentes",
    "title": "Preguntas frecuentes",
    "intro": "Las dudas habituales de quienes evalúan confiarnos la gestión de su propiedad.",
    "closingTitle": "¿Tenés otra consulta?",
    "closingText": "Cada propiedad tiene necesidades particulares. Si no encontraste la respuesta que buscabas, nuestro equipo está disponible para asesorarte y ayudarte a encontrar la solución adecuada.",
    "closingCta": "Contactar"
  },
  contact: {
    "eyebrow": "Contacto",
    "title": "Solicita una propuesta",
    "text": "Cuéntanos sobre tu propiedad y tus necesidades. Evaluamos el caso, coordinamos una instancia de intercambio y te preparamos una propuesta de servicios a medida.",
    "phone": null,
    "whatsapp": null,
    "email": null,
    "address": null
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
    hero: Partial<SiteContent['hero']>;
    services: { eyebrow: string; title: string; intro: string };
    complementary?: SiteContent['complementary'];
    bitacora?: SiteContent['bitacora'];
    faqsection?: SiteContent['faqSection'];
    transparency: SiteContent['transparency'];
    coverage: SiteContent['coverage'];
    quoter: SiteContent['quoter'];
    contact: SiteContent['contact'];
    footer: SiteContent['footer'];
  };
  services: Array<{ level: number; name: string; description: string; items: string[] }>;
  /** Publicaciones anteriores a la Etapa F1 no traen categoría. */
  faq: Array<{ category?: string; question: string; answer: string }>;
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
    // Una publicación anterior (o una sección editada antes de la Etapa F1) puede no traer los
    // campos nuevos: se completan con el respaldo para no romper la página al restaurar.
    hero: { ...FALLBACK_CONTENT.hero, ...s.hero },
    services: {
      ...s.services,
      levels: p.services
        .filter((l): l is typeof l & { level: 1 | 2 | 3 } => l.level >= 1 && l.level <= 3)
        .map((l) => ({ level: l.level, name: l.name, description: l.description, items: l.items })),
    },
    complementary: s.complementary ?? FALLBACK_CONTENT.complementary,
    bitacora: s.bitacora ?? FALLBACK_CONTENT.bitacora,
    faqSection: s.faqsection ?? FALLBACK_CONTENT.faqSection,
    transparency: s.transparency,
    coverage: s.coverage,
    quoter: s.quoter,
    contact: s.contact,
    footer: s.footer,
    faq: p.faq.map((f) => ({ category: f.category ?? 'Preguntas frecuentes', question: f.question, answer: f.answer })),
    testimonials: p.testimonials,
  };
}

export const content: SiteContent = published ? fromPublished(published) : FALLBACK_CONTENT;

/** Nombres publicados de los tipos de propiedad (el segmento del formulario es fijo por código). */
export const PROPERTY_TYPES: PropertyTypeOption[] = BASE_PROPERTY_TYPES.map((t) => ({
  ...t,
  name: published?.propertyTypes.find((p) => p.code === t.code)?.name ?? t.name,
}));

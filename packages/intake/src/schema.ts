/**
 * Formulario de presentación de clientes y propiedades de PRIVAT.
 * Fuente: especificación funcional EF-WEB-001 v1.0 (noviembre 2026), entregada por el cliente el
 * 12/11/2026. Reemplaza al cotizador: NO calcula honorarios ni muestra precios (sección 9).
 *
 * Esta definición es la ÚNICA fuente de las preguntas, opciones y condiciones: la usa la web para
 * mostrar el formulario y la API para validar lo recibido (el navegador no es confiable).
 *
 * Las preguntas marcadas `proposal: true` NO están detalladas en la especificación (la matriz de la
 * sección 4 solo dice "mostrar preguntas específicas…"): son una PROPUESTA para que el cliente las
 * apruebe o cambie en la maqueta navegable.
 */

export type StepId = 1 | 2 | 3 | 4;

export interface Option {
  value: string;
  label: string;
}

/** Respuestas tal como llegan del formulario. */
export type Answers = Record<string, unknown>;

export type QuestionKind = 'text' | 'textarea' | 'email' | 'tel' | 'single' | 'multi';

export interface Question {
  id: string;
  step: StepId;
  /** Número de pregunta en la especificación (para trazabilidad); las condicionales llevan el de su pregunta madre. */
  ref: string;
  label: string;
  kind: QuestionKind;
  options?: readonly Option[];
  /** Obligatoria (siempre o según otras respuestas). Solo se exige si la pregunta está visible. */
  required: boolean | ((a: Answers) => boolean);
  /** Se muestra solo si devuelve true (preguntas condicionales). */
  visible?: (a: Answers) => boolean;
  /** Largo máximo de los campos de texto. */
  max?: number;
  hint?: string;
  placeholder?: string;
  /** No detallada en la especificación: propuesta para aprobar. */
  proposal?: boolean;
}

export interface Step {
  id: StepId;
  /** Título de la etapa (especificación, sección 3). */
  title: string;
  /** Nombre corto para la barra de progreso (sección 2). */
  short: string;
  objective: string;
}

export const STEPS: readonly Step[] = [
  { id: 1, title: 'Conozcamos al propietario', short: 'El propietario', objective: 'Identificar al interesado y su relación con el inmueble.' },
  { id: 2, title: 'Conozcamos tu propiedad', short: 'La propiedad', objective: 'Conocer tipología, ubicación, dimensión y equipamiento.' },
  { id: 3, title: 'Conozcamos tus necesidades', short: 'Sus necesidades', objective: 'Comprender el uso y los servicios que buscás.' },
  { id: 4, title: 'Finalización y contacto', short: 'Contacto y envío', objective: 'Definir cómo continuar la comunicación.' },
];

const opts = (...pairs: Array<[string, string]>): Option[] => pairs.map(([value, label]) => ({ value, label }));
const has = (a: Answers, id: string, value: string) => {
  const v = a[id];
  return Array.isArray(v) ? v.includes(value) : v === value;
};

export const COUNTRIES = opts(['UY', 'Uruguay'], ['AR', 'Argentina'], ['BR', 'Brasil'], ['US', 'Estados Unidos'], ['otro', 'Otro']);
export const RELATIONS = opts(
  ['propietario', 'Soy propietario'],
  ['copropietario', 'Soy copropietario'],
  ['representante', 'Represento al propietario'],
  ['administrador', 'Soy administrador o representante de una empresa'],
  ['otro', 'Otro'],
);
export const PROPERTY_TYPES = opts(
  ['apartamento', 'Apartamento'],
  ['casa', 'Casa'],
  ['residencia', 'Residencia'],
  ['chacra', 'Chacra'],
  ['complejo', 'Propiedad en complejo residencial'],
  ['local', 'Local comercial'],
  ['otro', 'Otro'],
);
export const LOCATIONS = opts(
  ['punta-del-este', 'Punta del Este'],
  ['la-barra', 'La Barra'],
  ['manantiales', 'Manantiales'],
  ['jose-ignacio', 'José Ignacio'],
  ['punta-ballena', 'Punta Ballena'],
  ['maldonado', 'Maldonado'],
  ['otra', 'Otra localidad'],
);
export const BUILT_AREAS = opts(
  ['menos-100', 'Menos de 100 m²'],
  ['100-200', '100–200 m²'],
  ['200-350', '200–350 m²'],
  ['350-500', '350–500 m²'],
  ['mas-500', 'Más de 500 m²'],
  ['no-se', 'No lo sé'],
);
export const BEDROOMS = opts(['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['mas-4', 'Más de 4']);
export const FEATURES = opts(
  ['garaje', 'Garaje'],
  ['terraza', 'Terraza o balcón'],
  ['jardin', 'Jardín'],
  ['piscina', 'Piscina'],
  ['barbacoa', 'Barbacoa'],
  ['dependencia-servicio', 'Dependencia de servicio'],
  ['otros', 'Otros espacios o instalaciones especiales'],
);
export const COMMON_SERVICES = opts(
  ['piscina', 'Piscina'],
  ['jardines', 'Jardines'],
  ['gimnasio', 'Gimnasio'],
  ['seguridad', 'Seguridad'],
  ['otros', 'Otros'],
);
export const USES = opts(
  ['permanente', 'Residencia permanente'],
  ['vacacional', 'Residencia vacacional'],
  ['alquiler-temporal', 'Alquiler temporal'],
  ['alquiler-anual', 'Alquiler anual'],
  ['inversion', 'Inversión inmobiliaria'],
  ['otro', 'Otro'],
);
export const FREQUENCIES = opts(
  ['permanente', 'Permanentemente'],
  ['varias-al-mes', 'Varias veces al mes'],
  ['ocasional', 'Ocasionalmente'],
  ['temporada', 'Principalmente durante la temporada'],
  ['desocupada', 'Permanece desocupada durante largos períodos'],
);
export const CARETAKERS = opts(
  ['yo', 'Yo mismo'],
  ['personal', 'Personal contratado'],
  ['empresa', 'Empresa de administración'],
  ['familiares', 'Familiares o conocidos'],
  ['nadie', 'Nadie actualmente'],
);
export const STAFF_SERVICES = opts(
  ['limpieza', 'Limpieza'],
  ['jardineria', 'Jardinería'],
  ['piscina', 'Piscina'],
  ['mantenimiento', 'Mantenimiento'],
  ['seguridad', 'Seguridad'],
  ['otros', 'Otros'],
);
export const SERVICES = opts(
  ['administracion-integral', 'Administración integral'],
  ['inspecciones', 'Inspecciones periódicas'],
  ['supervision', 'Supervisión y control'],
  ['registro-novedades', 'Registro de novedades e incidencias'],
  ['mantenimiento-preventivo', 'Mantenimiento preventivo'],
  ['reparaciones', 'Reparaciones'],
  ['jardineria-piscina', 'Jardinería y piscina'],
  ['proveedores', 'Coordinación de proveedores'],
  ['obras', 'Supervisión técnica de obras y reformas'],
  ['temporada', 'Apertura y cierre de temporada'],
  ['llegada', 'Preparación para la llegada del propietario'],
  ['representacion', 'Asistencia y representación local'],
  ['alquileres', 'Gestión de alquileres, cuando corresponda'],
  ['otros', 'Otros'],
);
export const START_TIMES = opts(
  ['inmediato', 'Lo antes posible'],
  ['proximo-mes', 'Durante el próximo mes'],
  ['tres-meses', 'En los próximos tres meses'],
  ['temporada', 'Antes de la próxima temporada'],
  ['conociendo', 'Solo estoy conociendo los servicios'],
);
export const CONTACT_CHANNELS = opts(['telefono', 'Teléfono'], ['whatsapp', 'WhatsApp'], ['email', 'Correo electrónico']);
export const CONTACT_TIMES = opts(['manana', 'Mañana'], ['tarde', 'Tarde'], ['indistinto', 'Indistinto']);
export const INTERVIEWS = opts(
  ['presencial', 'Sí, presencial'],
  ['telefonica', 'Sí, telefónica'],
  ['videollamada', 'Sí, por videollamada'],
  ['no-por-ahora', 'Prefiero que primero se comuniquen conmigo'],
);

// ---- Propuestas (no detalladas en la especificación) ----
export const LAND_AREAS_HA = opts(['menos-1', 'Menos de 1 ha'], ['1-5', '1–5 ha'], ['5-20', '5–20 ha'], ['mas-20', 'Más de 20 ha'], ['no-se', 'No lo sé']);
export const LAND_AREAS_M2 = opts(['menos-500', 'Menos de 500 m²'], ['500-1000', '500–1.000 m²'], ['1000-2500', '1.000–2.500 m²'], ['mas-2500', 'Más de 2.500 m²'], ['no-se', 'No lo sé']);
export const FARM_BUILDINGS = opts(['casa-casero', 'Casa de casero'], ['galpon', 'Galpón o depósito'], ['caballerizas', 'Caballerizas o corrales'], ['otras', 'Otras']);
export const YES_NO_UNSURE = opts(['si', 'Sí'], ['no', 'No'], ['no-se', 'No lo sé']);
export const POOL_TYPES = opts(['privada', 'Privada'], ['compartida', 'Compartida']);
export const ADMIN_COMPANY_GOALS = opts(['cambiar', 'Busco cambiar de empresa'], ['adicionales', 'Busco incorporar servicios adicionales'], ['no-se', 'Todavía no lo sé']);
export const RENTAL_MANAGEMENT = opts(['propia', 'Por mi cuenta'], ['inmobiliaria', 'Con una inmobiliaria'], ['plataformas', 'Por plataformas (Airbnb u otras)'], ['aun-no', 'Todavía no se alquila']);

const isType = (a: Answers, ...types: string[]) => types.some((t) => has(a, 'propertyType', t));
/** Edificio o complejo: priorizar servicios comunes (matriz: Apartamento y complejo). */
const inBuilding = (a: Answers) => isType(a, 'apartamento', 'complejo');

export const QUESTIONS: readonly Question[] = [
  // ---------------- Etapa 01 ----------------
  { id: 'name', step: 1, ref: '1', label: '¿Cómo te llamás?', kind: 'text', required: true, max: 120, placeholder: 'Nombre y apellido' },
  { id: 'country', step: 1, ref: '2', label: '¿En qué país residís habitualmente?', kind: 'single', options: COUNTRIES, required: true },
  { id: 'countryOther', step: 1, ref: '2', label: '¿En qué país?', kind: 'text', required: true, max: 60, visible: (a) => has(a, 'country', 'otro') },
  { id: 'relation', step: 1, ref: '3', label: '¿Cuál es tu relación con la propiedad?', kind: 'single', options: RELATIONS, required: true },
  {
    id: 'representationDetail', step: 1, ref: '3', kind: 'textarea', required: true, max: 300,
    label: 'Contanos brevemente a quién representás y en qué carácter',
    placeholder: 'Ej.: represento a mi madre, propietaria de la casa',
    visible: (a) => has(a, 'relation', 'representante') || has(a, 'relation', 'administrador') || has(a, 'relation', 'otro'),
  },

  // ---------------- Etapa 02 ----------------
  { id: 'propertyType', step: 2, ref: '4', label: '¿Qué tipo de propiedad deseás poner bajo administración?', kind: 'single', options: PROPERTY_TYPES, required: true },
  { id: 'propertyTypeOther', step: 2, ref: '4', label: '¿Qué tipo de propiedad es?', kind: 'text', required: true, max: 80, visible: (a) => has(a, 'propertyType', 'otro'), proposal: true },
  { id: 'location', step: 2, ref: '5', label: '¿Dónde se encuentra ubicada?', kind: 'single', options: LOCATIONS, required: true },
  { id: 'locationOther', step: 2, ref: '5', label: '¿En qué localidad?', kind: 'text', required: true, max: 80, visible: (a) => has(a, 'location', 'otra') },
  {
    id: 'locationReference', step: 2, ref: '5', kind: 'text', required: false, max: 120,
    label: 'Barrio o referencia aproximada (opcional)',
    hint: 'No hace falta la dirección exacta.',
    placeholder: 'Ej.: zona de la Brava, cerca de la parada 20',
  },
  { id: 'builtArea', step: 2, ref: '6', label: '¿Cuáles son las dimensiones aproximadas de la propiedad? (superficie construida)', kind: 'single', options: BUILT_AREAS, required: true },
  { id: 'landAreaHa', step: 2, ref: '6', label: 'Superficie aproximada del terreno', kind: 'single', options: LAND_AREAS_HA, required: true, visible: (a) => isType(a, 'chacra'), proposal: true },
  { id: 'farmBuildings', step: 2, ref: '6', label: '¿Qué dependencias adicionales tiene?', kind: 'multi', options: FARM_BUILDINGS, required: false, visible: (a) => isType(a, 'chacra'), proposal: true },
  { id: 'landAreaM2', step: 2, ref: '6', label: 'Superficie aproximada del terreno', kind: 'single', options: LAND_AREAS_M2, required: false, visible: (a) => isType(a, 'casa', 'residencia'), proposal: true },
  { id: 'commonServices', step: 2, ref: '7', label: '¿Qué servicios comunes tiene el edificio o complejo?', kind: 'multi', options: COMMON_SERVICES, required: false, visible: inBuilding },
  { id: 'bedrooms', step: 2, ref: '7', label: '¿Cuántos dormitorios tiene?', kind: 'single', options: BEDROOMS, required: (a) => !isType(a, 'local'), visible: (a) => !isType(a, 'local') },
  { id: 'features', step: 2, ref: '7', label: '¿Qué características tiene tu propiedad?', kind: 'multi', options: FEATURES, required: false, hint: 'Podés elegir varias.' },
  { id: 'featuresOther', step: 2, ref: '7', label: '¿Qué otros espacios o instalaciones?', kind: 'text', required: false, max: 160, visible: (a) => has(a, 'features', 'otros') },
  { id: 'poolType', step: 2, ref: '7', label: 'La piscina, ¿es privada o compartida?', kind: 'single', options: POOL_TYPES, required: true, visible: (a) => has(a, 'features', 'piscina') },
  { id: 'gardenMaintenance', step: 2, ref: '7', label: 'El jardín, ¿requiere mantenimiento?', kind: 'single', options: YES_NO_UNSURE, required: true, visible: (a) => has(a, 'features', 'jardin') },

  // ---------------- Etapa 03 ----------------
  { id: 'use', step: 3, ref: '8', label: '¿Cuál es el uso principal de tu propiedad?', kind: 'single', options: USES, required: true },
  { id: 'useOther', step: 3, ref: '8', label: '¿Cuál es el uso?', kind: 'text', required: true, max: 80, visible: (a) => has(a, 'use', 'otro'), proposal: true },
  { id: 'rentalManagement', step: 3, ref: '8', label: '¿Cómo se gestiona hoy el alquiler?', kind: 'single', options: RENTAL_MANAGEMENT, required: false, visible: (a) => has(a, 'use', 'alquiler-temporal'), proposal: true },
  { id: 'guestTurnover', step: 3, ref: '8', label: '¿Necesitás que preparemos la propiedad entre huéspedes (limpieza, ropa de cama, revisión)?', kind: 'single', options: YES_NO_UNSURE, required: false, visible: (a) => has(a, 'use', 'alquiler-temporal'), proposal: true },
  { id: 'frequency', step: 3, ref: '9', label: '¿Con qué frecuencia utilizás la propiedad?', kind: 'single', options: FREQUENCIES, required: true },
  { id: 'caretaker', step: 3, ref: '10', label: '¿Actualmente alguien se ocupa de la propiedad?', kind: 'single', options: CARETAKERS, required: true },
  { id: 'staffServices', step: 3, ref: '10', label: '¿Qué servicios cubre el personal contratado?', kind: 'multi', options: STAFF_SERVICES, required: false, visible: (a) => has(a, 'caretaker', 'personal') },
  { id: 'adminCompanyGoal', step: 3, ref: '10', label: '¿Buscás cambiar de empresa o incorporar servicios adicionales?', kind: 'single', options: ADMIN_COMPANY_GOALS, required: true, visible: (a) => has(a, 'caretaker', 'empresa') },
  { id: 'services', step: 3, ref: '11', label: '¿Qué tipo de servicios te interesan?', kind: 'multi', options: SERVICES, required: true, hint: 'Podés elegir varios.' },
  { id: 'servicesOther', step: 3, ref: '11', label: '¿Qué otros servicios?', kind: 'text', required: false, max: 160, visible: (a) => has(a, 'services', 'otros') },
  {
    id: 'concern', step: 3, ref: '12', kind: 'textarea', required: false, max: 1000,
    label: '¿Qué es lo que más te preocupa actualmente de tu propiedad?',
    placeholder: 'Contanos si existe alguna situación particular que te gustaría resolver o mejorar.',
  },
  { id: 'startTime', step: 3, ref: '13', label: '¿Cuándo te gustaría comenzar a trabajar con PRIVAT?', kind: 'single', options: START_TIMES, required: true },

  // ---------------- Etapa 04 ----------------
  { id: 'contactChannel', step: 4, ref: '14', label: '¿Cómo podemos comunicarnos contigo?', kind: 'single', options: CONTACT_CHANNELS, required: true },
  { id: 'phone', step: 4, ref: '14', label: 'Número de teléfono', kind: 'tel', required: true, max: 30, hint: 'Con código de país, por ejemplo +598 99 123 456.' },
  { id: 'email', step: 4, ref: '14', label: 'Dirección de correo electrónico', kind: 'email', required: true, max: 160 },
  { id: 'contactTime', step: 4, ref: '14', label: 'Horario preferido', kind: 'single', options: CONTACT_TIMES, required: true },
  { id: 'interview', step: 4, ref: '15', label: '¿Te gustaría coordinar una primera entrevista con nuestro equipo?', kind: 'single', options: INTERVIEWS, required: true },
];

/** Texto del consentimiento obligatorio (especificación, etapa 04). */
export const PRIVACY_CONSENT_TEXT =
  'He leído y acepto la Política de Privacidad de PRIVAT y autorizo el tratamiento de mis datos personales para gestionar esta solicitud y establecer contacto conmigo.';
/** Consentimiento comercial adicional: independiente y OPCIONAL (especificación, etapa 04). Texto: propuesta. */
export const MARKETING_CONSENT_TEXT = 'Quiero recibir novedades de PRIVAT por correo electrónico (opcional).';

/** Mensaje final (especificación, sección 8). */
export const FINAL_MESSAGE = [
  'Gracias por confiar en PRIVAT para conocer las necesidades de tu propiedad.',
  'Hemos recibido tu información. Nuestro equipo analizará los datos proporcionados y se pondrá en contacto contigo para conversar sobre las posibilidades de administración y asistencia que podemos ofrecerte.',
  'En PRIVAT entendemos que cada propiedad es diferente y merece una atención particular.',
];

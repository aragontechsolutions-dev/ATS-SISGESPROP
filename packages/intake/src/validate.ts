import { QUESTIONS, STEPS, type Answers, type Question, type StepId } from './schema.js';

/** Respuestas normalizadas: solo preguntas visibles, textos limpios, opciones válidas. */
export type CleanAnswers = Record<string, string | string[]>;

export interface IntakeError {
  /** Id de la pregunta (o "privacyAccepted"). */
  field: string;
  step: StepId;
  message: string;
}

const EMAIL_RE = /^[^\s@<>"',;]{1,64}@[^\s@<>"',;]{1,190}\.[a-z]{2,}$/i;
/** Teléfono internacional: +, dígitos, espacios, guiones, puntos y paréntesis; de 6 a 15 dígitos (E.164). */
const PHONE_RE = /^\+?[\d\s().-]{6,30}$/;

/** Quita caracteres de control (salvo salto de línea en textos largos) y espacios en los extremos. */
function clean(v: string, multiline: boolean): string {
  // eslint-disable-next-line no-control-regex
  const re = multiline ? /[\u0000-\u0009\u000B-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g;
  return v.replace(re, ' ').replace(/[ \t]{2,}/g, ' ').trim();
}

export function isVisible(q: Question, a: Answers): boolean {
  return q.visible ? q.visible(a) : true;
}

export function isRequired(q: Question, a: Answers): boolean {
  return typeof q.required === 'function' ? q.required(a) : q.required;
}

/** Preguntas visibles de una etapa según las respuestas actuales. */
export function questionsFor(step: StepId, a: Answers): Question[] {
  return QUESTIONS.filter((q) => q.step === step && isVisible(q, a));
}

/** Valida una pregunta visible. Devuelve el valor limpio (o undefined si está vacía) y el error si lo hay. */
export function checkQuestion(q: Question, a: Answers): { value?: string | string[]; error?: string } {
  const raw = a[q.id];
  const required = isRequired(q, a);
  switch (q.kind) {
    case 'single': {
      if (raw === undefined || raw === null || raw === '') return required ? { error: 'Elegí una opción.' } : {};
      if (typeof raw !== 'string' || !q.options!.some((o) => o.value === raw)) return { error: 'Opción no válida.' };
      return { value: raw };
    }
    case 'multi': {
      if (raw === undefined || raw === null || (Array.isArray(raw) && raw.length === 0)) {
        return required ? { error: 'Elegí al menos una opción.' } : {};
      }
      if (!Array.isArray(raw) || raw.length > q.options!.length) return { error: 'Opciones no válidas.' };
      const allowed = new Set(q.options!.map((o) => o.value));
      if (!raw.every((v) => typeof v === 'string' && allowed.has(v))) return { error: 'Opciones no válidas.' };
      // Sin duplicados y en el orden de la definición.
      return { value: q.options!.map((o) => o.value).filter((v) => raw.includes(v)) };
    }
    default: {
      if (raw === undefined || raw === null || raw === '') return required ? { error: 'Este dato es obligatorio.' } : {};
      if (typeof raw !== 'string') return { error: 'Debe ser texto.' };
      const v = clean(raw, q.kind === 'textarea');
      if (!v) return required ? { error: 'Este dato es obligatorio.' } : {};
      if (q.max && v.length > q.max) return { error: `Máximo ${q.max} caracteres.` };
      if (q.kind === 'text' && v.length < 2) return { error: 'Escribí al menos 2 caracteres.' };
      if (q.kind === 'email' && !EMAIL_RE.test(v)) return { error: 'Revisá el correo electrónico (ejemplo: nombre@dominio.com).' };
      if (q.kind === 'tel') {
        const digits = v.replace(/\D/g, '').length;
        if (!PHONE_RE.test(v) || digits < 6 || digits > 15) return { error: 'Revisá el teléfono (con código de país, por ejemplo +598 99 123 456).' };
      }
      return { value: q.kind === 'email' ? v.toLowerCase() : v };
    }
  }
}

/** Errores de una etapa (para no avanzar con datos obligatorios vacíos). */
export function stepErrors(step: StepId, a: Answers): IntakeError[] {
  const errors: IntakeError[] = [];
  for (const q of questionsFor(step, a)) {
    const r = checkQuestion(q, a);
    if (r.error) errors.push({ field: q.id, step, message: r.error });
  }
  return errors;
}

export interface IntakeSubmission {
  answers: CleanAnswers;
  privacyAccepted: true;
  marketingOptIn: boolean;
}

/**
 * Validación completa (la usa la API: nunca se confía en el navegador).
 * - Solo se aceptan ids de preguntas conocidas.
 * - Las respuestas de preguntas NO visibles se descartan (no se guardan datos que no corresponden).
 * - El consentimiento de privacidad es obligatorio; el comercial, opcional e independiente.
 */
export function validateIntake(input: unknown):
  | { ok: true; value: IntakeSubmission }
  | { ok: false; errors: IntakeError[] } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, errors: [{ field: 'answers', step: 1, message: 'Formulario inválido.' }] };
  }
  const body = input as Record<string, unknown>;
  const a = body.answers;
  if (typeof a !== 'object' || a === null || Array.isArray(a)) {
    return { ok: false, errors: [{ field: 'answers', step: 1, message: 'Formulario inválido.' }] };
  }
  const answers = a as Answers;
  const known = new Set(QUESTIONS.map((q) => q.id));
  const errors: IntakeError[] = [];
  for (const k of Object.keys(answers)) {
    if (!known.has(k)) errors.push({ field: k, step: 1, message: 'Campo no permitido.' });
  }
  const out: CleanAnswers = {};
  for (const step of STEPS) {
    for (const q of questionsFor(step.id, answers)) {
      const r = checkQuestion(q, answers);
      if (r.error) errors.push({ field: q.id, step: step.id, message: r.error });
      else if (r.value !== undefined) out[q.id] = r.value;
    }
  }
  if (body.privacyAccepted !== true) {
    errors.push({ field: 'privacyAccepted', step: 4, message: 'Para enviar el formulario tenés que aceptar la Política de Privacidad.' });
  }
  if (body.marketingOptIn !== undefined && typeof body.marketingOptIn !== 'boolean') {
    errors.push({ field: 'marketingOptIn', step: 4, message: 'Valor no válido.' });
  }
  return errors.length
    ? { ok: false, errors }
    : { ok: true, value: { answers: out, privacyAccepted: true, marketingOptIn: body.marketingOptIn === true } };
}

/** Texto legible de una respuesta (resumen antes de enviar, panel y aviso por email). */
export function answerLabel(q: Question, value: string | string[] | undefined): string {
  if (value === undefined || (Array.isArray(value) && value.length === 0)) return '—';
  if (!q.options) return Array.isArray(value) ? value.join(', ') : value;
  const label = (v: string) => q.options!.find((o) => o.value === v)?.label ?? v;
  return Array.isArray(value) ? value.map(label).join(', ') : label(value);
}

export type Priority = 'alta' | 'media' | 'baja';

/**
 * Prioridad comercial SUGERIDA (especificación, sección 6): según la fecha estimada de
 * contratación. Es interna: la edita el equipo y nunca se muestra al visitante.
 */
export function suggestPriority(a: CleanAnswers): Priority {
  switch (a.startTime) {
    case 'inmediato':
      return 'alta';
    case 'proximo-mes':
    case 'tres-meses':
    case 'temporada':
      return 'media';
    default:
      return 'baja';
  }
}

/** Señales internas de la matriz (sección 4) para el equipo comercial. */
export function internalFlags(a: CleanAnswers): string[] {
  const flags: string[] = [];
  if (a.country && a.country !== 'UY') flags.push('Reside en el exterior: posible necesidad de representación local');
  if (a.startTime === 'inmediato') flags.push('Inicio inmediato: prioridad comercial alta');
  if (a.caretaker === 'empresa') flags.push('Tiene administrador: consultar reemplazo o servicios complementarios');
  return flags;
}

import { describe, expect, it } from 'vitest';
import {
  QUESTIONS,
  answerLabel,
  internalFlags,
  questionsFor,
  stepErrors,
  suggestPriority,
  validateIntake,
  type Answers,
} from '../src/index.js';

/** Respuestas mínimas válidas (sin condicionales). */
const BASE: Answers = {
  name: 'Ana Pérez',
  country: 'UY',
  relation: 'propietario',
  propertyType: 'casa',
  location: 'punta-del-este',
  builtArea: '200-350',
  bedrooms: '3',
  use: 'vacacional',
  frequency: 'temporada',
  caretaker: 'nadie',
  services: ['inspecciones', 'temporada'],
  startTime: 'temporada',
  contactChannel: 'whatsapp',
  phone: '+598 99 123 456',
  email: 'Ana@Example.com',
  contactTime: 'tarde',
  interview: 'videollamada',
};
const submit = (answers: Answers, extra: Record<string, unknown> = {}) => validateIntake({ answers, privacyAccepted: true, ...extra });
const ids = (step: 1 | 2 | 3 | 4, a: Answers) => questionsFor(step, a).map((q) => q.id);

describe('definición', () => {
  it('cubre las 15 preguntas de la especificación', () => {
    const refs = new Set(QUESTIONS.map((q) => q.ref));
    for (let i = 1; i <= 15; i++) expect(refs.has(String(i))).toBe(true);
  });
  it('ids únicos y opciones con valores únicos', () => {
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
    for (const q of QUESTIONS) if (q.options) expect(new Set(q.options.map((o) => o.value)).size).toBe(q.options.length);
  });
  it('no hay ninguna pregunta de precios, documentos, datos bancarios ni dirección exacta (sección 9)', () => {
    const text = QUESTIONS.map((q) => `${q.label} ${q.hint ?? ''} ${q.placeholder ?? ''}`).join(' ').toLowerCase();
    for (const banned of ['precio', 'tarifa', 'usd', 'presupuesto', 'cédula', 'documento de identidad', 'banco', 'cuenta bancaria', 'tarjeta', 'dirección exacta:']) {
      expect(text).not.toContain(banned);
    }
  });
});

describe('matriz de interrelación (sección 4)', () => {
  it('País = Otro → campo para especificar', () => {
    expect(ids(1, BASE)).not.toContain('countryOther');
    expect(ids(1, { ...BASE, country: 'otro' })).toContain('countryOther');
  });
  it('Relación = representante, administrador u otro → aclaración; propietario y copropietario no', () => {
    for (const r of ['representante', 'administrador', 'otro']) expect(ids(1, { ...BASE, relation: r })).toContain('representationDetail');
    for (const r of ['propietario', 'copropietario']) expect(ids(1, { ...BASE, relation: r })).not.toContain('representationDetail');
  });
  it('Tipo = Casa → terreno (exteriores); Chacra → terreno en hectáreas y dependencias; Apartamento/complejo → servicios comunes', () => {
    expect(ids(2, BASE)).toEqual(expect.arrayContaining(['landAreaM2']));
    expect(ids(2, BASE)).not.toContain('commonServices');
    expect(ids(2, { ...BASE, propertyType: 'chacra' })).toEqual(expect.arrayContaining(['landAreaHa', 'farmBuildings']));
    expect(ids(2, { ...BASE, propertyType: 'apartamento' })).toContain('commonServices');
    expect(ids(2, { ...BASE, propertyType: 'complejo' })).toContain('commonServices');
    expect(ids(2, { ...BASE, propertyType: 'apartamento' })).not.toContain('landAreaM2');
  });
  it('Apartamento: los servicios comunes van ANTES que las características (se priorizan)', () => {
    const order = ids(2, { ...BASE, propertyType: 'apartamento' });
    expect(order.indexOf('commonServices')).toBeLessThan(order.indexOf('features'));
  });
  it('Piscina → privada o compartida; Jardín → mantenimiento', () => {
    expect(ids(2, { ...BASE, features: ['piscina'] })).toContain('poolType');
    expect(ids(2, { ...BASE, features: ['jardin'] })).toContain('gardenMaintenance');
    expect(ids(2, { ...BASE, features: ['garaje'] })).not.toEqual(expect.arrayContaining(['poolType', 'gardenMaintenance']));
  });
  it('Personal contratado → qué servicios cubre; Empresa → reemplazo o complementarios', () => {
    expect(ids(3, { ...BASE, caretaker: 'personal' })).toContain('staffServices');
    expect(ids(3, { ...BASE, caretaker: 'empresa' })).toContain('adminCompanyGoal');
    expect(ids(3, BASE)).not.toEqual(expect.arrayContaining(['staffServices', 'adminCompanyGoal']));
  });
  it('Uso = Alquiler temporal → ocupación y preparación', () => {
    expect(ids(3, { ...BASE, use: 'alquiler-temporal' })).toEqual(expect.arrayContaining(['rentalManagement', 'guestTurnover']));
    expect(ids(3, BASE)).not.toContain('rentalManagement');
  });
  it('Reside en el exterior → señal de representación local; Inicio inmediato → prioridad alta', () => {
    expect(internalFlags({ country: 'AR' })[0]).toMatch(/representación local/);
    expect(internalFlags({ country: 'UY' })).toEqual([]);
    expect(suggestPriority({ startTime: 'inmediato' })).toBe('alta');
    expect(suggestPriority({ startTime: 'tres-meses' })).toBe('media');
    expect(suggestPriority({ startTime: 'conociendo' })).toBe('baja');
  });
});

describe('validación', () => {
  it('acepta un formulario completo y normaliza (email en minúsculas, consentimiento comercial falso por defecto)', () => {
    const r = submit(BASE);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.answers.email).toBe('ana@example.com');
      expect(r.value.marketingOptIn).toBe(false);
    }
  });
  it('exige el consentimiento de privacidad; el comercial es opcional e independiente', () => {
    const r = validateIntake({ answers: BASE });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.map((e) => e.field)).toContain('privacyAccepted');
    expect(validateIntake({ answers: BASE, privacyAccepted: 'true' }).ok).toBe(false);
    const withMarketing = submit(BASE, { marketingOptIn: true });
    expect(withMarketing.ok && withMarketing.value.marketingOptIn).toBe(true);
  });
  it('exige las condicionales visibles y descarta las respuestas de preguntas ocultas', () => {
    const r = submit({ ...BASE, features: ['piscina'] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.map((e) => e.field)).toEqual(['poolType']);
    // poolType enviado pero sin piscina: no se guarda.
    const hidden = submit({ ...BASE, features: ['garaje'], poolType: 'privada', countryOther: 'Narnia' });
    expect(hidden.ok).toBe(true);
    if (hidden.ok) {
      expect(hidden.value.answers.poolType).toBeUndefined();
      expect(hidden.value.answers.countryOther).toBeUndefined();
    }
  });
  it('rechaza campos desconocidos, opciones inventadas y tipos incorrectos', () => {
    for (const bad of [
      { ...BASE, price: '1000' },
      { ...BASE, country: 'XX' },
      { ...BASE, services: ['inspecciones', 'hackear'] },
      { ...BASE, services: 'inspecciones' },
      { ...BASE, name: { $ne: '' } },
      { ...BASE, name: ['Ana'] },
    ]) expect(submit(bad).ok).toBe(false);
    expect(validateIntake(null).ok).toBe(false);
    expect(validateIntake({ answers: [] }).ok).toBe(false);
  });
  it('valida correo y teléfono internacionales', () => {
    for (const email of ['ana', 'ana@', 'ana@dominio', 'a b@x.com', '<x>@y.com']) expect(submit({ ...BASE, email }).ok).toBe(false);
    for (const phone of ['123', 'abc', '+598 99 123 456 789 012 34', '99<script>']) expect(submit({ ...BASE, phone }).ok).toBe(false);
    for (const phone of ['+598 99 123 456', '(011) 4555-1234', '+1 305 555 0100']) expect(submit({ ...BASE, phone }).ok).toBe(true);
  });
  it('limpia caracteres de control y respeta los largos máximos', () => {
    const r = submit({ ...BASE, name: '  Ana\u0000 Pérez\u0007  ', concern: 'Línea 1\nLínea 2\u0000' });
    expect(r.ok && r.value.answers.name).toBe('Ana Pérez');
    expect(r.ok && r.value.answers.concern).toBe('Línea 1\nLínea 2');
    expect(submit({ ...BASE, name: 'x'.repeat(121) }).ok).toBe(false);
    expect(submit({ ...BASE, concern: 'x'.repeat(1001) }).ok).toBe(false);
  });
  it('múltiple: sin duplicados y en el orden de la definición', () => {
    const r = submit({ ...BASE, services: ['temporada', 'inspecciones', 'temporada'] });
    expect(r.ok && r.value.answers.services).toEqual(['inspecciones', 'temporada']);
  });
  it('local comercial: no pide dormitorios', () => {
    const { bedrooms: _b, ...rest } = BASE;
    expect(submit({ ...rest, propertyType: 'local' }).ok).toBe(true);
    expect(ids(2, { ...BASE, propertyType: 'local' })).not.toContain('bedrooms');
  });
  it('errores por etapa para no avanzar con obligatorios vacíos', () => {
    expect(stepErrors(1, {}).map((e) => e.field)).toEqual(['name', 'country', 'relation']);
    expect(stepErrors(1, BASE)).toEqual([]);
  });
  it('texto legible de las respuestas', () => {
    const q = QUESTIONS.find((x) => x.id === 'services')!;
    expect(answerLabel(q, ['inspecciones', 'temporada'])).toBe('Inspecciones periódicas, Apertura y cierre de temporada');
    expect(answerLabel(q, undefined)).toBe('—');
  });
});

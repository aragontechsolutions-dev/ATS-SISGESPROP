import { useEffect, useId, useRef, useState, type FormEvent, type RefObject } from 'react';
import {
  FINAL_MESSAGE,
  MARKETING_CONSENT_TEXT,
  PRIVACY_CONSENT_TEXT,
  STEPS,
  answerLabel,
  checkQuestion,
  isRequired,
  questionsFor,
  stepErrors,
  type Answers,
  type Question,
  type StepId,
} from '@ats/intake';

/**
 * Formulario de presentación de clientes y propiedades (EF-WEB-001). Reemplaza al cotizador: no
 * calcula ni muestra precios. 4 etapas + resumen editable + mensaje final (secciones 2, 3 y 8).
 *
 * Las preguntas, opciones y condiciones vienen de @ats/intake (la misma definición que valida la
 * API). Aquí solo se valida para avisar antes de avanzar.
 */

export interface IntakePayload {
  answers: Answers;
  privacyAccepted: boolean;
  marketingOptIn: boolean;
}

type Screen = StepId | 'resumen' | 'enviado';

export function IntakeForm({
  onSubmit,
  privacyPolicyUrl,
  showProposals = false,
}: {
  /** Envía las respuestas. Debe lanzar un Error con mensaje legible si falla. */
  onSubmit: (payload: IntakePayload) => Promise<void>;
  privacyPolicyUrl: string | null;
  /** Maqueta: marca las preguntas que no detalla la especificación (para que el cliente las apruebe). */
  showProposals?: boolean;
}) {
  const [answers, setAnswers] = useState<Answers>({});
  const [screen, setScreen] = useState<Screen>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [editingFromSummary, setEditingFromSummary] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const firstRender = useRef(true);

  // Al cambiar de pantalla, el foco va al título (lectores de pantalla y teclado).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
    headingRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [screen]);

  const set = (id: string, value: unknown) => {
    setAnswers((a) => ({ ...a, [id]: value }));
    setErrors((e) => {
      if (!e[id]) return e;
      const { [id]: _removed, ...rest } = e;
      return rest;
    });
  };

  function focusFirstError(ids: string[]) {
    requestAnimationFrame(() => {
      const el = formRef.current?.querySelector<HTMLElement>(`[data-q="${ids[0]}"] input, [data-q="${ids[0]}"] textarea`);
      el?.focus();
    });
  }

  function next(e: FormEvent) {
    e.preventDefault();
    if (typeof screen !== 'number') return;
    const errs = stepErrors(screen, answers);
    const extra: Record<string, string> = {};
    if (screen === 4 && !privacyAccepted) extra.privacyAccepted = 'Para enviar el formulario tenés que aceptar la Política de Privacidad.';
    const all = { ...Object.fromEntries(errs.map((x) => [x.field, x.message])), ...extra };
    if (Object.keys(all).length) {
      setErrors(all);
      focusFirstError(Object.keys(all));
      return;
    }
    setErrors({});
    if (editingFromSummary || screen === 4) {
      setEditingFromSummary(false);
      setScreen('resumen');
    } else {
      setScreen((screen + 1) as StepId);
    }
  }

  async function send() {
    if (sending) return; // protección contra doble envío (además del botón deshabilitado)
    setSending(true);
    setSendError(null);
    try {
      await onSubmit({ answers, privacyAccepted, marketingOptIn });
      setScreen('enviado');
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'No se pudo enviar el formulario. Intentá de nuevo.');
    } finally {
      setSending(false);
    }
  }

  const stepIndex = typeof screen === 'number' ? screen - 1 : 4;

  if (screen === 'enviado') {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 sm:p-8" data-testid="intake-done">
        <h2 ref={headingRef} tabIndex={-1} className="heading text-2xl outline-none">¡Gracias!</h2>
        <div className="mt-4 space-y-3 text-lg">
          {FINAL_MESSAGE.map((p) => <p key={p}>{p}</p>)}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-5 sm:p-8">
      <Progress current={stepIndex} />

      {screen === 'resumen' ? (
        <Summary
          answers={answers}
          headingRef={headingRef}
          marketingOptIn={marketingOptIn}
          onEdit={(step) => {
            setEditingFromSummary(true);
            setScreen(step);
          }}
          onSend={() => void send()}
          sending={sending}
          sendError={sendError}
        />
      ) : (
        <form ref={formRef} onSubmit={next} noValidate aria-labelledby="intake-step-title">
          <p className="eyebrow mt-6">Etapa {screen} de 4</p>
          <h2 id="intake-step-title" ref={headingRef} tabIndex={-1} className="heading text-2xl outline-none">
            {STEPS[screen - 1]!.title}
          </h2>
          <p className="mt-1 text-text-secondary">{STEPS[screen - 1]!.objective}</p>

          <div className="mt-6 space-y-6">
            {questionsFor(screen, answers).map((q) => (
              <QuestionField key={q.id} q={q} answers={answers} error={errors[q.id]} onChange={set} showProposal={showProposals} />
            ))}
            {screen === 4 && (
              <Consents
                privacyPolicyUrl={privacyPolicyUrl}
                privacyAccepted={privacyAccepted}
                marketingOptIn={marketingOptIn}
                error={errors.privacyAccepted}
                onPrivacy={(v) => {
                  setPrivacyAccepted(v);
                  if (v) setErrors(({ privacyAccepted: _p, ...rest }) => rest);
                }}
                onMarketing={setMarketingOptIn}
              />
            )}
          </div>

          {Object.keys(errors).length > 0 && (
            <p role="alert" className="mt-6 text-sm font-semibold text-error">
              <span aria-hidden="true">⚠ </span>Revisá los datos marcados antes de continuar.
            </p>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            {screen > 1 && !editingFromSummary && (
              <button type="button" className="btn-secondary" onClick={() => (setErrors({}), setScreen((screen - 1) as StepId))}>
                Anterior
              </button>
            )}
            <button className="btn-primary">
              {editingFromSummary ? 'Guardar y volver al resumen' : screen === 4 ? 'Revisar antes de enviar' : 'Siguiente'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/** Barra de progreso: las 4 etapas de la especificación y el resumen. */
function Progress({ current }: { current: number }) {
  const labels = [...STEPS.map((s) => s.short), 'Revisión'];
  return (
    <nav aria-label="Progreso del formulario">
      {/* Segmentos con clases (sin style=""): la CSP de la landing no permite estilos en línea. */}
      <div className="flex gap-1" aria-hidden="true">
        {labels.map((l, i) => <div key={l} className={`h-2 flex-1 rounded-full ${i <= current ? 'bg-primary' : 'bg-background'}`} />)}
      </div>
      <ol className="mt-3 grid grid-cols-5 gap-1 text-center text-xs sm:text-sm">
        {labels.map((l, i) => (
          <li key={l} aria-current={i === current ? 'step' : undefined}
            className={i === current ? 'font-bold text-text-primary' : i < current ? 'text-text-primary' : 'text-text-secondary'}>
            <span className="block font-semibold">{i < 4 ? `0${i + 1}` : '✓'}</span>
            <span className="hidden sm:inline">{l}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function ProposalTag() {
  return (
    <span className="ml-2 inline-block rounded-sm bg-warning px-1.5 py-0.5 align-middle text-xs font-semibold text-white">
      Propuesta
    </span>
  );
}

function QuestionField({
  q,
  answers,
  error,
  onChange,
  showProposal,
}: {
  q: Question;
  answers: Answers;
  error?: string;
  onChange: (id: string, v: unknown) => void;
  showProposal: boolean;
}) {
  const id = useId();
  const errId = `${id}-err`;
  const hintId = `${id}-hint`;
  const required = isRequired(q, answers);
  const describedBy = [q.hint ? hintId : '', error ? errId : ''].filter(Boolean).join(' ') || undefined;
  const label = (
    <>
      {q.label}
      {!required && q.kind !== 'multi' && !q.label.includes('(opcional)') && <span className="font-normal text-text-secondary"> (opcional)</span>}
      {showProposal && q.proposal && <ProposalTag />}
    </>
  );
  const hint = q.hint && <p id={hintId} className="mt-1 text-sm text-text-secondary">{q.hint}</p>;
  const err = error && <p id={errId} className="mt-2 text-sm font-semibold text-error"><span aria-hidden="true">⚠ </span>{error}</p>;

  if (q.kind === 'single' || q.kind === 'multi') {
    const value = answers[q.id];
    const selected = (v: string) => (Array.isArray(value) ? value.includes(v) : value === v);
    const toggle = (v: string) => {
      if (q.kind === 'single') return onChange(q.id, v);
      const list = Array.isArray(value) ? (value as string[]) : [];
      onChange(q.id, list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
    };
    return (
      <fieldset data-q={q.id} aria-describedby={describedBy} aria-invalid={error ? true : undefined}>
        <legend className="text-lg font-semibold">{label}</legend>
        {hint}
        <div className={`mt-3 grid gap-2 ${q.options!.length > 4 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
          {q.options!.map((o) => (
            <label key={o.value}
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-border bg-surface px-3 py-2 hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-background has-[:checked]:font-semibold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-primary">
              <input type={q.kind === 'single' ? 'radio' : 'checkbox'} name={q.id} value={o.value} checked={selected(o.value)}
                onChange={() => toggle(o.value)} className="h-5 w-5 shrink-0 accent-[var(--color-primary)]" />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
        {err}
      </fieldset>
    );
  }

  const common = {
    id,
    className: 'field',
    value: typeof answers[q.id] === 'string' ? (answers[q.id] as string) : '',
    maxLength: q.max,
    placeholder: q.placeholder,
    required,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
    onChange: (e: { target: { value: string } }) => onChange(q.id, e.target.value),
  };
  return (
    <div data-q={q.id}>
      <label htmlFor={id} className="label text-lg">{label}</label>
      {hint}
      <div className="mt-2">
        {q.kind === 'textarea' ? (
          <textarea {...common} rows={4} />
        ) : (
          <input {...common} type={q.kind === 'email' ? 'email' : q.kind === 'tel' ? 'tel' : 'text'}
            autoComplete={q.id === 'name' ? 'name' : q.kind === 'email' ? 'email' : q.kind === 'tel' ? 'tel' : 'off'}
            inputMode={q.kind === 'tel' ? 'tel' : q.kind === 'email' ? 'email' : undefined} />
        )}
      </div>
      {err}
    </div>
  );
}

function Consents({
  privacyPolicyUrl,
  privacyAccepted,
  marketingOptIn,
  error,
  onPrivacy,
  onMarketing,
}: {
  privacyPolicyUrl: string | null;
  privacyAccepted: boolean;
  marketingOptIn: boolean;
  error?: string;
  onPrivacy: (v: boolean) => void;
  onMarketing: (v: boolean) => void;
}) {
  const errId = useId();
  const [before, after] = PRIVACY_CONSENT_TEXT.split('Política de Privacidad');
  return (
    <div className="space-y-4 rounded-md border border-border bg-background p-4" data-q="privacyAccepted">
      <label className="flex items-start gap-3">
        <input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={privacyAccepted} onChange={(e) => onPrivacy(e.target.checked)}
          aria-invalid={error ? true : undefined} aria-describedby={error ? errId : undefined} />
        <span>
          {before}
          {privacyPolicyUrl ? (
            <a href={privacyPolicyUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline">Política de Privacidad</a>
          ) : (
            <strong>Política de Privacidad</strong>
          )}
          {after} <span className="text-text-secondary">(obligatorio)</span>
        </span>
      </label>
      {error && <p id={errId} className="text-sm font-semibold text-error"><span aria-hidden="true">⚠ </span>{error}</p>}
      <label className="flex items-start gap-3">
        <input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={marketingOptIn} onChange={(e) => onMarketing(e.target.checked)} />
        <span>{MARKETING_CONSENT_TEXT}</span>
      </label>
    </div>
  );
}

function Summary({
  answers,
  headingRef,
  marketingOptIn,
  onEdit,
  onSend,
  sending,
  sendError,
}: {
  answers: Answers;
  headingRef: RefObject<HTMLHeadingElement | null>;
  marketingOptIn: boolean;
  onEdit: (step: StepId) => void;
  onSend: () => void;
  sending: boolean;
  sendError: string | null;
}) {
  return (
    <div data-testid="intake-summary">
      <p className="eyebrow mt-6">Revisión</p>
      <h2 ref={headingRef} tabIndex={-1} className="heading text-2xl outline-none">Revisá tus respuestas antes de enviar</h2>
      <div className="mt-6 space-y-6">
        {STEPS.map((s) => (
          <section key={s.id} aria-labelledby={`resumen-${s.id}`} className="rounded-md border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id={`resumen-${s.id}`} className="font-bold">0{s.id} · {s.title}</h3>
              <button type="button" className="btn-secondary" onClick={() => onEdit(s.id)} aria-label={`Editar: ${s.title}`}>Editar</button>
            </div>
            <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              {questionsFor(s.id, answers).map((q) => {
                const v = checkQuestion(q, answers).value;
                if (v === undefined && !isRequired(q, answers)) return null;
                return (
                  <div key={q.id} className="contents">
                    <dt className="text-text-secondary">{q.label}</dt>
                    <dd className="whitespace-pre-line font-semibold">{answerLabel(q, v)}</dd>
                  </div>
                );
              })}
              {s.id === 4 && (
                <div className="contents">
                  <dt className="text-text-secondary">Novedades por correo</dt>
                  <dd className="font-semibold">{marketingOptIn ? 'Sí' : 'No'}</dd>
                </div>
              )}
            </dl>
          </section>
        ))}
      </div>
      {sendError && <p role="alert" className="mt-6 font-semibold text-error"><span aria-hidden="true">⚠ </span>{sendError}</p>}
      <div className="mt-8">
        <button type="button" className="btn-primary" disabled={sending} onClick={onSend}>
          {sending ? 'Enviando…' : 'Enviar'}
        </button>
      </div>
    </div>
  );
}

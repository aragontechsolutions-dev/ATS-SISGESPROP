import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError, ensureApiAwake } from '../api';
import { content, PROPERTY_TYPES } from '../content';
import { Turnstile } from '../components/Turnstile';
import { ApiWakingNotice } from '../components/ApiWakingNotice';
import type { QuoteSelection } from './Quoter';

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '';

interface Props {
  selection: QuoteSelection;
}

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string };

/** Formulario de diagnóstico (Ley 18.331: consentimiento expreso y datos mínimos). */
export function Contact({ selection }: Props) {
  const { contact, privacyPolicyVersion, footer } = content;
  const [engaged, setEngaged] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [propertyType, setPropertyType] = useState<string>('');
  // Hasta que React toma el control, el envío queda deshabilitado: así el navegador nunca
  // envía el formulario por su cuenta (con los datos personales en la URL).
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // Prefill desde el cotizador ("Congela esta tarifa…").
  const effectiveType = propertyType || selection.propertyTypeCode || '';
  const simulationId = selection.simulation?.simulationId;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    if (!token) {
      setStatus({ kind: 'error', message: 'Completa la verificación anti-spam.' });
      return;
    }
    setStatus({ kind: 'sending' });
    try {
      await api.createLead({
        name: String(data.get('name') ?? '').trim(),
        email: String(data.get('email') ?? '').trim(),
        phone: String(data.get('phone') ?? '').trim() || undefined,
        residenceCountry: String(data.get('residenceCountry') ?? '').trim() || undefined,
        propertyLocation: String(data.get('propertyLocation') ?? '').trim() || undefined,
        propertyTypeCode: effectiveType || undefined,
        simulationId,
        message: String(data.get('message') ?? '').trim() || undefined,
        consent: true,
        policyVersion: privacyPolicyVersion,
        turnstileToken: token,
      });
      form.reset();
      setPropertyType('');
      setStatus({ kind: 'sent' });
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof ApiError ? err.message : 'No pudimos enviar la consulta.' });
    } finally {
      setToken(null);
      setResetKey((k) => k + 1);
    }
  }

  return (
    <section id="contacto" className="section bg-background" aria-labelledby="contacto-titulo">
      <div className="container-page grid gap-12 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <p className="eyebrow">{contact.eyebrow}</p>
          <h2 id="contacto-titulo" className="heading">
            {contact.title}
          </h2>
          <p className="mt-4 text-lg text-text-secondary">{contact.text}</p>
          <ul className="mt-8 space-y-3">
            {contact.whatsapp && (
              <li>
                <a className="font-semibold text-primary underline" href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`} rel="noopener noreferrer" target="_blank">
                  WhatsApp
                </a>
              </li>
            )}
            {contact.email && (
              <li>
                <a className="font-semibold text-primary underline" href={`mailto:${contact.email}`}>
                  {contact.email}
                </a>
              </li>
            )}
            {contact.phone && <li>{contact.phone}</li>}
          </ul>
        </div>

        <form
          method="post"
          className="rounded-lg border border-border bg-surface p-6 md:p-8"
          onSubmit={onSubmit}
          onFocusCapture={() => {
            setEngaged(true);
            // Despierta la API mientras el visitante escribe (plan gratuito de Render, ver api.ts).
            void ensureApiAwake();
          }}
          aria-describedby="form-estado"
        >
          {simulationId && (
            <p className="mb-6 rounded-md bg-background p-3 text-sm">
              Adjuntaremos tu estimación del cotizador a la consulta.
            </p>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="name" className="label">Nombre y apellido</label>
              <input id="name" name="name" required maxLength={120} autoComplete="name" className="field" />
            </div>
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input id="email" name="email" type="email" required maxLength={160} autoComplete="email" className="field" />
            </div>
            <div>
              <label htmlFor="phone" className="label">Teléfono (opcional)</label>
              <input id="phone" name="phone" type="tel" maxLength={30} autoComplete="tel" className="field" />
            </div>
            <div>
              <label htmlFor="residenceCountry" className="label">País de residencia (opcional)</label>
              <input id="residenceCountry" name="residenceCountry" maxLength={60} autoComplete="country-name" className="field" />
            </div>
            <div>
              <label htmlFor="propertyLocation" className="label">Ubicación del inmueble (opcional)</label>
              <input id="propertyLocation" name="propertyLocation" maxLength={120} aria-describedby="propertyLocation-ayuda" className="field" />
              <p id="propertyLocation-ayuda" className="mt-1 text-xs text-text-secondary">Localidad o zona. No hace falta la dirección exacta.</p>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="propertyType" className="label">Tipo de propiedad</label>
              <select
                id="propertyType"
                name="propertyType"
                className="field"
                value={effectiveType}
                onChange={(e) => setPropertyType(e.target.value)}
              >
                <option value="">Elegir…</option>
                {(['Apartamento', 'Casa', 'Chacra'] as const).map((segment) => (
                  <optgroup key={segment} label={segment}>
                    {PROPERTY_TYPES.filter((t) => t.segment === segment).map((t) => (
                      <option key={t.code} value={t.code}>{t.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="message" className="label">Mensaje (opcional)</label>
              <textarea id="message" name="message" rows={4} maxLength={2000} className="field" />
            </div>
          </div>

          <div className="mt-6 flex items-start gap-3">
            <input id="consent" name="consent" type="checkbox" required className="mt-1 h-5 w-5 accent-[var(--color-primary)]" />
            <label htmlFor="consent" className="text-sm text-text-primary">
              Acepto que mis datos se usen para responder esta consulta, según la{' '}
              {footer.privacyPolicyUrl ? (
                <a href={footer.privacyPolicyUrl} className="font-semibold underline">política de privacidad</a>
              ) : (
                'política de privacidad'
              )}{' '}
              (Ley N.º 18.331).
            </label>
          </div>

          <div className="mt-6 min-h-[65px]">
            {engaged && SITE_KEY ? (
              <Turnstile siteKey={SITE_KEY} onToken={setToken} resetKey={resetKey} />
            ) : (
              <p className="text-sm text-text-secondary">La verificación anti-spam aparece al completar el formulario.</p>
            )}
          </div>

          <button type="submit" className="btn-primary mt-6 w-full sm:w-auto" disabled={!hydrated || status.kind === 'sending'}>
            {status.kind === 'sending' ? 'Enviando…' : 'Enviar consulta'}
          </button>

          <div id="form-estado" aria-live="polite" className="mt-4">
            <ApiWakingNotice />
            {status.kind === 'sent' && (
              <p className="font-semibold text-success" role="status">
                <span aria-hidden="true">✓ </span>Recibimos tu consulta. Te contactaremos a la brevedad.
              </p>
            )}
            {status.kind === 'error' && (
              <p className="font-semibold text-error" role="alert">
                <span aria-hidden="true">⚠ </span>
                {status.message}
              </p>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}

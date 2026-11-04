import { useState } from 'react';
import { api, ApiError, formatUsd, type LatLng, type SimulationResult } from '../api';
import { content, PROPERTY_TYPES } from '../content';

export interface QuoteSelection {
  propertyTypeCode: string | null;
  serviceLevel: number | null;
  simulation: SimulationResult | null;
}

interface Props {
  point: LatLng | null;
  selection: QuoteSelection;
  onSelectionChange: (s: QuoteSelection) => void;
}

/** Cotizador en 3 pasos. El cálculo lo hace la API; aquí solo se muestran totales. */
export function Quoter({ point, selection, onSelectionChange }: Props) {
  const { quoter, services } = content;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (patch: Partial<QuoteSelection>) =>
    onSelectionChange({ ...selection, ...patch, simulation: patch.simulation ?? null });

  const canCalculate = Boolean(selection.propertyTypeCode && selection.serviceLevel && point);

  async function calculate() {
    if (!selection.propertyTypeCode || !selection.serviceLevel || !point) return;
    setLoading(true);
    setError(null);
    try {
      const simulation = await api.simulate({
        propertyTypeCode: selection.propertyTypeCode,
        serviceLevel: selection.serviceLevel,
        ...point,
      });
      onSelectionChange({ ...selection, simulation });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos calcular la estimación.');
    } finally {
      setLoading(false);
    }
  }

  const result = selection.simulation;

  return (
    <section id="cotizador" className="section bg-surface" aria-labelledby="cotizador-titulo">
      <div className="container-page max-w-4xl">
        <p className="eyebrow">{quoter.eyebrow}</p>
        <h2 id="cotizador-titulo" className="heading">
          {quoter.title}
        </h2>
        <p className="mt-4 text-lg text-text-secondary">{quoter.intro}</p>

        <form
          method="post"
          className="mt-10 space-y-10"
          onSubmit={(e) => {
            e.preventDefault();
            void calculate();
          }}
        >
          <fieldset>
            <legend className="mb-4 text-lg font-bold">1. Tipo de propiedad</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {PROPERTY_TYPES.map((t) => (
                <label
                  key={t.code}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-surface p-4 has-[:checked]:border-primary has-[:checked]:bg-background"
                >
                  <input
                    type="radio"
                    name="propertyType"
                    value={t.code}
                    checked={selection.propertyTypeCode === t.code}
                    onChange={() => set({ propertyTypeCode: t.code })}
                    className="h-5 w-5 accent-[var(--color-primary)]"
                  />
                  <span>{t.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-4 text-lg font-bold">2. Nivel de servicio</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {services.levels.map((l) => (
                <label
                  key={l.level}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-surface p-4 has-[:checked]:border-primary has-[:checked]:bg-background"
                >
                  <input
                    type="radio"
                    name="serviceLevel"
                    value={l.level}
                    checked={selection.serviceLevel === l.level}
                    onChange={() => set({ serviceLevel: l.level })}
                    className="mt-0.5 h-5 w-5 accent-[var(--color-primary)]"
                  />
                  <span>
                    <span className="block text-sm text-text-secondary">Nivel {l.level}</span>
                    <span className="font-semibold">{l.name}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-4 text-lg font-bold">3. Ubicación</legend>
            {point ? (
              <p className="flex flex-wrap items-center gap-3">
                <span className="font-semibold text-success">
                  <span aria-hidden="true">✓ </span>Ubicación elegida en el mapa
                </span>
                <a href="#cobertura" className="text-primary underline">
                  Cambiar
                </a>
              </p>
            ) : (
              <p>
                <a href="#cobertura" className="btn-secondary">
                  Elegir en el mapa
                </a>
              </p>
            )}
          </fieldset>

          <div>
            <button type="submit" className="btn-primary" disabled={!canCalculate || loading}>
              {loading ? 'Calculando…' : 'Ver estimación'}
            </button>
            {!canCalculate && (
              <p className="mt-2 text-sm text-text-secondary">Completa los tres pasos para ver la estimación.</p>
            )}
          </div>
        </form>

        <div aria-live="polite" className="mt-8">
          {error && (
            <p className="font-semibold text-error" role="alert">
              <span aria-hidden="true">⚠ </span>
              {error}
            </p>
          )}
          {result && (
            <div className="rounded-lg border border-border bg-background p-6 md:p-8" data-testid="quote-result">
              <dl className="grid gap-6 sm:grid-cols-3">
                <div>
                  <dt className="text-sm text-text-secondary">Abono mensual · temporada baja</dt>
                  <dd className="mt-1 text-3xl font-bold">{formatUsd(result.lowFee)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-text-secondary">Abono mensual · temporada alta</dt>
                  <dd className="mt-1 text-3xl font-bold">{formatUsd(result.highFee)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-text-secondary">Total anual estimado</dt>
                  <dd className="mt-1 text-3xl font-bold">{formatUsd(result.annualFee)}</dd>
                </div>
              </dl>
              <p className="mt-4 text-sm text-text-secondary">
                Distancia aproximada desde la base: {Number(result.distanceKm).toLocaleString('es-UY')} km. Importes en USD.
              </p>
              <p className="mt-1 text-sm font-semibold">{quoter.disclaimer}</p>
              <a href="#contacto" className="btn-primary mt-6">
                {quoter.cta}
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { api, ApiError, formatUsd, type Coverage as CoverageData, type LatLng, type TravelEstimate } from '../api';
import { content } from '../content';
import { ApiWakingNotice } from '../components/ApiWakingNotice';

const MapView = lazy(() => import('../components/MapView'));

interface Props {
  point: LatLng | null;
  onPointChange: (point: LatLng | null) => void;
}

/** Hook: true cuando el elemento se acerca al viewport (carga diferida del mapa). */
function useNearViewport<T extends Element>(margin = '300px') {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (near || !ref.current) return;
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return;
    }
    const obs = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setNear(true), {
      rootMargin: margin,
    });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [near, margin]);
  return { ref, near };
}

export function Coverage({ point, onPointChange }: Props) {
  const { coverage } = content;
  const { ref, near } = useNearViewport<HTMLDivElement>();
  const [base, setBase] = useState<CoverageData | null>(null);
  const [estimate, setEstimate] = useState<TravelEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!near) return;
    api.coverage().then(setBase).catch(() => setBase(null));
  }, [near]);

  useEffect(() => {
    if (!point) {
      setEstimate(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .travelEstimate(point)
      .then((r) => !cancelled && setEstimate(r))
      .catch((e: unknown) => {
        if (cancelled) return;
        setEstimate(null);
        setError(e instanceof ApiError ? e.message : 'No pudimos calcular la distancia.');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [point]);

  return (
    <section id="cobertura" className="section bg-background" aria-labelledby="cobertura-titulo">
      <div className="container-page grid gap-10 lg:grid-cols-[1fr_2fr]">
        <div>
          <p className="eyebrow">{coverage.eyebrow}</p>
          <h2 id="cobertura-titulo" className="heading">
            {coverage.title}
          </h2>
          <p className="mt-4 text-lg text-text-secondary">{coverage.text}</p>

          <div className="mt-8 rounded-lg border border-border bg-surface p-5" aria-live="polite">
            <ApiWakingNotice />
            {!point && !error && <p className="text-text-secondary">Todavía no elegiste una ubicación.</p>}
            {loading && <p>Calculando…</p>}
            {error && (
              <p className="font-semibold text-error" role="alert">
                <span aria-hidden="true">⚠ </span>
                {error}
              </p>
            )}
            {estimate && !loading && (
              <dl className="grid grid-cols-2 gap-4" data-testid="travel-estimate">
                <div>
                  <dt className="text-sm text-text-secondary">Distancia aproximada</dt>
                  <dd className="text-2xl font-bold">{Number(estimate.distanceKm).toLocaleString('es-UY')} km</dd>
                </div>
                <div>
                  <dt className="text-sm text-text-secondary">Viático por visita</dt>
                  <dd className="text-2xl font-bold">{formatUsd(estimate.travelCostPerVisit)}</dd>
                </div>
              </dl>
            )}
            {point && (
              <div className="mt-4 flex flex-wrap gap-3">
                <a href="#cotizador" className="btn-primary">
                  Usar en el cotizador
                </a>
                <button type="button" className="btn-secondary" onClick={() => onPointChange(null)}>
                  Borrar ubicación
                </button>
              </div>
            )}
          </div>
          <p className="mt-4 text-sm text-text-secondary">{coverage.viaticoNote}</p>
          <p className="mt-2 text-sm text-text-secondary">
            ¿No puedes usar el mapa? <a href="#contacto" className="font-semibold text-primary underline">Escríbenos</a> y
            te ayudamos.
          </p>
        </div>

        <div ref={ref}>
          {near ? (
            <Suspense fallback={<MapPlaceholder text="Cargando mapa…" />}>
              <MapView
                base={base}
                point={point}
                onPick={(p) => {
                  setError(null);
                  onPointChange(p);
                }}
                onOutside={() => setError('La ubicación elegida está fuera de Uruguay.')}
              />
            </Suspense>
          ) : (
            <MapPlaceholder text="El mapa se carga al llegar a esta sección." />
          )}
        </div>
      </div>
    </section>
  );
}

function MapPlaceholder({ text }: { text: string }) {
  return (
    <div className="flex h-[420px] items-center justify-center rounded-lg border border-border bg-surface text-text-secondary md:h-[520px]">
      {text}
    </div>
  );
}

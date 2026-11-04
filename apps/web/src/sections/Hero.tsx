import { content } from '../content';

/**
 * Hero. Mientras no haya fotografía con derecho de uso (P-13b) se usa un fondo
 * verde bosque con líneas arquitectónicas en SVG (sin peso de imagen).
 * Con la foto: <picture> con versión escritorio y móvil, fetchpriority="high"
 * y overlay verde (identidad visual, sección 5).
 */
export function Hero() {
  const { hero } = content;
  return (
    <section id="inicio" className="relative overflow-hidden bg-primary text-text-on-dark">
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full opacity-15"
        viewBox="0 0 800 400"
        preserveAspectRatio="xMidYMid slice"
      >
        <g fill="none" stroke="currentColor" strokeWidth="1">
          <path d="M420 330V170l150-90 150 90v160" />
          <path d="M470 330V230h80v100M600 330V210h70v120" />
          <path d="M380 330h400M80 330h260" />
          <path d="M120 330V240l90-55 90 55v90" />
        </g>
        <path d="M0 360h800" stroke="var(--color-accent)" strokeWidth="2" />
      </svg>

      <div className="relative container-page px-4 py-20 sm:px-6 md:py-32">
        <div className="max-w-3xl">
          <div className="mb-6 h-px w-16 bg-accent" aria-hidden="true" />
          <h1 className="text-4xl leading-tight font-bold tracking-tight md:text-5xl">{hero.title}</h1>
          <p className="mt-6 max-w-2xl text-lg text-text-on-dark/90 md:text-xl">{hero.subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#contacto" className="btn bg-background text-primary hover:bg-surface">
              {hero.cta}
            </a>
            <a href="#cotizador" className="btn-on-dark">
              Estimar mi abono
            </a>
          </div>
          {hero.badges.length > 0 && (
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm" aria-label="Garantías">
              {hero.badges.map((badge) => (
                <li key={badge} className="flex items-center gap-2">
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5">
                    <path d="M5 12l4 4 10-10" />
                  </svg>
                  {badge}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

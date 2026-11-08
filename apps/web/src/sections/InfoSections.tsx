import { content } from '../content';
import { Logo } from '../components/Logo';

/** Banner visible mientras el contenido sea provisorio (plan, sección 9). */
export function ProvisionalBanner() {
  if (!content.provisional) return null;
  return (
    <div role="note" className="bg-warning px-4 py-2 text-center text-sm font-semibold text-text-on-dark">
      Versión de vista previa · Contenido provisorio pendiente de aprobación del cliente
    </div>
  );
}

/** Servicios: 3 tarjetas blancas, títulos verde bosque, detalle dorado puntual. */
export function Services() {
  const { services } = content;
  return (
    <section id="servicios" className="section bg-background" aria-labelledby="servicios-titulo">
      <div className="container-page">
        <p className="eyebrow">{services.eyebrow}</p>
        <h2 id="servicios-titulo" className="heading max-w-3xl">
          {services.title}
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-text-secondary">{services.intro}</p>
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {services.levels.map((lvl) => (
            <li key={lvl.level} className="flex flex-col rounded-lg border border-border bg-surface p-6 md:p-8">
              <span className="text-sm font-semibold text-text-secondary">Nivel {lvl.level}</span>
              <div className="mt-2 mb-4 h-px w-10 bg-accent" aria-hidden="true" />
              <h3 className="text-xl font-bold text-text-primary">{lvl.name}</h3>
              <p className="mt-2 text-text-secondary">{lvl.description}</p>
              <ul className="mt-6 space-y-3">
                {lvl.items.map((item) => (
                  <li key={item} className="flex gap-3 text-text-primary">
                    <svg aria-hidden="true" className="mt-1 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5">
                      <path d="M5 12l4 4 10-10" />
                    </svg>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Transparency() {
  const { transparency } = content;
  return (
    <section id="transparencia" className="section bg-surface" aria-labelledby="transparencia-titulo">
      <div className="container-page">
        <p className="eyebrow">{transparency.eyebrow}</p>
        <h2 id="transparencia-titulo" className="heading">
          {transparency.title}
        </h2>
        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {transparency.items.map((item) => (
            <div key={item.title}>
              {/* Detalle dorado como línea (no como texto): el dorado sobre fondo claro no llega a 3:1 (ADR-010). */}
              <div className="h-px w-12 bg-accent" aria-hidden="true" />
              <h3 className="mt-4 text-xl font-bold">{item.title}</h3>
              <p className="mt-3 text-text-secondary">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Testimonios: solo reales y autorizados. Sin testimonios, la sección no existe. */
export function Testimonials() {
  if (content.testimonials.length === 0) return null;
  return (
    <section id="testimonios" className="section bg-surface" aria-labelledby="testimonios-titulo">
      <div className="container-page">
        <h2 id="testimonios-titulo" className="heading">
          Lo que dicen nuestros clientes
        </h2>
        <ul className="mt-10 grid gap-6 md:grid-cols-2">
          {content.testimonials.map((t) => (
            <li key={t.author} className="rounded-lg border border-border bg-background p-6">
              <blockquote className="text-lg">“{t.text}”</blockquote>
              <p className="mt-4 font-semibold">{t.author}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Preguntas frecuentes: desplegables nativos (accesibles por teclado). Vacío = oculto. */
export function Faq() {
  if (content.faq.length === 0) return null;
  return (
    <section id="preguntas" className="section bg-background" aria-labelledby="faq-titulo">
      <div className="container-page max-w-3xl">
        <h2 id="faq-titulo" className="heading">
          Preguntas frecuentes
        </h2>
        <div className="mt-8 divide-y divide-border border-y border-border">
          {content.faq.map((f) => (
            <details key={f.question} className="group py-4">
              <summary className="cursor-pointer list-none text-lg font-semibold">{f.question}</summary>
              <p className="mt-3 text-text-secondary">{f.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const { footer, contact, brand } = content;
  return (
    <footer className="bg-primary px-4 py-12 text-text-on-dark sm:px-6">
      <div className="container-page grid gap-8 md:grid-cols-3">
        <div>
          <Logo variant="blanco" alt={`${brand.name} Gestión de Propiedades`} className="h-14 w-auto" />
          <p className="mt-2 text-sm text-text-on-dark/80">Property Management técnico · Uruguay</p>
        </div>
        <ul className="space-y-2 text-sm">
          {contact.email && (
            <li>
              <a className="underline-offset-4 hover:text-accent hover:underline" href={`mailto:${contact.email}`}>
                {contact.email}
              </a>
            </li>
          )}
          {contact.phone && <li>{contact.phone}</li>}
          {contact.address && <li>{contact.address}</li>}
        </ul>
        <ul className="space-y-2 text-sm">
          {footer.privacyPolicyUrl && (
            <li>
              <a className="underline-offset-4 hover:text-accent hover:underline" href={footer.privacyPolicyUrl}>
                Política de privacidad
              </a>
            </li>
          )}
          {footer.termsUrl && (
            <li>
              <a className="underline-offset-4 hover:text-accent hover:underline" href={footer.termsUrl}>
                Términos y condiciones
              </a>
            </li>
          )}
          {footer.legal && <li className="text-text-on-dark/80">{footer.legal}</li>}
        </ul>
      </div>
      <p className="container-page mt-10 border-t border-text-on-dark/20 pt-6 text-xs text-text-on-dark/70">
        Mapa: © colaboradores de OpenStreetMap.
      </p>
    </footer>
  );
}

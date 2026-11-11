import { useState } from 'react';
import { content } from '../content';
import { Logo } from '../components/Logo';
import { SiteImage } from '../components/SiteImage';
import { LEVEL_IMAGE } from '../images';

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
            <li key={lvl.level} className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface">
              <SiteImage image={LEVEL_IMAGE[lvl.level]} sizes="(min-width: 768px) 33vw, 100vw" className="aspect-[16/9] w-full object-cover" />
              <div className="flex flex-col p-6 md:p-8">
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
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Servicios complementarios (Plan Maestro v1.1): se suman a cualquier nivel, se presupuestan aparte. */
export function Complementary() {
  const { complementary } = content;
  if (complementary.items.length === 0) return null;
  return (
    <section id="complementarios" className="section bg-surface" aria-labelledby="complementarios-titulo">
      <div className="container-page">
        <p className="eyebrow">{complementary.eyebrow}</p>
        <h2 id="complementarios-titulo" className="heading max-w-3xl">
          {complementary.title}
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-text-secondary">{complementary.intro}</p>
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {complementary.items.map((item) => (
            <li key={item.title} className="flex flex-col overflow-hidden rounded-lg border border-border bg-background">
              {item.image !== 'ninguna' && (
                <SiteImage image={item.image} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="aspect-[16/9] w-full object-cover" />
              )}
              <div className="p-6">
                <h3 className="text-xl font-bold">{item.title}</h3>
                <p className="mt-2 text-text-secondary">{item.text}</p>
              </div>
            </li>
          ))}
        </ul>
        {complementary.note && <p className="mt-8 text-sm text-text-secondary">{complementary.note}</p>}
      </div>
    </section>
  );
}

/**
 * Bitácora digital (diferencial del Plan Maestro). Etapa 2: todavía no hay acceso de clientes, por
 * eso el texto la anuncia sin prometer disponibilidad inmediata ni "tiempo real" (C1/C2).
 */
export function Bitacora() {
  const { bitacora } = content;
  return (
    <section id="bitacora" className="section bg-primary text-text-on-dark" aria-labelledby="bitacora-titulo">
      <div className="container-page grid items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="mb-3 text-sm font-semibold tracking-widest text-text-on-dark/85 uppercase">{bitacora.eyebrow}</p>
          <h2 id="bitacora-titulo" className="text-3xl font-bold tracking-tight md:text-4xl">
            {bitacora.title}
          </h2>
          <p className="mt-6 text-lg text-text-on-dark/90">{bitacora.text}</p>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2">
            {bitacora.items.map((item) => (
              <li key={item.title}>
                <div className="h-px w-10 bg-accent" aria-hidden="true" />
                <h3 className="mt-3 font-bold">{item.title}</h3>
                <p className="mt-1 text-sm text-text-on-dark/85">{item.text}</p>
              </li>
            ))}
          </ul>
          {bitacora.note && (
            <p className="mt-8 rounded-md border border-text-on-dark/30 p-4 text-sm" role="note">
              {bitacora.note}
            </p>
          )}
        </div>
        {bitacora.image !== 'ninguna' && (
          <SiteImage image={bitacora.image} sizes="(min-width: 1024px) 50vw, 100vw" className="aspect-[16/9] w-full rounded-lg object-cover" />
        )}
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
        <div className="mt-12 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
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

/**
 * Preguntas frecuentes (especificación del cliente, PRIVAT_FAQ_especificacion_web): acordeón de dos
 * niveles (categoría → pregunta), cada uno independiente. Botones con aria-expanded/aria-controls,
 * operable con teclado, encabezado por categoría. El texto está en el HTML aunque esté cerrado
 * (atributo hidden), así lo leen los buscadores. Sin preguntas, la sección no existe.
 */
export function Faq() {
  const { faq, faqSection } = content;
  const [openCats, setOpenCats] = useState<Set<number>>(() => new Set());
  const [openQs, setOpenQs] = useState<Set<string>>(() => new Set());
  if (faq.length === 0) return null;

  const categories: Array<{ name: string; items: typeof faq }> = [];
  for (const f of faq) {
    const cat = categories.find((c) => c.name === f.category);
    if (cat) cat.items.push(f);
    else categories.push({ name: f.category, items: [f] });
  }
  const toggle = <T,>(set: Set<T>, key: T) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  };

  return (
    <section id="preguntas" className="section bg-background" aria-labelledby="faq-titulo">
      <div className="container-page max-w-3xl">
        <p className="eyebrow">{faqSection.eyebrow}</p>
        <h2 id="faq-titulo" className="heading">
          {faqSection.title}
        </h2>
        <p className="mt-4 text-lg text-text-secondary">{faqSection.intro}</p>
        <div className="mt-10 border-t border-border" data-testid="faq">
          {categories.map((cat, ci) => {
            const catOpen = openCats.has(ci);
            return (
              <div key={cat.name} className="border-b border-border">
                <h3>
                  <button
                    type="button"
                    id={`faq-cat-${ci}`}
                    aria-expanded={catOpen}
                    aria-controls={`faq-cat-panel-${ci}`}
                    onClick={() => setOpenCats((s) => toggle(s, ci))}
                    className="flex min-h-12 w-full items-center justify-between gap-4 py-5 text-left text-xl font-bold"
                  >
                    {cat.name}
                    <ToggleIcon open={catOpen} />
                  </button>
                </h3>
                <div id={`faq-cat-panel-${ci}`} hidden={!catOpen} className="pb-4">
                  <ul className="divide-y divide-border border-t border-border">
                    {cat.items.map((f, qi) => {
                      const key = `${ci}-${qi}`;
                      const qOpen = openQs.has(key);
                      return (
                        <li key={f.question}>
                          <button
                            type="button"
                            id={`faq-q-${key}`}
                            aria-expanded={qOpen}
                            aria-controls={`faq-a-${key}`}
                            onClick={() => setOpenQs((s) => toggle(s, key))}
                            className="flex min-h-12 w-full items-center justify-between gap-4 py-4 pl-2 text-left font-semibold"
                          >
                            {f.question}
                            <ToggleIcon open={qOpen} small />
                          </button>
                          <div id={`faq-a-${key}`} hidden={!qOpen} className="pb-5 pl-2 whitespace-pre-line text-text-secondary">
                            {f.answer}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-10 rounded-lg border border-border bg-surface p-6">
          <h3 className="text-xl font-bold">{faqSection.closingTitle}</h3>
          <p className="mt-2 text-text-secondary">{faqSection.closingText}</p>
          <a href="#contacto" className="btn-primary mt-4">
            {faqSection.closingCta}
          </a>
        </div>
      </div>
    </section>
  );
}

/** Indicador +/− (decorativo: el estado lo anuncia aria-expanded). */
function ToggleIcon({ open, small = false }: { open: boolean; small?: boolean }) {
  const size = small ? 18 : 22;
  return (
    <svg aria-hidden="true" className="shrink-0 text-primary" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14" />
      {!open && <path d="M12 5v14" />}
    </svg>
  );
}

export function Footer() {
  const { footer, contact, brand } = content;
  return (
    <footer className="bg-primary px-4 py-12 text-text-on-dark sm:px-6">
      <div className="container-page grid gap-8 md:grid-cols-3">
        <div>
          <Logo variant="blanco" alt={`${brand.name} Gestión de Propiedades`} className="h-14 w-auto" />
          <p className="mt-2 text-sm text-text-on-dark/80">{content.hero.slogan ?? 'Gestión de propiedades · Uruguay'}</p>
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

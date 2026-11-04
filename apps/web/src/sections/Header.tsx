import { useState } from 'react';
import { content } from '../content';

/** Encabezado: fondo verde bosque, enlaces claros, hover dorado (identidad visual, sección 4). */
export function Header() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 bg-primary text-text-on-dark">
      <div className="container-page flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
        <a href="#inicio" className="text-lg font-bold tracking-[0.2em] whitespace-nowrap" aria-label={`${content.brand.name}, ir al inicio`}>
          {content.brand.name}
        </a>

        <nav aria-label="Principal" className="hidden xl:block">
          <ul className="flex items-center gap-6 text-sm">
            {content.nav.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="underline-offset-4 hover:text-accent hover:underline">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-3 xl:flex">
          <ClientAccess />
          <a href="#contacto" className="btn bg-background whitespace-nowrap text-primary hover:bg-surface">
            {content.hero.cta}
          </a>
        </div>

        <button
          type="button"
          className="btn-on-dark xl:hidden"
          aria-expanded={open}
          aria-controls="menu-movil"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Cerrar' : 'Menú'}
        </button>
      </div>

      {open && (
        <nav id="menu-movil" aria-label="Principal (móvil)" className="border-t border-text-on-dark/20 px-4 pb-4 xl:hidden">
          <ul className="flex flex-col py-2">
            {content.nav.map((item) => (
              <li key={item.href}>
                <a href={item.href} onClick={close} className="block py-3 text-base hover:text-accent">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-3">
            <a href="#contacto" onClick={close} className="btn bg-background text-primary hover:bg-surface">
              {content.hero.cta}
            </a>
            <ClientAccess />
          </div>
        </nav>
      )}
    </header>
  );
}

/** "Acceso Clientes": deshabilitado con leyenda hasta que exista el portal (P-12). */
function ClientAccess() {
  if (content.clientAccess === 'oculto') return null;
  return (
    <span
      className="btn-on-dark cursor-default whitespace-nowrap"
      aria-disabled="true"
      title="El portal de propietarios estará disponible próximamente"
    >
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
      Acceso clientes
      <span className="rounded-sm bg-text-on-dark/15 px-1.5 py-0.5 text-xs font-semibold">Pronto</span>
    </span>
  );
}

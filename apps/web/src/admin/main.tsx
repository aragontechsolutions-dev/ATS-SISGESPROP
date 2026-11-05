import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import { AuthGate } from './AuthGate';
import { ContentPage } from './pages/ContentPage';
import { PricingPage } from './pages/PricingPage';
import { AuditPage, LeadsPage, PublishPage } from './pages/OtherPages';

const TABS = [
  { id: 'contenidos', label: 'Contenidos', Page: ContentPage },
  { id: 'precios', label: 'Precios y viáticos', Page: PricingPage },
  { id: 'consultas', label: 'Consultas', Page: LeadsPage },
  { id: 'publicar', label: 'Publicar', Page: PublishPage },
  { id: 'registro', label: 'Registro de cambios', Page: AuditPage },
] as const;

/** Panel de administración (Plan Etapa 1, sección 4.4). Página aparte: no se carga en la landing. */
function AdminApp({ email, signOut }: { email: string; signOut: () => void }) {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('contenidos');
  const Current = TABS.find((t) => t.id === tab)!.Page;
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-text-on-dark">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="font-bold tracking-[0.2em]">PRIVAT <span className="ml-2 text-sm font-normal tracking-normal opacity-80">Panel</span></p>
          <div className="flex items-center gap-3 text-sm">
            <span className="opacity-80">{email}</span>
            <button type="button" className="btn-on-dark min-h-9 py-1" onClick={signOut}>Salir</button>
          </div>
        </div>
        <nav aria-label="Secciones del panel" className="container-page overflow-x-auto px-4">
          <ul className="flex gap-1">
            {TABS.map((t) => (
              <li key={t.id}>
                <button type="button" aria-current={t.id === tab ? 'page' : undefined} onClick={() => setTab(t.id)}
                  className={`rounded-t-md px-4 py-2 text-sm whitespace-nowrap ${t.id === tab ? 'bg-background text-primary font-semibold' : 'hover:text-accent'}`}>
                  {t.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="container-page px-4 py-8">
        <Current />
      </main>
    </div>
  );
}

createRoot(document.getElementById('admin-root')!).render(
  <StrictMode>
    <AuthGate>{({ email, signOut }) => <AdminApp email={email} signOut={signOut} />}</AuthGate>
  </StrictMode>,
);

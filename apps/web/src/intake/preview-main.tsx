import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import { Logo } from '../components/Logo';
import { content } from '../content';
import { IntakeForm } from './IntakeForm';

/**
 * Maqueta navegable del formulario (EF-WEB-001, "Recomendación para la implementación"): el
 * formulario real, en una página sin enlace y sin indexar, para que el cliente lo recorra y lo
 * apruebe. NO guarda ni envía datos: el envío se simula.
 */
function PreviewPage() {
  return (
    <>
      <header className="bg-primary text-text-on-dark">
        <div className="container-page flex h-16 items-center px-4 sm:px-6">
          <Logo variant="blanco" alt="PRIVAT" className="h-11 w-auto" />
        </div>
      </header>
      <div role="note" className="bg-warning px-4 py-2 text-center text-sm font-semibold text-white">
        Vista previa para aprobación: los datos que escribas NO se guardan ni se envían.
      </div>
      <main className="container-page px-4 py-10 sm:px-6">
        <p className="eyebrow">Formulario de presentación</p>
        <h1 className="heading text-3xl">Contanos sobre vos y tu propiedad</h1>
        <p className="mt-2 max-w-2xl text-text-secondary">
          Cuatro pasos breves para conocerte y preparar una propuesta a medida. No mostramos precios: los conversamos en el primer contacto.
        </p>
        <details className="mt-4 max-w-2xl rounded-md border border-border bg-surface p-4 text-sm">
          <summary className="cursor-pointer font-semibold">Para revisar: qué significa la etiqueta "Propuesta"</summary>
          <p className="mt-2">
            Algunas preguntas condicionales no están detalladas en la especificación (por ejemplo, "superficie de terreno" para chacras o
            las preguntas de alquiler temporal). Las marcamos como <strong>Propuesta</strong> para que las apruebes o indiques cómo cambiarlas.
            La etiqueta no aparecerá en la web final.
          </p>
        </details>
        <div className="mt-8 max-w-3xl">
          <IntakeForm
            showProposals
            privacyPolicyUrl={content.footer.privacyPolicyUrl}
            onSubmit={() => new Promise((resolve) => setTimeout(resolve, 600))}
          />
        </div>
      </main>
    </>
  );
}

createRoot(document.getElementById('intake-preview-root')!).render(
  <StrictMode>
    <PreviewPage />
  </StrictMode>,
);

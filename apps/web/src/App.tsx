import { useState } from 'react';
import type { LatLng } from './api';
import { Header } from './sections/Header';
import { Hero } from './sections/Hero';
import { Faq, Footer, ProvisionalBanner, Services, Testimonials, Transparency } from './sections/InfoSections';
import { Coverage } from './sections/Coverage';
import { Quoter, type QuoteSelection } from './sections/Quoter';
import { Contact } from './sections/Contact';

/** Landing de una página (Plan Etapa 1, sección 4.1). Estado compartido: mapa → cotizador → contacto. */
export function App() {
  const [point, setPoint] = useState<LatLng | null>(null);
  const [selection, setSelection] = useState<QuoteSelection>({
    propertyTypeCode: null,
    serviceLevel: null,
    simulation: null,
  });

  return (
    <>
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-surface focus:p-3">
        Saltar al contenido
      </a>
      <ProvisionalBanner />
      <Header />
      <main id="contenido">
        <Hero />
        <Services />
        <Transparency />
        <Coverage
          point={point}
          onPointChange={(p) => {
            setPoint(p);
            setSelection((s) => ({ ...s, simulation: null }));
          }}
        />
        <Quoter point={point} selection={selection} onSelectionChange={setSelection} />
        <Testimonials />
        <Faq />
        <Contact selection={selection} />
      </main>
      <Footer />
    </>
  );
}

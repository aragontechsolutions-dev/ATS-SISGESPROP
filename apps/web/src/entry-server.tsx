import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { App } from './App';
import { content } from './content';

/** Usado solo en el build para generar el HTML estático (prerender). */
export function render(): string {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

export { content };

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Seguridad (Octubre Negro / CVE de Vite): el servidor de desarrollo escucha solo
// en 127.0.0.1 y nunca se expone. En producción solo se publican archivos compilados.
function vercelHeaders(): Record<string, string> {
  const cfg = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8')) as {
    headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
  };
  const all = cfg.headers.find((h) => h.source === '/(.*)');
  return Object.fromEntries((all?.headers ?? []).map((h) => [h.key, h.value]));
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: '127.0.0.1', strictPort: true, port: 5173 },
  // `vite preview` aplica las mismas cabeceras de seguridad que Vercel (fuente única: vercel.json),
  // para que las pruebas y escaneos locales representen la producción.
  preview: { host: '127.0.0.1', port: 4173, headers: vercelHeaders() },
  build: {
    sourcemap: false,
    target: 'es2022',
    // Dos páginas: la landing (prerenderizada) y el panel /admin (aparte: su código
    // nunca se descarga en la landing).
    rolldownOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        admin: fileURLToPath(new URL('./admin/index.html', import.meta.url)),
      },
    },
  },
});

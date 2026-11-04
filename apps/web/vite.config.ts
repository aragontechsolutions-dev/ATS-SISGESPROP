import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Seguridad (Octubre Negro / CVE de Vite): el servidor de desarrollo escucha solo
// en 127.0.0.1 y nunca se expone. En producción solo se publican archivos compilados.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: '127.0.0.1', strictPort: true, port: 5173 },
  preview: { host: '127.0.0.1', port: 4173 },
  build: { sourcemap: false, target: 'es2022' },
});

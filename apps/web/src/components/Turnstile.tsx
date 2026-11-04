import { useEffect, useRef } from 'react';

/**
 * Widget de Cloudflare Turnstile (anti-spam). El script se descarga solo cuando
 * el componente se monta (al interactuar con el formulario), no en la carga inicial.
 * El token se valida SIEMPRE en el servidor (la API), nunca solo en el navegador.
 */
interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id: string) => void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error('No se pudo cargar Turnstile'));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

interface Props {
  siteKey: string;
  onToken: (token: string | null) => void;
  /** Cambiar este valor fuerza un nuevo desafío (p. ej. después de enviar). */
  resetKey: number;
}

export function Turnstile({ siteKey, onToken, resetKey }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          language: 'es',
          callback: (token: string) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
        });
      })
      .catch(() => onTokenRef.current(null));
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [siteKey, resetKey]);

  return <div ref={ref} data-testid="turnstile" />;
}

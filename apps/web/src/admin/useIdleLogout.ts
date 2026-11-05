import { useEffect, useRef } from 'react';

/** Plan 4.4: cierre de sesión automático por inactividad (15 minutos por defecto). */
export function useIdleLogout(onIdle: () => void, minutes = 15) {
  const cb = useRef(onIdle);
  cb.current = onIdle;
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => cb.current(), minutes * 60_000);
    };
    const events = ['pointerdown', 'keydown', 'scroll', 'visibilitychange'] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [minutes]);
}

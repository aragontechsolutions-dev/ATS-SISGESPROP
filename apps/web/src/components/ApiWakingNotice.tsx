import { useSyncExternalStore } from 'react';
import { apiWaking } from '../api';

/**
 * Aviso mientras la API "despierta" (plan gratuito de Render, ver api.ts). Va dentro de una zona
 * aria-live para que los lectores de pantalla lo anuncien.
 */
export function ApiWakingNotice() {
  const waking = useSyncExternalStore(apiWaking.subscribe, apiWaking.get, apiWaking.getServer);
  if (!waking) return null;
  return (
    <p className="text-sm text-text-secondary" role="status" data-testid="api-waking">
      Conectando con el servidor… la primera vez puede tardar hasta un minuto.
    </p>
  );
}

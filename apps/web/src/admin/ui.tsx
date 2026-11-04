import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AdminApiError } from './http';

/** Mensaje de resultado (éxito / error con detalles). Nunca solo color: lleva texto e ícono. */
export function Alert({ kind, message, details = [] }: { kind: 'ok' | 'error' | 'info'; message: string; details?: string[] }) {
  const style = kind === 'ok' ? 'text-success' : kind === 'error' ? 'text-error' : 'text-text-primary';
  const icon = kind === 'ok' ? '✓' : kind === 'error' ? '⚠' : 'ℹ';
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`rounded-md border border-border bg-surface p-3 text-sm ${style}`}>
      <p className="font-semibold"><span aria-hidden="true">{icon} </span>{message}</p>
      {details.length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-text-primary">
          {details.map((d) => <li key={d}>{d}</li>)}
        </ul>
      )}
    </div>
  );
}

export type Status = { kind: 'ok' | 'error' | 'info'; message: string; details?: string[] } | null;

export function errorStatus(e: unknown): Status {
  if (e instanceof AdminApiError) return { kind: 'error', message: e.message, details: e.details };
  return { kind: 'error', message: 'Error inesperado. Intenta de nuevo.' };
}

/**
 * Carga datos del panel. `status` es SOLO el error de carga: los mensajes de las
 * acciones (guardar, publicar…) los maneja cada página con su propio estado, para
 * que una recarga no los borre.
 */
export function useLoad<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const reload = useCallback(async () => {
    try {
      setData(await loader());
      setStatus(null);
    } catch (e) {
      setStatus(errorStatus(e));
    }
  }, [loader]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { data, status, reload };
}

export function PageTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-bold">{children}</h1>
      {hint && <p className="mt-1 text-sm text-text-secondary">{hint}</p>}
    </header>
  );
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8 rounded-lg border border-border bg-surface p-5" aria-label={title}>
      <h2 className="mb-4 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

export function TextField(props: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  maxLength?: number;
  type?: string;
  required?: boolean;
  hint?: string;
  inputMode?: 'decimal' | 'numeric' | 'text';
}) {
  const { id, label, value, onChange, multiline, maxLength, type = 'text', required, hint, inputMode } = props;
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {multiline ? (
        <textarea id={id} className="field" rows={3} value={value} maxLength={maxLength} required={required} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} className="field" type={type} inputMode={inputMode} value={value} maxLength={maxLength} required={required} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint && <p className="mt-1 text-xs text-text-secondary">{hint}</p>}
    </div>
  );
}

/** Descarga un archivo obtenido con fetch autenticado (no se expone el token en una URL). */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

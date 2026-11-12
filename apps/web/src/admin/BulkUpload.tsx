import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { adminFetch, AdminApiError } from './http';
import { refreshMediaLibrary } from './media';
import { Alert, Panel, type Status } from './ui';

/**
 * Subida masiva de imágenes (pedido del 12/11/2026): arrastrar y soltar o elegir varios archivos,
 * miniatura de cada uno, descripción por imagen, confirmación antes de subir y estado por imagen.
 *
 * Seguridad: aquí solo hay comprobaciones RÁPIDAS para avisar antes de enviar. La API vuelve a
 * validar todo (firma binaria, lectores bloqueados, tamaños) y redibuja la imagen sin metadatos
 * (ADR-020). Las miniaturas son URLs locales "blob:" del archivo elegido: no salen del navegador
 * y se liberan al quitar la imagen o salir de la página.
 */

/** Máximo por tanda: la API acepta 20 subidas por minuto y procesa de a una (Render gratuito). */
export const MAX_BATCH = 10;
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
/** Mismas reglas que la API (MediaAltDto y processImage). */
const ALT_MIN = 5;
const ALT_MAX = 150;
const MIN_W = 960;
const MIN_H = 540;

type ItemStatus = 'lista' | 'invalida' | 'subiendo' | 'subida' | 'error';

interface Item {
  id: string;
  file: File;
  url: string;
  alt: string;
  status: ItemStatus;
  message?: string;
  /** false si el navegador no pudo leerla: no se muestra la miniatura (evita el ícono de imagen rota). */
  previewable?: boolean;
}

/** Tamaño legible: KB por debajo de 1 MB (evita "0,0 MB"). */
const mb = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;

/** Lee las dimensiones con el decodificador del navegador; si no puede, no es una imagen válida. */
function readSize(url: string): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

const STATUS_TEXT: Record<ItemStatus, string> = {
  lista: 'Lista para subir',
  invalida: 'No se puede subir',
  subiendo: 'Subiendo…',
  subida: 'Subida',
  error: 'Error',
};

export function BulkUpload() {
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogTitle = useId();
  const urls = useRef(new Set<string>());

  // Liberar las miniaturas locales al salir de la página.
  useEffect(() => {
    const set = urls.current;
    return () => {
      for (const u of set) URL.revokeObjectURL(u);
      set.clear();
    };
  }, []);

  // Soltar un archivo fuera de la zona no debe abrirlo en la pestaña (se perdería la sesión del panel).
  useEffect(() => {
    const block = (e: globalThis.DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) e.preventDefault();
    };
    window.addEventListener('dragover', block);
    window.addEventListener('drop', block);
    return () => {
      window.removeEventListener('dragover', block);
      window.removeEventListener('drop', block);
    };
  }, []);

  const update = (id: string, patch: Partial<Item>) => setItems((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  function removeItem(id: string) {
    setItems((list) => {
      const it = list.find((i) => i.id === id);
      if (it) {
        URL.revokeObjectURL(it.url);
        urls.current.delete(it.url);
      }
      return list.filter((i) => i.id !== id);
    });
  }

  /** Quita de la lista las ya subidas y las que no se pueden subir (y libera sus miniaturas). */
  function clearDone() {
    setItems((list) => {
      for (const i of list) {
        if (i.status === 'subida' || i.status === 'invalida') {
          URL.revokeObjectURL(i.url);
          urls.current.delete(i.url);
        }
      }
      return list.filter((i) => i.status !== 'subida' && i.status !== 'invalida');
    });
    setStatus(null);
  }

  async function addFiles(files: FileList | File[]) {
    setStatus(null);
    const incoming = [...files];
    const skipped: string[] = [];
    const room = MAX_BATCH - items.filter((i) => i.status !== 'subida').length;
    const accepted: Item[] = [];
    for (const file of incoming) {
      const dup = items.some((i) => i.file.name === file.name && i.file.size === file.size && i.status !== 'subida');
      if (dup) {
        skipped.push(`${file.name}: ya está en la lista.`);
        continue;
      }
      if (accepted.length >= room) {
        skipped.push(`${file.name}: máximo ${MAX_BATCH} imágenes por tanda.`);
        continue;
      }
      const url = URL.createObjectURL(file);
      urls.current.add(url);
      const item: Item = { id: crypto.randomUUID(), file, url, alt: '', status: 'lista' };
      if (!ACCEPTED.includes(file.type)) Object.assign(item, { status: 'invalida', previewable: false, message: 'Formato no admitido: solo JPG, PNG o WebP.' });
      else if (file.size > MAX_BYTES) Object.assign(item, { status: 'invalida', message: `Pesa ${mb(file.size)}: el máximo es 10 MB.` });
      accepted.push(item);
    }
    if (skipped.length) setStatus({ kind: 'info', message: 'Algunos archivos no se agregaron.', details: skipped });
    if (!accepted.length) return;
    setItems((list) => [...list.filter((i) => i.status !== 'subida'), ...accepted]);
    // Dimensiones (asíncrono): si el navegador no puede leerla, tampoco es una imagen válida.
    for (const it of accepted) {
      if (it.status !== 'lista') continue;
      const size = await readSize(it.url);
      if (!size) update(it.id, { status: 'invalida', previewable: false, message: 'No se pudo leer la imagen (archivo dañado o no es una imagen).' });
      else if (size.w < MIN_W || size.h < MIN_H) {
        update(it.id, { status: 'invalida', message: `Mide ${size.w} × ${size.h} px: el mínimo es ${MIN_W} × ${MIN_H}.` });
      }
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (busy) return;
    if (e.dataTransfer.files.length) void addFiles(e.dataTransfer.files);
  }

  const ready = items.filter((i) => i.status === 'lista' || i.status === 'error');

  function askConfirm(e: FormEvent) {
    e.preventDefault();
    if (!ready.length) return setStatus({ kind: 'error', message: 'No hay imágenes listas para subir.' });
    const missing = ready.filter((i) => i.alt.trim().length < ALT_MIN);
    if (missing.length) {
      return setStatus({
        kind: 'error',
        message: `Falta la descripción (mínimo ${ALT_MIN} caracteres) de ${missing.length === 1 ? '1 imagen' : `${missing.length} imágenes`}.`,
        details: missing.map((i) => i.file.name),
      });
    }
    setStatus(null);
    dialogRef.current?.showModal();
  }

  async function uploadAll() {
    dialogRef.current?.close();
    setBusy(true);
    let ok = 0;
    let failed = 0;
    // De a una: la API procesa de a una imagen y limita las subidas por minuto.
    for (const it of ready) {
      update(it.id, { status: 'subiendo', message: undefined });
      const form = new FormData();
      form.append('file', it.file);
      form.append('alt', it.alt.trim());
      try {
        await adminFetch('/admin/media', { method: 'POST', body: form, signal: AbortSignal.timeout(120_000) });
        update(it.id, { status: 'subida' });
        ok += 1;
      } catch (err) {
        failed += 1;
        const message = err instanceof AdminApiError ? err.message : 'Error inesperado.';
        update(it.id, { status: 'error', message });
        // Límite de peticiones: no tiene sentido seguir; las demás quedan listas para reintentar.
        if (err instanceof AdminApiError && (err.status === 429 || err.status === 401)) break;
      }
    }
    if (ok) refreshMediaLibrary();
    const pending = ready.length - ok - failed;
    setStatus(
      failed || pending
        ? { kind: 'error', message: `Se subieron ${ok} de ${ready.length}. Revisa las marcadas con error y vuelve a intentar.` }
        : { kind: 'ok', message: `${ok === 1 ? 'Se subió 1 imagen' : `Se subieron ${ok} imágenes`}. Ya puedes elegirlas en Contenidos.` },
    );
    setBusy(false);
  }

  const totalBytes = ready.reduce((s, i) => s + i.file.size, 0);

  return (
    <Panel title="Subir imágenes">
      <form onSubmit={askConfirm} className="space-y-4" aria-label="Subir imágenes">
        <div
          data-testid="dropzone"
          onDragEnter={(e) => (e.preventDefault(), setDragging(true))}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => e.currentTarget.contains(e.relatedTarget as Node) || setDragging(false)}
          onDrop={onDrop}
          className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${dragging ? 'border-primary bg-background' : 'border-border'}`}
        >
          <p className="font-semibold">Arrastra aquí las imágenes</p>
          <p className="my-2 text-sm text-text-secondary">o</p>
          <label htmlFor="media-files" className="btn-secondary cursor-pointer">Elegir imágenes</label>
          <input
            id="media-files"
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED.join(',')}
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              if (e.target.files?.length) void addFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <p className="mt-3 text-xs text-text-secondary">
            JPG, PNG o WebP · hasta 10 MB cada una · mínimo {MIN_W} × {MIN_H} px · hasta {MAX_BATCH} por tanda.
            Se recortan a formato horizontal (16:9) y se les quitan los datos ocultos (GPS, cámara).
          </p>
        </div>

        {items.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Imágenes para subir">
            {items.map((it) => {
              const altId = `alt-new-${it.id}`;
              const editable = (it.status === 'lista' || it.status === 'error') && !busy;
              return (
                <li key={it.id} className="space-y-2 rounded-md border border-border p-3" data-status={it.status}>
                  {it.previewable === false ? (
                    <div className="flex aspect-[16/9] w-full items-center justify-center rounded bg-background text-sm text-text-secondary">
                      Sin vista previa
                    </div>
                  ) : (
                    <img src={it.url} alt={`Miniatura de ${it.file.name}`} className="aspect-[16/9] w-full rounded bg-background object-cover" />
                  )}
                  <p className="truncate text-sm font-semibold" title={it.file.name}>{it.file.name} <span className="font-normal text-text-secondary">· {mb(it.file.size)}</span></p>
                  <p className={`text-sm ${it.status === 'invalida' || it.status === 'error' ? 'text-error' : it.status === 'subida' ? 'text-success' : ''}`} role={it.status === 'error' ? 'alert' : undefined}>
                    <span aria-hidden="true">{it.status === 'subida' ? '✓ ' : it.status === 'invalida' || it.status === 'error' ? '⚠ ' : ''}</span>
                    {STATUS_TEXT[it.status]}{it.message ? `: ${it.message}` : ''}
                  </p>
                  {it.status !== 'invalida' && it.status !== 'subida' && (
                    <div>
                      <label htmlFor={altId} className="label">Descripción de {it.file.name}</label>
                      <input id={altId} className="field" value={it.alt} minLength={ALT_MIN} maxLength={ALT_MAX} disabled={!editable}
                        placeholder="Ej.: Casa con piscina y jardín" onChange={(e) => update(it.id, { alt: e.target.value })} />
                    </div>
                  )}
                  {it.status !== 'subiendo' && (
                    <button type="button" className="btn-secondary" disabled={busy} onClick={() => removeItem(it.id)}>
                      {it.status === 'subida' ? 'Quitar de la lista' : 'Quitar'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <p className="text-xs text-text-secondary">
          La descripción de cada imagen la leen los lectores de pantalla y Google: describe lo que se ve, sin datos personales.
        </p>
        <div className="flex flex-wrap gap-3">
          <button className="btn-primary" disabled={busy || ready.length === 0}>
            {busy ? 'Subiendo…' : ready.length === 0 ? 'Subir imágenes' : ready.length === 1 ? 'Subir 1 imagen' : `Subir ${ready.length} imágenes`}
          </button>
          {items.some((i) => i.status === 'subida' || i.status === 'invalida') && (
            <button type="button" className="btn-secondary" disabled={busy} onClick={clearDone}>
              Limpiar lista (subidas y no válidas)
            </button>
          )}
        </div>
        <div aria-live="polite">{status && <Alert {...status} />}</div>
      </form>

      <dialog ref={dialogRef} aria-labelledby={dialogTitle} className="m-auto max-w-lg rounded-lg border border-border bg-surface p-6 text-text-primary backdrop:bg-black/50">
        <h2 id={dialogTitle} className="text-lg font-bold">
          ¿Subir {ready.length === 1 ? '1 imagen' : `${ready.length} imágenes`}?
        </h2>
        <p className="mt-2 text-sm">
          Total: {mb(totalBytes)}. Las imágenes quedan <strong>públicas</strong> (como toda la web) y disponibles para elegir en Contenidos.
          Revisa que no muestren datos privados (documentos, matrículas, personas sin autorización).
        </p>
        <ul className="mt-3 grid grid-cols-4 gap-2" aria-label="Imágenes a subir">
          {ready.map((i) => (
            <li key={i.id}><img src={i.url} alt={i.alt} className="aspect-[16/9] w-full rounded object-cover" /></li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" className="btn-primary" onClick={() => void uploadAll()}>Sí, subir</button>
          <button type="button" className="btn-secondary" onClick={() => dialogRef.current?.close()}>Cancelar</button>
        </div>
      </dialog>
    </Panel>
  );
}

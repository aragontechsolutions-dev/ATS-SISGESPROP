import { useState, type FormEvent } from 'react';
import { BulkUpload } from '../BulkUpload';
import { adminJson, send } from '../http';
import { refreshMediaLibrary, useMediaLibrary, type MediaItem } from '../media';
import { Alert, errorStatus, PageTitle, Panel, type Status } from '../ui';

/** Mismas reglas que la API (MediaAltDto): el servidor vuelve a validar. */
const ALT_MIN = 5;
const ALT_MAX = 150;

/**
 * Imágenes subidas (Etapa D4, ADR-020). La API valida el archivo por su contenido, lo redibuja en
 * WebP (5 tamaños) y elimina los metadatos (GPS, cámara). Aquí solo se hacen comprobaciones
 * rápidas para avisar antes de enviar.
 */
export function MediaPage() {
  const { lib, error } = useMediaLibrary();
  return (
    <>
      <PageTitle hint="Las imágenes se recortan a formato horizontal (16:9) y se les quitan los datos ocultos (ubicación GPS, cámara). Después se eligen en Contenidos.">
        Imágenes
      </PageTitle>
      {error !== null && <Alert {...errorStatus(error)!} />}
      {lib && !lib.uploadEnabled && (
        <Alert kind="info" message="La subida de imágenes todavía no está activada."
          details={['Falta configurar la clave secreta de Supabase Storage en el servidor (ver docs/despliegue.md, sección Imágenes).']} />
      )}
      {lib?.uploadEnabled && <BulkUpload />}
      <Panel title={`Imágenes subidas (${lib?.items.length ?? 0})`}>
        {!lib && !error && <p>Cargando…</p>}
        {lib && lib.items.length === 0 && <p className="text-sm text-text-secondary">Todavía no hay imágenes subidas. La web usa las imágenes incluidas.</p>}
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="Imágenes subidas">
          {lib?.items.map((item) => <MediaCard key={item.id} item={item} canDelete={lib.uploadEnabled} />)}
        </ul>
      </Panel>
    </>
  );
}

function MediaCard({ item, canDelete }: { item: MediaItem; canDelete: boolean }) {
  const [alt, setAlt] = useState(item.alt);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const altId = `alt-${item.id}`;

  async function saveAlt(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await adminJson(`/admin/media/${item.id}`, send('PATCH', { alt: alt.trim() }));
      setStatus({ kind: 'ok', message: 'Descripción guardada.' });
      refreshMediaLibrary();
    } catch (err) {
      setStatus(errorStatus(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await adminJson(`/admin/media/${item.id}`, send('DELETE'));
      refreshMediaLibrary();
    } catch (err) {
      setStatus(errorStatus(err));
      setConfirming(false);
      setBusy(false);
    }
  }

  return (
    <li className="space-y-3 rounded-md border border-border p-3">
      <img src={item.thumbnailUrl} alt={item.alt} width={480} height={262} loading="lazy" className="aspect-[16/9] w-full rounded object-cover" />
      <form onSubmit={(e) => void saveAlt(e)} className="space-y-2" aria-label={`Descripción de ${item.alt}`}>
        <label htmlFor={altId} className="label">Descripción</label>
        <input id={altId} className="field" value={alt} minLength={ALT_MIN} maxLength={ALT_MAX} required onChange={(e) => setAlt(e.target.value)} />
        <button className="btn-secondary" disabled={busy || alt.trim() === item.alt}>Guardar descripción</button>
      </form>
      {canDelete && (
        <div className="flex flex-wrap gap-2">
          {!confirming ? (
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => setConfirming(true)}>Borrar…</button>
          ) : (
            <>
              <button type="button" className="btn-primary" disabled={busy} onClick={() => void remove()}>Confirmar borrado</button>
              <button type="button" className="btn-secondary" disabled={busy} onClick={() => setConfirming(false)}>Cancelar</button>
            </>
          )}
        </div>
      )}
      {status && <Alert {...status} />}
    </li>
  );
}

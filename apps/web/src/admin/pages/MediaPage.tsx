import { useRef, useState, type FormEvent } from 'react';
import { adminFetch, adminJson, send } from '../http';
import { refreshMediaLibrary, useMediaLibrary, type MediaItem } from '../media';
import { Alert, errorStatus, PageTitle, Panel, type Status } from '../ui';

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
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
      {lib?.uploadEnabled && <UploadForm />}
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

function UploadForm() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return setStatus({ kind: 'error', message: 'Elige una imagen.' });
    if (!ACCEPTED.includes(file.type)) return setStatus({ kind: 'error', message: 'Formato no admitido: solo JPG, PNG o WebP.' });
    if (file.size > MAX_BYTES) return setStatus({ kind: 'error', message: 'La imagen supera los 10 MB.' });
    if (alt.trim().length < ALT_MIN) return setStatus({ kind: 'error', message: `Describe la imagen (mínimo ${ALT_MIN} caracteres).` });
    const form = new FormData();
    form.append('file', file);
    form.append('alt', alt.trim());
    setBusy(true);
    setStatus({ kind: 'info', message: 'Subiendo y procesando la imagen…' });
    try {
      // Procesar fotos grandes puede tardar: margen mayor que el de las demás operaciones.
      await adminFetch('/admin/media', { method: 'POST', body: form, signal: AbortSignal.timeout(120_000) });
      setStatus({ kind: 'ok', message: 'Imagen subida. Ya puedes elegirla en Contenidos.' });
      setAlt('');
      if (fileRef.current) fileRef.current.value = '';
      refreshMediaLibrary();
    } catch (err) {
      setStatus(errorStatus(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Subir imagen">
      <form onSubmit={(e) => void submit(e)} className="space-y-4" aria-label="Subir imagen">
        <div>
          <label htmlFor="media-file" className="label">Archivo (JPG, PNG o WebP; hasta 10 MB; mínimo 960 × 540 px)</label>
          <input id="media-file" ref={fileRef} type="file" accept={ACCEPTED.join(',')} className="field" required />
        </div>
        <div>
          <label htmlFor="media-alt" className="label">Descripción de la imagen (texto alternativo)</label>
          <input id="media-alt" className="field" value={alt} minLength={ALT_MIN} maxLength={ALT_MAX} required
            placeholder="Ej.: Casa con piscina y jardín en Punta del Este" onChange={(e) => setAlt(e.target.value)} />
          <p className="mt-1 text-xs text-text-secondary">La leen los lectores de pantalla y Google. Describe lo que se ve, sin datos personales.</p>
        </div>
        <button className="btn-primary" disabled={busy}>{busy ? 'Subiendo…' : 'Subir imagen'}</button>
        {status && <Alert {...status} />}
      </form>
    </Panel>
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

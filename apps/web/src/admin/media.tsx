import { useEffect, useState } from 'react';
import { IMAGE_ALT, IMAGE_KEYS, isImageKey, MEDIA_KEY_RE } from '../images';
import { adminJson } from './http';

/** Imagen subida (GET /admin/media). */
export interface MediaItem {
  id: string;
  key: string;
  alt: string;
  width: number;
  height: number;
  createdAt: string;
  thumbnailUrl: string;
}

export interface MediaLibrary {
  uploadEnabled: boolean;
  items: MediaItem[];
}

/**
 * Biblioteca de imágenes subidas compartida por la página "Imágenes" y los selectores de
 * Contenidos: se carga una vez y se vuelve a pedir tras subir, editar o borrar.
 */
let cache: Promise<MediaLibrary> | null = null;
const listeners = new Set<() => void>();

function load(): Promise<MediaLibrary> {
  cache ??= adminJson<MediaLibrary>('/admin/media').catch((e: unknown) => {
    cache = null;
    throw e;
  });
  return cache;
}

export function refreshMediaLibrary(): void {
  cache = null;
  for (const l of listeners) l();
}

export function useMediaLibrary() {
  const [lib, setLib] = useState<MediaLibrary | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const l = () => setVersion((v) => v + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  useEffect(() => {
    let alive = true;
    load().then(
      (d) => alive && (setLib(d), setError(null)),
      (e: unknown) => alive && setError(e),
    );
    return () => {
      alive = false;
    };
  }, [version]);
  return { lib, error };
}

/** URL de la miniatura de una imagen elegida (fija o subida), o null. */
function previewUrl(value: string, items: MediaItem[]): { src: string; alt: string } | null {
  if (isImageKey(value)) return { src: `/img/${value}-480.webp`, alt: IMAGE_ALT[value] };
  const m = MEDIA_KEY_RE.exec(value);
  const item = m ? items.find((i) => i.id === m[1]) : undefined;
  return item ? { src: item.thumbnailUrl, alt: item.alt } : null;
}

/** Selector de imagen para Contenidos: fijas de la web + subidas, con vista previa. */
export function ImageSelect({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  const { lib } = useMediaLibrary();
  const items = lib?.items ?? [];
  const known = value === 'ninguna' || isImageKey(value) || items.some((i) => i.key === value);
  const preview = previewUrl(value, items);
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <select id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="ninguna">Sin imagen</option>
        {!known && <option value={value}>{lib ? 'Imagen no encontrada (elige otra)' : 'Imagen subida (cargando…)'}</option>}
        {items.length > 0 && (
          <optgroup label="Imágenes subidas">
            {items.map((i) => <option key={i.id} value={i.key}>{i.alt}</option>)}
          </optgroup>
        )}
        <optgroup label="Imágenes de la web">
          {IMAGE_KEYS.map((k) => <option key={k} value={k}>{IMAGE_ALT[k]}</option>)}
        </optgroup>
      </select>
      {preview && (
        <img src={preview.src} alt={`Vista previa: ${preview.alt}`} width={240} height={131}
          className="mt-2 aspect-[16/9] w-60 rounded-md border border-border object-cover" loading="lazy" />
      )}
    </div>
  );
}

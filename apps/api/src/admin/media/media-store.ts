import { Logger } from '@nestjs/common';

/**
 * Almacenamiento de las imágenes procesadas (Etapa D4, ADR-020).
 *
 * Producción: Supabase Storage, bucket PÚBLICO de solo lectura. Solo la API escribe, con la clave
 * secreta del proyecto (nunca llega al navegador). No se crean políticas de escritura para
 * usuarios anónimos ni autenticados: sin política, Storage rechaza cualquier escritura que no use
 * la clave secreta.
 *
 * Endpoints (los mismos que usa el cliente oficial @supabase/storage-js 2.118):
 *  - subir:  POST   {SUPABASE_URL}/storage/v1/object/{bucket}/{ruta}  (x-upsert: false)
 *  - borrar: DELETE {SUPABASE_URL}/storage/v1/object/{bucket}  { "prefixes": [rutas] }
 *  - leer:   GET    {SUPABASE_URL}/storage/v1/object/public/{bucket}/{ruta}
 * Autenticación: cabeceras `apikey` y `Authorization: Bearer` con la clave (como supabase-js).
 */
export const MEDIA_STORE = Symbol('MEDIA_STORE');

export interface MediaStore {
  /** false: falta configurar SUPABASE_SECRET_KEY; la subida responde 503. */
  readonly enabled: boolean;
  /** Prefijo público de lectura (termina en "/"). */
  readonly publicBaseUrl: string;
  put(path: string, data: Buffer, contentType: string): Promise<void>;
  remove(paths: string[]): Promise<void>;
}

export class MediaStoreError extends Error {}

const TIMEOUT_MS = 20_000;
/** Las rutas llevan un UUID nuevo por imagen: el contenido nunca cambia, se puede cachear 1 año. */
const CACHE_SECONDS = 31_536_000;
const SAFE_PATH = /^[0-9a-f-]{36}\/[a-z0-9-]{1,20}\.webp$/;

export class SupabaseMediaStore implements MediaStore {
  readonly enabled = true;
  readonly publicBaseUrl: string;
  private readonly objectUrl: string;
  private readonly logger = new Logger('MediaStore');

  constructor(
    supabaseUrl: string,
    private readonly bucket: string,
    private readonly secretKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.objectUrl = `${supabaseUrl}/storage/v1/object`;
    this.publicBaseUrl = `${this.objectUrl}/public/${bucket}/`;
  }

  private headers(extra: Record<string, string>): Record<string, string> {
    return { apikey: this.secretKey, Authorization: `Bearer ${this.secretKey}`, ...extra };
  }

  async put(path: string, data: Buffer, contentType: string): Promise<void> {
    if (!SAFE_PATH.test(path)) throw new MediaStoreError('Ruta de imagen inválida');
    const res = await this.fetchImpl(`${this.objectUrl}/${this.bucket}/${path}`, {
      method: 'POST',
      headers: this.headers({ 'content-type': contentType, 'cache-control': `max-age=${CACHE_SECONDS}`, 'x-upsert': 'false' }),
      body: new Uint8Array(data),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      // Nunca se registra la clave ni el cuerpo completo: solo el estado.
      this.logger.error(`Storage respondió HTTP ${res.status} al subir una imagen`);
      throw new MediaStoreError(`Storage HTTP ${res.status}`);
    }
  }

  async remove(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    if (!paths.every((p) => SAFE_PATH.test(p))) throw new MediaStoreError('Ruta de imagen inválida');
    const res = await this.fetchImpl(`${this.objectUrl}/${this.bucket}`, {
      method: 'DELETE',
      headers: this.headers({ 'content-type': 'application/json' }),
      body: JSON.stringify({ prefixes: paths }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      this.logger.error(`Storage respondió HTTP ${res.status} al borrar imágenes`);
      throw new MediaStoreError(`Storage HTTP ${res.status}`);
    }
  }
}

/** Sin SUPABASE_SECRET_KEY: el panel muestra las imágenes existentes pero no permite subir. */
export class DisabledMediaStore implements MediaStore {
  readonly enabled = false;
  constructor(readonly publicBaseUrl: string) {}
  put(): Promise<void> {
    return Promise.reject(new MediaStoreError('Almacenamiento no configurado'));
  }
  remove(): Promise<void> {
    return Promise.reject(new MediaStoreError('Almacenamiento no configurado'));
  }
}

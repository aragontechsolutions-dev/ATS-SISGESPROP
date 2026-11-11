import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {
  TEST_ADMIN_ID,
  TEST_DATABASE_URL,
  createApp,
  createKeys,
  insertAdmin,
  memoryStore,
  recordingDeploy,
  resetData,
  signToken,
  testConfig,
} from './helpers.ts';
import { ImageRejectedError, OUTPUT_NAMES, detectFormat, processImage } from '../src/admin/media/image-processing.ts';
import { SupabaseMediaStore } from '../src/admin/media/media-store.ts';
import { loadConfig } from '../src/config/app-config.ts';

/** Etapa D4: subida de imágenes del panel (ADR-020). */

/** Foto de prueba: degradado con ruido (no comprime a nada) y EXIF con GPS y cámara. */
async function photo(width = 2000, height = 1500, format: 'jpeg' | 'png' | 'webp' = 'jpeg', orientation?: number) {
  const channels = 3;
  const raw = Buffer.alloc(width * height * channels);
  for (let i = 0; i < raw.length; i++) raw[i] = (i * 7 + ((i / width) | 0)) % 251;
  let img = sharp(raw, { raw: { width, height, channels } }).withMetadata({
    ...(orientation ? { orientation } : {}),
    exif: {
      IFD0: { Make: 'CamaraSecreta', Model: 'Modelo-X', Copyright: 'Dueño' },
      IFD3: { GPSLatitudeRef: 'S', GPSLatitude: '34/1 57/1 38/1', GPSLongitudeRef: 'W', GPSLongitude: '54/1 56/1 56/1' },
    },
  });
  img = format === 'jpeg' ? img.jpeg({ quality: 90 }) : format === 'png' ? img.png() : img.webp();
  return img.toBuffer();
}

describe('procesamiento de imágenes', () => {
  it('detecta el formato por la firma binaria, no por el nombre', async () => {
    assert.equal(detectFormat(await photo(1000, 600, 'jpeg')), 'jpeg');
    assert.equal(detectFormat(await photo(1000, 600, 'png')), 'png');
    assert.equal(detectFormat(await photo(1000, 600, 'webp')), 'webp');
    assert.equal(detectFormat(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')), null);
    assert.equal(detectFormat(Buffer.from('GIF89a')), null);
  });

  it('genera los 5 WebP (480/768/1408 y portada 768/1408) en 16:9 aprox. y SIN metadatos (GPS, cámara)', async () => {
    const input = await photo();
    // La entrada sí tiene EXIF: la prueba tiene sentido.
    assert.ok((await sharp(input).metadata()).exif, 'la foto de prueba debe traer EXIF');
    const out = await processImage(input);
    assert.deepEqual(out.files.map((f) => f.name), OUTPUT_NAMES);
    const expected: Record<string, [number, number]> = {
      '480.webp': [480, 262], '768.webp': [768, 419], '1408.webp': [1408, 768],
      'hero-768.webp': [768, 419], 'hero-1408.webp': [1408, 768],
    };
    for (const f of out.files) {
      const m = await sharp(f.data).metadata();
      assert.equal(m.format, 'webp', f.name);
      assert.deepEqual([m.width, m.height], expected[f.name], f.name);
      assert.equal(m.exif, undefined, `${f.name}: no debe tener EXIF`);
      assert.equal(m.xmp, undefined, `${f.name}: no debe tener XMP`);
      assert.equal(m.icc, undefined, `${f.name}: no debe tener perfil ICC`);
      assert.ok(!f.data.includes(Buffer.from('CamaraSecreta')), `${f.name}: no debe contener datos de la cámara`);
    }
    // La portada va más comprimida.
    const size = (n: string) => out.files.find((f) => f.name === n)!.data.length;
    assert.ok(size('hero-1408.webp') < size('1408.webp'));
  });

  it('respeta la orientación EXIF (foto de celular vertical girada)', async () => {
    // 1500 × 2000 guardada "acostada" con orientación 6: visible es vertical.
    const out = await processImage(await photo(2000, 1500, 'jpeg', 6));
    const m = await sharp(out.files[2]!.data).metadata();
    assert.deepEqual([m.width, m.height], [1408, 768]);
    assert.equal(m.orientation, undefined);
  });

  it('acepta PNG y WebP', async () => {
    assert.equal((await processImage(await photo(1200, 800, 'png'))).files.length, 5);
    assert.equal((await processImage(await photo(1200, 800, 'webp'))).files.length, 5);
  });

  it('rechaza archivos que no son imágenes admitidas, aunque se llamen .jpg', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="2000"><script>alert(1)</script></svg>');
    const tiff = await sharp({ create: { width: 1200, height: 800, channels: 3, background: '#fff' } }).tiff().toBuffer();
    const gif = await sharp({ create: { width: 1200, height: 800, channels: 3, background: '#fff' } }).gif().toBuffer();
    for (const [name, buf] of [['svg', svg], ['tiff', tiff], ['gif', gif], ['texto', Buffer.from('hola mundo, no soy una imagen')], ['vacío', Buffer.alloc(0)]] as const) {
      await assert.rejects(processImage(buf), ImageRejectedError, name);
    }
  });

  it('libvips tiene bloqueados los lectores que no son JPEG/PNG/WebP (defensa si fallara la firma)', async () => {
    await import('../src/admin/media/image-processing.ts');
    const tiff = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#fff' } }).tiff().toBuffer();
    await assert.rejects(sharp(tiff).metadata(), /blocked|not permitted|unsupported/i);
    await assert.rejects(sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>')).metadata());
  });

  it('rechaza un JPEG con contenido dañado o que no coincide con su firma', async () => {
    const fake = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.from('basura que no es un jpeg')]);
    await assert.rejects(processImage(fake), ImageRejectedError);
  });

  it('rechaza imágenes muy chicas (mínimo 960 × 540)', async () => {
    await assert.rejects(processImage(await photo(800, 600)), /muy chica/);
    await assert.rejects(processImage(await photo(1200, 500)), /muy chica/);
  });

  it('rechaza imágenes de más de 40 MP sin decodificarlas completas (bomba de descompresión)', async () => {
    // 8000 × 6000 = 48 MP; PNG de un solo color pesa muy poco pero se expandiría a ~190 MB.
    const bomb = await sharp({ create: { width: 8000, height: 6000, channels: 3, background: '#0a0' } }).png().toBuffer();
    assert.ok(bomb.length < 1_000_000);
    await assert.rejects(processImage(bomb), ImageRejectedError);
  });
});

describe('cliente de Supabase Storage', () => {
  // Clave FALSA armada en tiempo de ejecución: así el texto del archivo no tiene forma de clave y
  // no dispara la protección de secretos de GitHub (que no se debe desactivar).
  const KEY = ['sb', 'secret', 'TEST', 'ONLY', 'not', 'a', 'real', 'key', '123456'].join('_');
  const ID = '0b6b8f9e-6a1e-4c55-9a43-2d1e8f7c6b5a';

  it('sube con POST, x-upsert false, caché larga y la clave en apikey + Bearer', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const store = new SupabaseMediaStore('https://abc.supabase.co', 'privat-media', KEY, (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response('{}', { status: 200 });
    }) as typeof fetch);
    await store.put(`${ID}/768.webp`, Buffer.from('x'), 'image/webp');
    assert.equal(calls[0]!.url, `https://abc.supabase.co/storage/v1/object/privat-media/${ID}/768.webp`);
    assert.equal(calls[0]!.init.method, 'POST');
    const h = calls[0]!.init.headers as Record<string, string>;
    assert.equal(h.apikey, KEY);
    assert.equal(h.Authorization, `Bearer ${KEY}`);
    assert.equal(h['x-upsert'], 'false');
    assert.equal(h['content-type'], 'image/webp');
    assert.equal(h['cache-control'], 'max-age=31536000');
    assert.equal(store.publicBaseUrl, 'https://abc.supabase.co/storage/v1/object/public/privat-media/');
  });

  it('borra con DELETE y { prefixes }', async () => {
    let body = '';
    const store = new SupabaseMediaStore('https://abc.supabase.co', 'privat-media', KEY, (async (url: string, init: RequestInit) => {
      assert.equal(url, 'https://abc.supabase.co/storage/v1/object/privat-media');
      assert.equal(init.method, 'DELETE');
      body = String(init.body);
      return new Response('[]', { status: 200 });
    }) as typeof fetch);
    await store.remove([`${ID}/480.webp`]);
    assert.deepEqual(JSON.parse(body), { prefixes: [`${ID}/480.webp`] });
  });

  it('rechaza rutas fuera del formato <uuid>/<nombre>.webp (sin ../ ni otros archivos)', async () => {
    const store = new SupabaseMediaStore('https://abc.supabase.co', 'privat-media', KEY, (async () => {
      throw new Error('no debe llamar');
    }) as unknown as typeof fetch);
    for (const p of ['../otro/archivo.webp', `${ID}/x.svg`, `${ID}/../../a.webp`, 'a.webp']) {
      await assert.rejects(store.put(p, Buffer.from('x'), 'image/webp'), /inválida/, p);
    }
  });

  it('un error de Storage no expone la clave', async () => {
    const store = new SupabaseMediaStore('https://abc.supabase.co', 'privat-media', KEY, (async () =>
      new Response('denied', { status: 403 })) as unknown as typeof fetch);
    await assert.rejects(store.put(`${ID}/480.webp`, Buffer.from('x'), 'image/webp'), (e: Error) => {
      assert.ok(!e.message.includes(KEY));
      return true;
    });
  });
});

describe('configuración de la clave de Storage', () => {
  const base = {
    NODE_ENV: 'test', DATABASE_URL: 'postgresql://u:p@localhost/db', SUPABASE_URL: 'https://abc.supabase.co',
    CORS_ORIGINS: 'http://localhost:5173', IP_HASH_SECRET: 'x'.repeat(32), TURNSTILE_SECRET_KEY: 't',
  };
  it('sin clave: subida deshabilitada (la API arranca igual)', () => {
    assert.deepEqual(loadConfig(base).media, { bucket: 'privat-media', secretKey: null });
  });
  it('acepta sb_secret_ y rechaza la clave pública sin mostrar su valor', () => {
    // Claves FALSAS armadas en tiempo de ejecución (ver nota en el cliente de Storage).
    const secret = ['sb', 'secret', 'abcdefghij123'].join('_');
    const publishable = ['sb', 'publishable', 'abcdefghij123'].join('_');
    assert.equal(loadConfig({ ...base, SUPABASE_SECRET_KEY: secret }).media.secretKey, secret);
    assert.throws(() => loadConfig({ ...base, SUPABASE_SECRET_KEY: publishable }), (e: Error) => {
      assert.match(e.message, /PÚBLICA/);
      assert.ok(!e.message.includes('abcdefghij123'));
      return true;
    });
    assert.throws(() => loadConfig({ ...base, SUPABASE_SECRET_KEY: 'cualquier-cosa' }), /formato/);
    assert.throws(() => loadConfig({ ...base, SUPABASE_SECRET_KEY: `"${secret}"` }), /comillas/);
    assert.throws(() => loadConfig({ ...base, MEDIA_BUCKET: '../x' }), /MEDIA_BUCKET/);
  });
});

const skip = !TEST_DATABASE_URL ? 'TEST_DATABASE_URL no definida' : false;
let ipCounter = 0;
const nextIp = () => `198.51.100.${(ipCounter++ % 250) + 1}`;

describe('API de imágenes del panel', { skip }, () => {
  let ctx: Awaited<ReturnType<typeof createApp>>;
  let keys: Awaited<ReturnType<typeof createKeys>>;
  const store = memoryStore();
  let token = '';
  let jpeg: Buffer;

  function upload(file: Buffer | null, alt: string | null, auth: string | null = token, name = 'foto.jpg') {
    const form = new FormData();
    if (file) form.append('file', new Blob([new Uint8Array(file)], { type: 'image/jpeg' }), name);
    if (alt !== null) form.append('alt', alt);
    const headers: Record<string, string> = { 'x-forwarded-for': nextIp() };
    if (auth) headers.authorization = `Bearer ${auth}`;
    return fetch(`${ctx.baseUrl}/admin/media`, { method: 'POST', headers, body: form });
  }
  function call(method: string, path: string, body?: unknown, auth: string | null = token) {
    const headers: Record<string, string> = { 'x-forwarded-for': nextIp() };
    if (auth) headers.authorization = `Bearer ${auth}`;
    if (body !== undefined) headers['content-type'] = 'application/json';
    return fetch(`${ctx.baseUrl}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  }

  before(async () => {
    keys = await createKeys();
    jpeg = await photo();
    ctx = await createApp(keys.verifier, testConfig({ trustProxyHops: 1 }), undefined, recordingDeploy(), store);
  });
  after(async () => {
    try {
      await resetData(ctx.prisma);
    } finally {
      await ctx.app.close();
    }
  });
  beforeEach(async () => {
    await resetData(ctx.prisma);
    await insertAdmin(ctx.prisma, TEST_ADMIN_ID);
    token = await signToken(keys.privateKey, { sub: TEST_ADMIN_ID });
    store.files.clear();
    store.failPuts = false;
  });

  it('exige sesión (401) y segundo factor (403)', async () => {
    assert.equal((await call('GET', '/admin/media', undefined, null)).status, 401);
    assert.equal((await upload(jpeg, 'Fachada de la casa', null)).status, 401);
    const aal1 = await signToken(keys.privateKey, { sub: TEST_ADMIN_ID, aal: 'aal1' });
    assert.equal((await call('GET', '/admin/media', undefined, aal1)).status, 403);
    assert.equal((await upload(jpeg, 'Fachada de la casa', aal1)).status, 403);
    assert.equal(store.files.size, 0);
  });

  it('sube, guarda 5 WebP en Storage, registra en la base y en la auditoría', async () => {
    const res = await upload(jpeg, '  Fachada de la casa frente al mar  ');
    assert.equal(res.status, 201, await res.clone().text());
    const body = (await res.json()) as Record<string, any>;
    assert.match(body.id, /^[0-9a-f-]{36}$/);
    assert.equal(body.key, `media:${body.id}`);
    assert.equal(body.alt, 'Fachada de la casa frente al mar');
    assert.equal(body.thumbnailUrl, `${store.publicBaseUrl}${body.id}/480.webp`);
    assert.deepEqual([...store.files.keys()].sort(), OUTPUT_NAMES.map((n) => `${body.id}/${n}`).sort());
    for (const data of store.files.values()) assert.equal((await sharp(data).metadata()).exif, undefined);

    const list = (await (await call('GET', '/admin/media')).json()) as Record<string, any>;
    assert.equal(list.uploadEnabled, true);
    assert.equal(list.items.length, 1);
    const log = await ctx.prisma.auditLog.findFirst({ where: { action: 'media.upload', entityId: body.id } });
    assert.ok(log);
    assert.equal(log.actorId, TEST_ADMIN_ID);
  });

  it('rechaza lo que no es imagen admitida (400) sin tocar Storage', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    const res = await upload(svg, 'Imagen maliciosa', token, 'foto.jpg');
    assert.equal(res.status, 400);
    assert.match(((await res.json()) as { message: string }).message, /Formato no admitido/);
    assert.equal((await upload(null, 'Sin archivo')).status, 400);
    assert.equal(store.files.size, 0);
    assert.equal(await ctx.prisma.mediaAsset.count(), 0);
  });

  it('rechaza archivos de más de 10 MB (413)', async () => {
    const big = Buffer.concat([jpeg, Buffer.alloc(10 * 1024 * 1024)]);
    assert.equal((await upload(big, 'Archivo enorme')).status, 413);
    assert.equal(store.files.size, 0);
  });

  it('el texto alternativo es obligatorio y sin caracteres de control ni < > (400)', async () => {
    for (const alt of [null, '', 'abc', '<img src=x onerror=alert(1)>', 'Fachada\u0000oculta', 'x'.repeat(151)]) {
      assert.equal((await upload(jpeg, alt)).status, 400, String(alt));
    }
    assert.equal(store.files.size, 0);
  });

  it('rechaza campos extra en el formulario', async () => {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(jpeg)], { type: 'image/jpeg' }), 'a.jpg');
    form.append('alt', 'Fachada de la casa');
    form.append('storagePath', '../../otro');
    const res = await fetch(`${ctx.baseUrl}/admin/media`, {
      method: 'POST', headers: { authorization: `Bearer ${token}`, 'x-forwarded-for': nextIp() }, body: form,
    });
    assert.ok([400, 413].includes(res.status), `status ${res.status}`);
    assert.equal(store.files.size, 0);
  });

  it('si Storage falla: 503, sin registro en la base y sin archivos a medias', async () => {
    store.failPuts = true;
    assert.equal((await upload(jpeg, 'Fachada de la casa')).status, 503);
    assert.equal(store.files.size, 0);
    assert.equal(await ctx.prisma.mediaAsset.count(), 0);
  });

  it('edita el texto alternativo (auditado)', async () => {
    const { id } = (await (await upload(jpeg, 'Texto inicial')).json()) as { id: string };
    const res = await call('PATCH', `/admin/media/${id}`, { alt: 'Living con vista al mar' });
    assert.equal(res.status, 200);
    assert.equal(((await res.json()) as { alt: string }).alt, 'Living con vista al mar');
    assert.equal((await call('PATCH', `/admin/media/${id}`, { alt: '<b>x</b> malicioso' })).status, 400);
    assert.equal((await call('PATCH', `/admin/media/${id}`, { alt: 'Otro texto', extra: 1 })).status, 400);
    assert.equal((await call('PATCH', '/admin/media/no-es-uuid', { alt: 'Otro texto' })).status, 400);
    assert.ok(await ctx.prisma.auditLog.findFirst({ where: { action: 'media.alt', entityId: id } }));
  });

  it('no borra una imagen usada en el borrador ni en una publicación (409); si no se usa, la borra de la base y de Storage', async () => {
    const { id } = (await (await upload(jpeg, 'Imagen en uso')).json()) as { id: string };
    await ctx.prisma.contentBlock.create({ data: { section: 'hero', key: 'main', value: { image: `media:${id}` } } });
    assert.equal((await call('DELETE', `/admin/media/${id}`)).status, 409);

    await ctx.prisma.contentBlock.deleteMany();
    await ctx.prisma.publication.create({ data: { snapshot: { content: { hero: { image: `media:${id}` } } }, publishedById: TEST_ADMIN_ID } });
    assert.equal((await call('DELETE', `/admin/media/${id}`)).status, 409);
    assert.equal(store.files.size, 5);

    const { id: free } = (await (await upload(jpeg, 'Imagen sin usar')).json()) as { id: string };
    assert.equal((await call('DELETE', `/admin/media/${free}`)).status, 204);
    assert.equal(await ctx.prisma.mediaAsset.count({ where: { id: free } }), 0);
    assert.ok(![...store.files.keys()].some((k) => k.startsWith(free)));
    assert.ok(await ctx.prisma.auditLog.findFirst({ where: { action: 'media.delete', entityId: free } }));
    assert.equal((await call('DELETE', `/admin/media/${free}`)).status, 404);
  });

  it('sin clave de Storage: lista vacía, subida 503', async () => {
    const off = await createApp(keys.verifier, testConfig({ trustProxyHops: 1 }), undefined, recordingDeploy(), memoryStore(false));
    try {
      const h = { authorization: `Bearer ${token}`, 'x-forwarded-for': nextIp() };
      const list = (await (await fetch(`${off.baseUrl}/admin/media`, { headers: h })).json()) as Record<string, any>;
      assert.equal(list.uploadEnabled, false);
      const form = new FormData();
      form.append('file', new Blob([new Uint8Array(jpeg)], { type: 'image/jpeg' }), 'a.jpg');
      form.append('alt', 'Fachada de la casa');
      assert.equal((await fetch(`${off.baseUrl}/admin/media`, { method: 'POST', headers: h, body: form })).status, 503);
    } finally {
      await off.app.close();
    }
  });
});

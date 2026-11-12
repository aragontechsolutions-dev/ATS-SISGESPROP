# ADR-020: Imágenes subidas desde el panel (Supabase Storage)

**Fecha:** 11/11/2026 · **Estado:** Aceptada · **Etapa:** D4 · **Relacionadas:** ADR-005, ADR-013,
ADR-014, ADR-018

## Contexto

Hasta la Etapa F1, el panel solo podía elegir entre 16 imágenes fijas incluidas en la web
(ADR-018). El cliente quiere usar sus propias fotos. Una subida de archivos es una de las
funcionalidades más riesgosas de una web:

- archivos maliciosos disfrazados de imagen (SVG con scripts, políglotas, TIFF/HEIF con fallas del
  decodificador);
- bombas de descompresión (archivo chico que ocupa gigas al abrirse);
- datos personales ocultos (GPS de la casa del cliente, modelo de la cámara);
- agotar la memoria del servidor (Render gratuito: 512 MB);
- referencias rotas al borrar imágenes en uso.

## Decisión

1. **La imagen pasa por la API, no va directo del navegador a Storage.** El navegador no es
   confiable: solo el servidor puede validar y limpiar el archivo antes de publicarlo.
2. **Validación en capas** (`apps/api/src/admin/media/image-processing.ts`):
   - firma binaria: solo JPEG, PNG o WebP (no se mira el nombre ni el `Content-Type`);
   - libvips con **todos los lectores bloqueados** (`sharp.block`) salvo JPEG, PNG y WebP desde
     memoria: un SVG, TIFF, HEIF o PDF no llega a decodificarse aunque engañara a la firma;
   - 10 MB máximo, 40 megapíxeles máximo, mínimo 960 × 540 px;
   - un archivo y un campo por petición (multer en memoria: nada toca el disco);
   - procesamiento de a una imagen por vez, `sharp` con un hilo y sin caché, y límite de 20 subidas
     por minuto.
3. **La imagen se redibuja desde los píxeles** en 5 WebP nuevos: 480, 768 y 1408 px (calidad 70) y
   portada 768 y 1408 px (calidad 40), recortados a 1408 × 768 con recorte inteligente y orientación
   EXIF aplicada. No se conserva ningún byte del archivo original: **se eliminan EXIF (GPS, cámara),
   XMP, IPTC y perfiles ICC**. Es el mismo formato que las imágenes fijas.
4. **Supabase Storage, bucket público de solo lectura** (`privat-media`):
   - las imágenes de una web son públicas por naturaleza; un bucket público permite cachearlas en
     la CDN de Supabase sin URLs firmadas que venzan (la landing es HTML estático, ADR-014);
   - solo la API escribe, con `SUPABASE_SECRET_KEY`. **No se crean políticas de escritura**: sin
     política, Storage rechaza cualquier escritura que no use la clave secreta;
   - rutas `<uuid>/<tamaño>.webp`, con un UUID nuevo por imagen generado en el servidor (no
     adivinable, sin `../`); caché de 1 año porque el contenido de una ruta nunca cambia;
   - endpoints tomados del cliente oficial `@supabase/storage-js` 2.118 instalado en el proyecto
     (la documentación web de Supabase no estaba accesible desde el entorno de desarrollo).
5. **El contenido referencia `media:<uuid>`**, nunca una URL. La API comprueba que la imagen exista
   al guardar y al publicar. La publicación guarda la carpeta pública y el texto alternativo de cada
   imagen usada (`content.media`): la web no consulta nada aparte y una versión restaurada conserva
   sus imágenes.
6. **La web solo acepta la carpeta exacta del Storage del proyecto** (`VITE_SUPABASE_URL` +
   `/storage/v1/object/public/<bucket>/<uuid>/`). La CSP (`img-src`) de la landing y del panel suma
   solo ese origen.
7. **Texto alternativo obligatorio** (5 a 150 caracteres, sin `<` `>` ni caracteres de control).
8. **No se puede borrar una imagen usada** en el borrador o en **cualquier** publicación (las
   publicaciones se pueden restaurar). Se borra primero de la base y luego de Storage: si Storage
   falla quedan archivos huérfanos (inofensivos), nunca una referencia rota.
9. **Todo se audita** (`media.upload`, `media.alt`, `media.delete`).

## Clave secreta de Supabase: cambio respecto de la postura anterior

Hasta D4 el sistema **no usaba** ninguna clave privilegiada de Supabase (`despliegue.md` decía "en
ningún lado"). Ahora la API necesita una para escribir en Storage.

- **Riesgo:** la clave secreta tiene permisos amplios sobre el proyecto (se salta RLS).
- **Por qué se acepta:** vive solo en Render, el mismo servidor que ya tiene `DATABASE_URL`, que da
  acceso total a la base. Quien comprometa Render ya tiene ese acceso: la exposición adicional es
  pequeña, aunque existe.
- **Mitigaciones:**
  - usar una **clave secreta dedicada** (por ejemplo `render-storage`), revocable sin afectar nada más;
  - nunca se envía al navegador ni se registra en logs; los errores de Storage solo informan el código HTTP;
  - la API rechaza la clave pública (`sb_publishable_…`) y valores entre comillas;
  - es **opcional**: sin ella la API arranca igual y la subida responde 503 (no rompe el despliegue).

## Actualización 12/11/2026: subida masiva en el panel

A pedido del usuario, la pestaña *Imágenes* pasó a admitir carga masiva:
- arrastrar y soltar o elegir varios archivos, **hasta 10 por tanda** (la API acepta 20 subidas por
  minuto y procesa de a una);
- **miniatura** de cada archivo antes de subir;
- **descripción por imagen**, obligatoria (la misma descripción para fotos distintas no sirve para
  accesibilidad ni SEO);
- **confirmación** con miniaturas y peso total;
- **estado por imagen**; las fallidas se pueden reintentar.

Seguridad:
- La API no cambia: lo que se revisa en el navegador (formato, peso, dimensiones, que se pueda
  leer) es solo para avisar antes.
- Las miniaturas son URLs locales `blob:` del archivo elegido: no salen del navegador y se liberan
  al quitarlas o salir.
- Por eso la CSP del **panel** suma `blob:` **solo en `img-src`** (no en scripts ni conexiones);
  la de la landing no cambia.
- Soltar un archivo fuera de la zona no lo abre en la pestaña (se perdería la sesión).
- Ante 429 (límite) o 401 (sesión) la tanda se detiene y las restantes quedan para reintentar.

## Alternativas descartadas

- **Subida directa del navegador con URL firmada de subida:** más simple para el servidor, pero el
  archivo llega a Storage sin validar ni limpiar (GPS, archivos maliciosos).
- **Guardar las imágenes en la base o servirlas desde la API:** la API de Render se duerme (ADR-017):
  la portada tardaría hasta un minuto en cargar.
- **Bucket privado con URLs firmadas de lectura:** las URLs vencen y la landing es estática.
- **Aceptar SVG, GIF o HEIC:** más superficie de ataque sin necesidad para fotos de propiedades.

## Consecuencias

- Pasos manuales en Supabase y Render (ver `despliegue.md`, §7.2). Sin ellos la pestaña "Imágenes"
  muestra que la subida no está activada.
- Las imágenes subidas que no se usan siguen accesibles para quien conozca su URL (UUID no
  adivinable; no se pueden listar sin la clave). No subir imágenes con información privada.
- Nueva dependencia nativa: `sharp` 0.35.5 (binarios precompilados, sin scripts de instalación,
  compatible con `ignore-scripts=true`).

## Verificado

- API: 27 pruebas nuevas (118/118):
  - se elimina el EXIF con GPS y cámara;
  - se respeta la orientación;
  - se rechazan SVG, TIFF, GIF, texto, JPEG dañado, imágenes muy chicas y una bomba de 48 MP;
  - los lectores de libvips quedan bloqueados;
  - URL, cabeceras y rutas del cliente de Storage, y la clave nunca aparece en los errores;
  - configuración: se rechaza la clave pública;
  - rutas: 401/403, 413, texto alternativo, campos extra, fallo de Storage sin archivos a medias,
    borrado bloqueado y auditoría;
  - contenido y publicación.
- e2e del panel con Storage simulado: archivo falso rechazado, subida real, uso en la portada,
  borrado bloqueado y publicación con URL y texto alternativo.
- Landing compilada con una imagen subida: carga desde Storage sin errores de CSP.

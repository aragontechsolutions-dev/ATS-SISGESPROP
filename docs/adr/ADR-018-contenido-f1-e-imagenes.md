# ADR-018 – Etapa F1: secciones nuevas, migración de textos sin pisar ediciones e imágenes por lista cerrada

**Contexto (11/11/2026).** El cliente no aprobó la web y pidió cambios de posicionamiento, una
bitácora, servicios complementarios, una FAQ por categorías e imágenes
([análisis](../analisis-documentos-cliente-2026-11-11.md)). En producción ya hay contenido guardado
(borrador), y Publicar exige que estén todas las secciones.

**Decisión.**
1. **Secciones nuevas** de `content_block`: `complementary`, `bitacora` y `faqsection`.
   - Campos nuevos en `hero`: `complement`, `secondaryCta`, `slogan` e `image`.
   - Todo validado por `content-schema.ts`, con tipos y longitudes, sin JSON libre.
2. **Migración de textos en el seed (idempotente):**
   - inserta las secciones nuevas (`ON CONFLICT DO NOTHING`);
   - reemplaza una sección **solo si sigue exactamente igual** (igualdad `jsonb`) al texto
     provisorio anterior. **Si el administrador la editó, no se toca**;
   - carga la FAQ del cliente (32 preguntas en 7 categorías) **una sola vez**, antes de crear
     `faqsection`: no se duplica en cada despliegue ni reaparece si se borran preguntas.

   Verificado en 3 escenarios: base como producción con una sección editada, seed corrido dos veces,
   e instalación nueva.
3. **Esquema de base** (migración `20261111000000_f1_faq_categoria_lead`, solo agrega columnas):
   `faq.category`, `lead.residence_country` y `lead.property_location`.
4. **Compatibilidad hacia atrás en la web:** una publicación anterior (o una restauración) sin los
   campos nuevos se completa con el contenido de respaldo por sección, así no se rompe la página.
5. **Imágenes:**
   - **Lista cerrada de 16 claves** (`IMAGE_KEYS` en la API y en la web). El panel elige una clave,
     **nunca una URL**: no hay contenido externo, la CSP no cambia y no hay rutas manipulables
     (probado: se rechazan una URL y `../../etc/passwd`).
   - **Formato:** WebP en 480, 768 y 1408 px, sin metadatos (se eliminan EXIF, C2PA e ICC); la
     portada lleva una versión de calidad 40, porque va bajo una capa verde al 85 %.
   - **Codificación con Pillow 12.3.** ImageMagick 6.9 de este entorno **ignora la calidad** al
     escribir WebP (con 30, 70 o 90 salía el mismo archivo).
   - Son **ilustrativas** (al menos una está generada con IA, C2PA de Google): los textos
     alternativos no las presentan como propiedades administradas ni como el equipo de PRIVAT.
6. **Contradicciones C1 a C3 resueltas** (aprobadas por el usuario el 11/11/2026):
   - la bitácora se anuncia como "próximamente";
   - no se promete "tiempo real";
   - fondos: "Los fondos de tu propiedad se manejan separados de nuestros honorarios, con registro y
     rendición de cada movimiento".

**Consecuencias.**
- Una sección editada antes de la Etapa F1 conserva su texto; si le faltan campos nuevos, la web
  usa los de respaldo y el administrador los completa al guardar.
- El nombre del nivel 3 sigue en inglés hasta que el cliente lo defina (C6, Etapa F2).
- **Repositorio:** unos 5 MB de imágenes (80 archivos). Cuando exista D4 (subida desde el panel), la
  lista cerrada se ampliará con las imágenes subidas.

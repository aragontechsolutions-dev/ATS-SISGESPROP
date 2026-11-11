# Análisis de los documentos del cliente – 11/11/2026

Entrega del cliente del 10–11/11/2026: 14 documentos y 16 imágenes. Este análisis **no cambia nada**
de la web ni de los datos. Es la base para decidir el plan (sección 7).

## 1. Qué se recibió

| # | Archivo | ¿Nuevo? | Tema |
|---|---|---|---|
| 1 | Especificacion_identidad_visual…docx | No, idéntico (SHA-256) al del 04/11 | Identidad visual |
| 2 | Estructura_WEB.docx | No, idéntico | Documento Maestro de la web |
| 3 | Informe_expensas_viviendas…pdf | No, idéntico | Estudio de gastos (Etapa 2) |
| 4 | PRIVAT_Estructura_Google_Drive.pdf | No, idéntico | Árbol de carpetas v1.0 |
| 5 | Webs_de_referencia.docx | No, idéntico | Competidores de referencia |
| 6 | **PRIVAT_Analisis_Web_Observaciones_v1.0.pdf** | Sí | **Revisión de privatgp.com por el cliente (09/11)** |
| 7 | **PRIVAT_FAQ_especificacion_web.pdf** | Sí | **Preguntas frecuentes (7 categorías) y especificación del acordeón** |
| 8 | **PRIVAT_Plan_Maestro_v1_1.pdf** | Sí | **Documento rector** (posicionamiento, catálogo, bitácora) |
| 9 | PRIVAT_Actualizacion_Estructura_Drive_v1_1.pdf | Sí | Drive v1.1 y su relación con la bitácora |
| 10 | PRIVAT_Guia_Explicativa_Contrato.pdf | Sí, reemplazado por la 11 | Guía del contrato v1.0 |
| 11 | PRIVAT_Guia_Explicativa_Contrato_v1_1.pdf | Sí | Guía del contrato v1.1 (vigente) |
| 12 | PRIVAT_Modelo_Contrato_Administracion.pdf | Sí, reemplazado por el 13 | Contrato v1.0 |
| 13 | PRIVAT_Modelo_Contrato_Administracion_v1_1.pdf | Sí | Contrato modular v1.1 (vigente; dice "preliminar, para revisión jurídica") |
| 14 | **Estructura_Cobro_Admin_Propiedades.xlsx** | Versión nueva | Calculadora, extras, tarifario y cartera |
| 15–24 | 10 imágenes de propiedades (1408×768) | Sí | Para la web |
| 25–30 | 6 imágenes de servicios (1408×768) | Sí | Para la web |

## 2. Lo central: el cliente NO aprueba la versión actual de la web

El *Análisis web v1.0* concluye: "no aprobar todavía la versión actual como definitiva. Corregir
primero los cuatro puntos de prioridad alta". La base es válida y no hay que rehacerla.

| Prioridad | Pedido del cliente | Estado en la web hoy |
|---|---|---|
| ALTA | Replantear el título y el posicionamiento (gestión integral y conservación patrimonial en Uruguay) | Título "Gestión patrimonial inteligente y rigor técnico…" |
| ALTA | Incorporar la **bitácora digital** como diferencial | No existe la sección |
| ALTA | Revisar los 3 niveles + bloque de **servicios complementarios** | Solo 3 niveles; el nivel 3 se llama en inglés |
| ALTA | Alinear las promesas financieras con la operación y el contrato | La web dice "cuentas bancarias separadas y fondo rotativo" |
| MEDIA | Sección **"Sobre PRIVAT"** con el equipo fundador y **fotos reales** | No existe |
| MEDIA | Cotizador: más factores (frecuencia, piscina, jardín, personal, cantidad de propiedades); "estimación preliminar"; inclusiones y exclusiones; botón "Solicitar propuesta personalizada" | Tipo + nivel + ubicación |
| MEDIA | Cobertura: "Maldonado, Punta del Este y zonas seleccionadas" | "Trabajamos en todo Uruguay" |
| COMPL. | Testimonios, SEO en español, WhatsApp visible, política de privacidad, formulario con país de residencia y ubicación del inmueble, revisión en móvil | Parcial |

**Textos que el cliente ya entrega listos:**
- **Título:** "Gestión integral y conservación patrimonial de propiedades en Uruguay".
- **Subtítulo y texto complementario.**
- **Botones:** "Solicitar una propuesta" y "Calcular mi abono".
- **Cobertura:** título y texto.
- **Sección de la bitácora.**
- **Lema:** "Tu propiedad, nuestro compromiso".
- **FAQ completa:** 7 categorías y unas 30 preguntas, con especificación accesible del acordeón.

## 3. Contradicciones e inconsistencias detectadas (requieren decisión)

| # | Contradicción | Documentos | Propuesta |
|---|---|---|---|
| C1 | La FAQ dice "los clientes cuentan con una **bitácora en tiempo real**" | El Plan Maestro y el Análisis web dicen "**no** prometer tiempo real" | Usar "historial digital actualizado" |
| C2 | La FAQ y el texto de la bitácora la presentan **en presente** ("disponen", "puede acceder") | La Guía v1.1: "No anunciar funcionalidades aún no desarrolladas". La bitácora y el portal son **Etapa 2** (no existen todavía; "Acceso clientes" dice "Pronto") | Redactar en futuro o "próximamente" hasta que exista |
| C3 | La web: "cuentas bancarias separadas y fondo rotativo" | El contrato v1.1 solo dice que los fondos "se diferenciarán de los honorarios" y menciona un "fondo operativo inicial/reposición". No habla de cuentas bancarias | Texto neutro alineado al contrato, hasta que el cliente defina el mecanismo real |
| C4 | Costo por km: **0,50 USD** en la planilla nueva | 0,35 USD en la planilla anterior y en el motor y sus pruebas | Confirmar 0,50 |
| C5 | El cotizador muestra el abono **sin indicar si incluye IVA** | La planilla calcula "sin IVA" y aparte con IVA del 22 % | Indicar "valores sin IVA" (Ley 17.250, información clara de precios) |
| C6 | El nivel 3 se llama "Property Management técnico" | El Análisis pide evitar el inglés | Necesita un nombre nuevo en español (lo define el cliente) |
| C7 | La FAQ menciona servicios ("limpieza", "jardines y piscinas", "temporada alta para terceros") | Los 3 niveles actuales no los muestran | Bloque "Servicios complementarios" con el catálogo del Plan Maestro |

## 4. Planilla de cobro (Estructura_Cobro_Admin_Propiedades.xlsx)

**Verificado:**
- La fórmula de la hoja CALCULADORA y de la hoja CARTERA es **la misma que implementa el motor**
  (`packages/pricing`): `(h·valor_hora + visitas·km·costo_km + gastos_fijos)·(1+prima)`; temporada
  alta = baja·coeficiente; anual = baja·(12−m) + alta·m.
- Con costo por km de 0,50, el caso "Casa San Rafael" da **1131,60** (antes 1114,32 con 0,35).

**Qué aporta:**
- **Ejemplos:** 3 propiedades (Casa San Rafael, Apto Torre Península y Chacra José Ignacio) y una
  calculadora de ejemplo.
- **TARIFARIO:** rangos por tipo (mínimo y máximo, en temporada baja y alta). Están rotulados
  **"VALORES ESTIMADOS, SIN FUENTE OFICIAL"**.
- **Descuento de cartera:** del 15 % al 25 % para 5 o más inmuebles del mismo propietario. La
  CARTERA usa el 15 %.
- **EXTRAS:** 12 servicios facturables aparte, con tarifas mínima y máxima (apertura y cierre de
  temporada, relevamiento, inventario, alarmas, trámites…).
- **Modelos porcentuales:** obras del 10 % al 15 %, alquiler de temporada del 10 % al 20 %, alquiler
  anual del 5 % al 10 %, y gastos administrados del 8 % al 12 %.

**Qué NO aporta (el cotizador sigue sin poder dar precios):**
- **No están los 15 perfiles** (5 tipos × 3 niveles, P-5). Solo hay 3 ejemplos de propiedades
  concretas.
- **No está la dirección de la base de operaciones** (P-2).
- **No dice cómo influyen** en el precio la piscina, el jardín, el personal o la frecuencia, que el
  Análisis pide sumar al cotizador.

**Opciones para avanzar con el cotizador:**
- **(a)** El cliente completa los 15 perfiles: el cotizador queda exacto, como está diseñado.
- **(b)** Mostrar los **rangos del TARIFARIO** como "estimación preliminar". No requiere los 15
  perfiles, pero son "valores estimados sin fuente oficial" y sería un cambio de diseño (decisión del
  cliente).
- **(c)** Cotizador v2 con modificadores (frecuencia, piscina, jardín, personal y cantidad de
  propiedades). Requiere que el cliente defina cuánto suma cada factor.

## 5. Imágenes

**Datos técnicos:**
- 16 JPG de 1408×768 px (de 217 a 440 KB cada uno).
- Sirven para tarjetas y para el fondo de la portada en pantallas comunes. En monitores muy
  grandes o de alta densidad se verán algo menos nítidas, porque no hay versión de mayor resolución.

**Origen:**
- La imagen 50 (casa en el bosque) trae una **credencial C2PA de Google** con
  `digitalSourceType: trainedAlgorithmicMedia` y "SynthID watermark": **fue generada con
  inteligencia artificial**.
- Las otras 15 no traen la credencial. **No se puede confirmar** su origen, aunque tienen la misma
  resolución y estilo.

**Consecuencias:**
- **No son propiedades reales administradas por PRIVAT.** No deben presentarse como "propiedades que
  gestionamos" ni como casos reales. Usarlas como ambientación (portada y tarjetas de servicios) es
  razonable.
- **Las 6 imágenes de "servicios"** muestran personas con chaleco **que no son el equipo de PRIVAT**,
  y los chalecos llevan logotipos que no son el de PRIVAT.
  - Sirven para ilustrar servicios.
  - **No sirven para "Sobre PRIVAT" ni "Equipo"**: el propio Análisis pide **fotografías reales**.
  - Presentarlas como el equipo podría ser publicidad engañosa (Ley 17.250).
- **Al publicarlas:** se convierten a WebP en varios tamaños y se les quitan los metadatos. El panel
  podrá reemplazarlas cuando exista D4 (subida de imágenes).

## 6. Etapa 2 (plataforma): lo que ya queda definido

**Bitácora digital por propiedad:**
- Es el **libro de incidencias**: visitas, incidencias, mantenimiento, proveedores, presupuestos,
  autorizaciones, comunicaciones y evidencias.
- **Cada registro tiene:** identificador, propiedad, fechas de registro y del hecho, autor, fuente,
  descripción objetiva, adjuntos, comunicación y autorización, acciones, estado (abierto, en
  seguimiento, resuelto o cerrado) y cierre.
- **Las correcciones se agregan como rectificación fechada**, nunca sobrescriben el registro (el
  mismo principio que el `audit_log` inmutable actual).
- **El cliente** accede solo a sus propiedades.

**Repositorio documental:**
- **Google Drive es el repositorio interno**; el cliente no accede a él. **La plataforma** es el
  registro operativo y lo que consulta el cliente. Esto responde **N-3**.
- Los vínculos se hacen por identificador de evento.

**Otras definiciones:**
- **Alquileres:** existe un servicio de "gestión integral para uso de terceros en temporada alta",
  con cobros e ingresos y egresos, en un anexo separado, más honorarios porcentuales sobre
  alquileres. Esto **responde N-1: sí, con alcance separado**.
- **Contrato:**
  - es modular (anexos A a E);
  - sin plazo mínimo, con preaviso de 30 días;
  - límite de gasto por propiedad;
  - excepción por urgencia o fuerza mayor.
- **Siguen sin respuesta:** **N-2** (clasificación A–F) y **N-4** (Google Workspace).

## 7. Plan propuesto (por etapas)

> **Estado (11/11/2026):** el usuario **aprobó la Etapa F1** y las decisiones C1/C2 (bitácora como
> "próximamente") y C3 (texto de fondos alineado al contrato), y pidió además **un mapa en el panel
> para ubicar la base de operaciones**. F1 está **implementada** (ADR-018 y ADR-019). F2 y F3 siguen
> esperando datos del cliente.

### Etapa F1 – Ajustes de la web con lo que ya entregó el cliente (no depende de datos nuevos)
1. **Portada:**
   - título, subtítulo y texto complementario del Análisis;
   - lema "Tu propiedad, nuestro compromiso";
   - botones "Solicitar una propuesta" y "Calcular mi abono".
2. **SEO:** en español, "gestión y administración de propiedades en Uruguay", sin
   "Property Management".
3. **Cobertura:** título y texto del Análisis.
4. **Transparencia:**
   - agregar "Registro documental";
   - reemplazar "cuentas bancarias separadas y fondo rotativo" por un texto alineado al contrato (C3).
5. **Sección "Bitácora digital"** con el texto del cliente, redactada sin prometer lo que todavía no
   existe (C1, C2).
6. **Bloque "Servicios complementarios"** (catálogo del Plan Maestro, sin precios): Puertas Abiertas,
   preparación de llegadas, gestión de temporada alta, mantenimiento y proveedores, obras y reformas.
7. **FAQ:**
   - acordeón de 2 niveles (categoría → pregunta), accesible (`button`, `aria-expanded`,
     `aria-controls`, teclado);
   - el texto queda en el HTML, como pide la especificación;
   - las 7 categorías del documento, con las correcciones C1 y C2;
   - **editable en el panel**, lo que requiere agregar "categoría" a la tabla `faq` (migración).
8. **Cotizador:**
   - rotular como "estimación preliminar" y "valores sin IVA";
   - botón final "Solicitar propuesta personalizada".
9. **Formulario de contacto:** campos opcionales "país de residencia" y "ubicación del inmueble"
   (migración de `lead`, validación y CSV del panel).
10. **Imágenes:**
    - portada y tarjetas de servicios con las imágenes recibidas, optimizadas (WebP, tamaños
      responsivos, sin metadatos) y con texto alternativo;
    - sin presentarlas como propiedades o equipo reales.
11. **Navegación** según la estructura que pide el cliente: Portada → Propuesta → Servicios →
    Bitácora → Cómo trabajamos → Cobertura → Cotizador → FAQ → Contacto.
12. **Pruebas:** e2e, accesibilidad, Lighthouse y seguridad. **Documentación:** la habitual.

### Etapa F2 – Requiere datos del cliente
- **Cotizador:**
  - base de operaciones (P-2);
  - confirmar 0,50 USD/km, el radio sin cargo y el factor de ruta (P-3, C4);
  - los 15 perfiles (P-5) **o** la decisión de usar los rangos del TARIFARIO.
- **Niveles:**
  - nombre en español del nivel 3 (C6);
  - inclusiones, exclusiones, frecuencia y tiempos de respuesta de cada nivel.
- **Contacto:** teléfono y **WhatsApp** (P-14), para darle protagonismo.
- **Política de privacidad completa** (P-15, asesor legal) y la inscripción en la URCDP.
- **"Sobre PRIVAT":**
  - visión y compromiso (se puede partir del Plan Maestro);
  - **nombres, roles y fotos reales del equipo fundador**.
- **Testimonios reales con autorización.**
- **Mecanismo financiero real** (C3): cuenta por propietario, fondo por propiedad, reposiciones y
  personas autorizadas.

### Etapa F3 – Cotizador v2 (requiere definición del cliente)
- **La visitante elige:**
  - frecuencia de visitas (P-6);
  - piscina, jardín y personal permanente;
  - cantidad de propiedades (descuento de cartera del 15 % al 25 %).
- **El cliente debe definir** cuánto suma cada factor (horas o USD). Se configuraría desde el panel.

### Etapa 2 – Portal de clientes y bitácora digital
Ya hay especificación suficiente para planificarla (sección 6). Va después de que la Etapa 1 quede
aprobada.

## 8. Preguntas para el cliente (consolidadas)

1. ¿Confirman el costo de **0,50 USD/km**? ¿Hay radio sin cargo? ¿Usamos factor de ruta 1,3 o
   distancias reales?
2. ¿Dirección exacta de la **base de operaciones**?
3. ¿Completan los **15 perfiles**, o preferimos mostrar **rangos del TARIFARIO** como estimación
   preliminar?
4. ¿Qué **nombre en español** lleva el nivel 3? ¿Inclusiones, exclusiones, frecuencia y tiempos de
   respuesta de cada nivel?
5. ¿Cuál es el **mecanismo financiero** a publicar (cuenta por propietario, fondo por propiedad…)?
6. **Teléfono y WhatsApp** a publicar.
7. **Equipo fundador:** nombres, roles, descripción y **fotos reales**.
8. **Política de privacidad**: texto del asesor legal e inscripción en la URCDP.
9. ¿Los **servicios complementarios** se muestran con precio (rangos de la hoja EXTRAS) o solo
   "a presupuestar"?
10. **Imágenes:** ¿confirman que son generadas con IA y que tienen derecho a usarlas? ¿Hay versiones
    de mayor resolución?
11. ¿La bitácora se anuncia como "próximamente" hasta que exista el portal (Etapa 2)?

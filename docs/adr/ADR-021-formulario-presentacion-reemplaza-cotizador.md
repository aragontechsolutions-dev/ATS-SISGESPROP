# ADR-021: El formulario de presentación reemplaza al cotizador

**Fecha:** 12/11/2026 · **Estado:** Aceptada (maqueta en revisión por el cliente) · **Reemplaza:**
ADR-003 (cotizador en el servidor), ADR-019 (base de operaciones), partes de ADR-009 y ADR-018

## Contexto

El cliente decidió que **no se muestren precios en la web**: se conversan en un primer contacto.
Entregó la especificación funcional **EF-WEB-001 v1.0** ("Formulario interactivo de presentación de
clientes y propiedades"):

- 4 etapas y 15 preguntas;
- preguntas condicionales (matriz de la sección 4);
- datos a almacenar, con Cliente separado de Propiedad;
- 8 estados comerciales;
- criterios: sin precios, sin documentos, sin datos bancarios y sin dirección exacta.

La especificación recomienda una **maqueta navegable** antes de implementar.

## Decisiones del usuario (12/11/2026)

1. **Retirar por completo el cotizador:** web, panel ("Precios y viáticos"), API y motor de
   cálculo. La plantilla de los 15 perfiles deja de ser necesaria.
2. **Mapa de cobertura:** queda solo para mostrar la zona, sin distancia ni montos.
3. **El formulario de presentación reemplaza al formulario de contacto** (una sola puerta de
   entrada). WhatsApp y los datos de contacto siguen visibles.
4. **Maqueta como vista previa dentro de la web real** (`/formulario-vista-previa/`), sin enlace,
   sin indexar y sin guardar datos. Lo que el cliente aprueba es el formulario definitivo: no se
   descarta trabajo.

## Decisiones técnicas

- **Paquete compartido `@ats/intake`.** Las preguntas, opciones, condiciones, validación y
  prioridad sugerida son la **única fuente**:
  - la web lo usa para mostrar y avisar;
  - la API (etapa G2) lo usará para validar, porque el navegador no es confiable;
  - un cambio de pregunta se hace en un solo lugar.
- **Validación:**
  - se exigen solo las preguntas visibles;
  - las respuestas de preguntas ocultas **se descartan**, así no se guardan datos que no corresponden;
  - se rechazan campos desconocidos y opciones inventadas;
  - se limpian los caracteres de control y hay límites de largo;
  - correo y teléfono internacional con formato válido (de 6 a 15 dígitos).
- **Consentimientos:** el de privacidad es obligatorio (texto de la especificación); el comercial
  es **opcional e independiente**.
- **Prioridad comercial sugerida:** según la fecha estimada de contratación. Es interna y la edita
  el equipo; **nunca se muestra al visitante**.
- **Accesibilidad:**
  - las opciones son radios y casillas nativos con apariencia de botón;
  - cada pregunta es un `fieldset` con su `legend`;
  - errores asociados con `aria-describedby`;
  - al cambiar de etapa, el foco va al título;
  - al haber errores, el foco va al primer campo con error;
  - la barra de progreso usa `aria-current="step"`.
- **CSP:** la barra de progreso no usa `style=""` (la landing, que se prerenderiza, no permite
  estilos en línea). La vista previa tiene su propia CSP con `connect-src 'self'`: no se conecta a
  nada.

## Preguntas marcadas como "Propuesta"

La matriz de la sección 4 pide "preguntas específicas" sin detallarlas. En la maqueta se proponen
estas, marcadas con la etiqueta **Propuesta** (no aparece en la web final), para que el cliente las
apruebe o las cambie:

| Condición | Propuesta |
|---|---|
| Tipo = Chacra | Superficie del terreno (< 1 / 1–5 / 5–20 / > 20 ha / No lo sé) y dependencias adicionales (casa de casero, galpón, caballerizas, otras) |
| Tipo = Casa o Residencia | Superficie del terreno (< 500 / 500–1.000 / 1.000–2.500 / > 2.500 m² / No lo sé), opcional |
| Tipo = Otro | "¿Qué tipo de propiedad es?" |
| Uso = Otro | "¿Cuál es el uso?" |
| Uso = Alquiler temporal | "¿Cómo se gestiona hoy el alquiler?" y "¿Necesitás que preparemos la propiedad entre huéspedes?" |

Otras interpretaciones que el cliente debe confirmar:

- **"Si no es propietario, solicitar aclaración":** se pide para "Represento al propietario",
  "Administrador o representante de empresa" y "Otro"; para "Copropietario" no se pide.
- **Local comercial:** no se pregunta por dormitorios.
- **Apartamento y complejo:** los servicios comunes se preguntan antes que las características
  ("priorizar").
- **Teléfono y correo:** se piden los dos y son obligatorios ("solicitar número de teléfono y correo
  electrónico").
- **Texto del consentimiento comercial:** "Quiero recibir novedades de PRIVAT por correo
  electrónico (opcional)" (la especificación no lo redacta).
- **Voseo:** la especificación está escrita con voseo ("¿Cómo te llamás?") y se respetó. **El resto
  de la web usa tuteo** ("Cuéntanos"). Falta que el cliente elija uno para toda la web.

## Pendiente para publicar el formulario real

- **Política de Privacidad (P-15):** el consentimiento obligatorio necesita el enlace. Sin ella no
  conviene recibir datos reales.
- **Aprobación de la maqueta.** Después siguen las etapas G2 a G5 (API y base de datos, web,
  panel y retiro del cotizador).

## Verificado

- `@ats/intake`: 21 pruebas. Cubren:
  - la matriz completa de condiciones;
  - la validación, incluidos tipos incorrectos, inyección de objetos y opciones inventadas;
  - que las respuestas ocultas se descarten;
  - correo y teléfono;
  - la sección 9: ninguna pregunta de precios, documentos, datos bancarios ni dirección exacta.
- e2e de la maqueta (15 pasos, en escritorio y móvil):
  - recorrido completo, condicionales, errores y foco;
  - resumen editable y mensaje final;
  - que no aparezcan precios;
  - **ninguna petición fuera de la página**;
  - axe sin violaciones en cada etapa;
  - CSP real sin violaciones.

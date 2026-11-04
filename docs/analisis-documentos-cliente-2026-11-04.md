# Análisis de los documentos entregados por el cliente (04/11/2026)

## 1. Qué se recibió

| Documento | ¿Nuevo? | Cómo se verificó |
|---|---|---|
| `Estructura_WEB.docx` | **No.** Mismo contenido que `Estructura_WEB.pdf` (versión editable) | Comparación palabra por palabra: 99,4 % igual. Solo difiere la numeración automática de las listas |
| `Especificacion_identidad_visual_administracion_propiedades.docx` | **No.** Mismo contenido que el PDF | Comparación palabra por palabra: los 7 colores y todos los textos son iguales; cambia solo el orden en que se extrae la tabla |
| `Webs_de_referencia.docx` | **No.** Idéntico al PDF | 48 de 48 palabras iguales |
| `Informe_expensas_viviendas_Uruguay_admin_propiedades.pdf` | **Sí** | Leído completo (10 páginas) |
| `PRIVAT_Estructura_Google_Drive.pdf` | **Sí** | Leído completo (6 páginas) |

## 2. Estudio de gastos y expensas de viviendas (nuevo)

Especificación funcional para un **módulo de gastos**. Corresponde a la **Etapa 2** (núcleo de gestión)
y **no cambia la Etapa 1** (landing, cotizador y panel).

### Qué aporta respecto de la investigación inicial
1. **Catálogo de gastos en 3 niveles:** tipo de propiedad → categoría (9) → concepto. La investigación
   preveía una lista cerrada (`SERVICE_ACCOUNT.kind` = UTE, OSE, Contribución, Primaria, BPS, gastos
   comunes). Con esto debe pasar a ser un **catálogo configurable** (tablas de categorías y conceptos),
   no una lista fija.
2. **Tributos configurables por departamento y padrón.** Maldonado tiene adicionales propios (alumbrado,
   videovigilancia, pavimentos). No hay una lista única para todo Uruguay.
3. **Periodicidad por concepto:** mensual, bimestral, trimestral, semestral, anual o eventual.
4. **Campos por gasto:**
   - tipo: fijo, variable o extraordinario;
   - estado: pendiente, pagado, vencido, **observado** o cancelado;
   - moneda: UYU, USD u otra;
   - comprobante.
5. **Responsable de pago:** propietario, **inquilino**, compartido o tercero, con una **matriz de
   responsabilidad configurable por contrato y por concepto** (no una regla fija).
6. **Provisión mensual** (prorrateo de los gastos anuales), como herramienta de planificación.
7. **Tres perspectivas de gasto:** de la propiedad, de ocupación y de administración.
8. **Funcionalidades:**
   - calendario de vencimientos, alertas e historial;
   - comparación anual y presupuesto anual;
   - control de deudas, de proveedores y de comprobantes;
   - **rentabilidad** y **estado financiero de la propiedad**, que incluye **ingresos por alquiler**.
9. **Gastos de propiedades desocupadas o de temporada:** coincide con el negocio de casas cerradas.
10. **Normativa citada:**
    - Ley 10.751 (propiedad horizontal);
    - Ley 19.889, art. 427 (arrendamiento sin garantía);
    - criterios del MEF (Servicio de Garantía de Alquileres).

    No se verificaron en esta revisión.

### Inconsistencias y dudas detectadas
- **Dos clasificaciones de propiedad distintas:**
  - el estudio usa 6 tipos según el régimen (A casa independiente, B apartamento sin amenities,
    C apartamento con amenities, D barrio privado, E complejo/PH, F rural/chacra);
  - el cotizador usa los 5 tipos del TARIFARIO según tamaño y complejidad.

  No son equivalentes (por ejemplo, el tipo A "casa independiente" puede ser "Casa 150-300 m²" o
  "Casa premium"). **Propuesta:** guardar ambos atributos en la propiedad: tipo tarifario (para
  cotizar) y régimen (para el catálogo de gastos). **A confirmar con el cliente.**
- **Inquilinos y alquileres:** el estudio incluye inquilinos, contratos de arrendamiento, ingresos por
  alquiler y comisión por alquiler. Hasta ahora el alcance era la administración de propiedades de
  propietarios ausentes (preguntas B-3 y B-4 de la investigación, sin respuesta). Si PRIVAT administra
  alquileres:
  - aparecen entidades nuevas (inquilino, contrato de arrendamiento, cobro de alquiler);
  - cambia el análisis de la Ley 19.574: la norma excluye los arrendamientos de los sujetos obligados.
    El encuadre lo decide el asesor legal.
- **Ejemplo de prorrateo:** las cuentas son correctas (5.900 + 4.500 = 10.400 por mes), pero la fila
  "Total de gastos anuales $54.000" suma solo los conceptos de pago anual. El costo anual real del
  ejemplo es **$124.800** (5.900 × 12 + 54.000). En la plataforma conviene llamarla "Total de gastos de
  pago anual".
- **Moneda:** el ejemplo está en pesos y el cotizador en dólares. Confirma la necesidad del módulo
  multimoneda con tipo de cambio por fecha (M19 de la investigación).

## 3. Estructura documental de Google Drive (nuevo)

Árbol de carpetas para la gestión interna de PRIVAT: 13 carpetas principales y un expediente por cliente
y por propiedad.

### Qué aporta
1. **Dato operativo:** PRIVAT usa **Google Drive** como repositorio documental. Prevé integrarlo
   "posteriormente" con la plataforma.
2. **Procesos y entidades que la investigación no tenía:**
   - Estados del cliente (en evaluación, activo, inactivo) y de la propiedad (**en incorporación**,
     finalizada).
   - **Preparación para llegadas** y protocolo de **llegada de propietarios**. Relacionado con los
     extras "apertura y cierre de casa".
   - **Comparativas de presupuestos** (varios presupuestos por orden de trabajo) y **evaluación de
     proveedores**.
   - **Actas de entrega y recepción**, **formularios de incidentes** y **emergencias**.
   - Informes **trimestrales y anuales**, además de los mensuales.
   - **Control de calidad**.
3. **Criterios coherentes con el sistema:**
   - separar los gastos de PRIVAT de los de las propiedades;
   - no inventar datos;
   - no compartir con terceros ni crear enlaces públicos.

### Decisión pendiente (Etapa 2/3)
- **Dónde viven los documentos de cada propiedad.** Hay dos opciones:
  - **a) Supabase Storage**, como planteaba la investigación: control de acceso desde la API.
  - **b) Google Drive integrado por API:** el equipo ya lo usa, pero suma permisos y credenciales de
    Google que proteger, y hay que evaluar la transferencia internacional de datos (Ley 18.331).

  **NO SÉ** cuál prefiere el cliente: es una pregunta para él.
- **Carpeta raíz:** la sección 6 del documento son instrucciones para crearla en Drive. Desde este
  entorno **no hay acceso** al Google Drive del cliente: no se puede hacer aquí.

## 4. Efecto en el proyecto

| Área | Efecto |
|---|---|
| Etapa 1 (en curso) | **Ninguno.** Los dos documentos nuevos son para etapas siguientes |
| Etapa 2 (núcleo de gestión) | Catálogo de gastos configurable, periodicidad, matriz de responsabilidad, provisión mensual, estado financiero; posibles inquilinos y alquileres |
| Etapa 3 (operación de campo) | Comparativas de presupuestos, evaluación de proveedores, actas de entrega, incidentes |
| Modelo de datos de la investigación | `SERVICE_ACCOUNT.kind` (lista fija) pasa a catálogo; agregar régimen de propiedad, periodicidad y responsable; estados de cliente y propiedad |

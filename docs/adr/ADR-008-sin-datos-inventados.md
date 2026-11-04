# ADR-008 – Sin datos inventados: lo no confirmado queda bloqueado

**Contexto.** Faltan respuestas del cliente: base de operaciones (P-2), regla de viático por tramos (P-3)
y los 15 perfiles de cálculo (P-5).

**Decisión.**
- El seed solo carga datos de los documentos del cliente: 5 tipos de propiedad (TARIFARIO), 3 niveles de
  servicio (Documento Maestro) y un parámetro técnico (`TERRITORY_TOLERANCE_KM` = 2).
- Mientras no haya publicación, el cotizador responde 503. Si falta un perfil, responde 404.
- El modo de viático `POR_TRAMOS` está modelado (tabla `travel_tier`) pero el motor lo rechaza hasta
  definir la regla (¿monto por visita o por mes?).
- Los casos de la planilla se usan solo como datos de prueba, no como perfiles de producción.

**Consecuencias.** El sistema nunca muestra precios no aprobados. Cuando llegue la información, se carga
desde el panel (Bloque D), sin cambiar código.

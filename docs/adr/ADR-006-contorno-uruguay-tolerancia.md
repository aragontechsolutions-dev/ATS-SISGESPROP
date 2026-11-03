# ADR-006 – Contorno de Uruguay (Natural Earth) con tolerancia de 2 km

**Contexto.** El mapa debe rechazar puntos fuera de Uruguay. Hace falta un contorno gratuito y liviano.

**Decisión.** Polígono de Uruguay de Natural Earth 1:10m Admin 0 (dominio público), redondeado a
4 decimales (11 KB, 584 vértices), en `apps/api/src/geo/uruguay.geometry.json`.

Medición con ubicaciones reales: la simplificación de la costa deja puntos válidos fuera del polígono
(Punta Ballena a 0,88 km, Cabo Polonio a 0,83 km, Isla Gorriti a 1,91 km). Se acepta un punto si está
dentro del polígono o a ≤ 2 km de su borde (`TERRITORY_TOLERANCE_KM`, editable en `pricing_param`).

**Consecuencias.**
- Concordia (Argentina, a 2,45 km) queda rechazada.
- Limitación conocida: en la frontera seca Rivera–Santana do Livramento se aceptan puntos brasileños
  pegados al límite. Es inocuo para una cotización orientativa.
- Isla de Lobos (8 km) queda fuera.
- Si se necesita más precisión, se reemplaza el archivo por un contorno oficial (p. ej. IDE Uruguay).

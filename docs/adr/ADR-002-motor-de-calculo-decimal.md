# ADR-002 – Motor de cálculo aislado, decimal exacto, redondeo al presentar

**Contexto.** El cotizador debe reproducir la planilla al centavo. El caso Chacra José Ignacio da
2171,875 (tres decimales): si se redondea el abono antes de calcular el anual, el anual da 31275,06 en
lugar de 31275.

**Decisión.** `packages/pricing` contiene funciones puras sin framework. Usa `decimal.js` (sin coma
flotante) y redondea a 2 decimales (mitad hacia arriba) **solo al presentar**. Los valores exactos se
guardan en el snapshot de cada simulación. La distancia geodésica usa Haversine en coma flotante
(no es dinero) y se redondea a 0,01 km antes de entrar al cálculo.

**Consecuencias.** Las pruebas de los 3 casos de la planilla bloquean el CI si un cambio altera
un resultado. El costo por km (0,35) es el valor que hace cerrar la fórmula y se confirmará con el
cliente (P-3).

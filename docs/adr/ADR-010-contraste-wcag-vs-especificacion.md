# ADR-010 – Contraste WCAG 2.2 AA frente a la especificación de identidad visual

**Contexto.** Se calculó el contraste de cada combinación de colores usada en la web.

| Combinación | Contraste | Mínimo |
|---|---|---|
| Texto principal sobre crema / blanco | 10,63 / 11,98 | 4,5 ✅ |
| Texto secundario (#686B67) sobre crema / blanco | 4,79 / 5,40 | 4,5 ✅ |
| Blanco sobre verde bosque / verde hover | 11,98 / 14,21 | 4,5 ✅ |
| Blanco sobre banner de advertencia (#9A6B16) | 4,68 | 4,5 ✅ |
| Éxito / error sobre blanco | 6,29 / 6,60 | 4,5 ✅ |
| Dorado (foco) sobre verde bosque | 4,71 | 3 ✅ |
| **Dorado (foco) sobre crema / blanco** | **2,26 / 2,55** | 3 ❌ |
| **Borde #E2DED5 de campos sobre blanco** | **1,34** | 3 ❌ |

**Decisión.**
1. El contorno de foco es **verde bosque** sobre fondos claros y **dorado** solo sobre fondos verdes
   (coincide con la especificación: "foco visible con borde verde bosque" en formularios).
2. Los **campos de formulario** usan borde gris cálido #686B67 (5,4:1) en lugar de #E2DED5, porque
   WCAG 1.4.11 exige 3:1 para identificar un campo. #E2DED5 se mantiene en tarjetas y divisores.
3. Los números decorativos dorados ("01, 02, 03" en Transparencia) son decorativos (`aria-hidden`) y
   quedan exentos.

**Consecuencias.** El punto 2 se aparta de la especificación ("borde #E2DED5" en formularios). La
propia especificación fija WCAG 2.2 AA como objetivo, así que prevalece la accesibilidad.
**Requiere aprobación del cliente.**

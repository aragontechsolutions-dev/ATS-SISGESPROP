# Manual del panel de administración – PRIVAT

Guía de uso para el equipo de PRIVAT. El panel permite cambiar los textos de la web, los precios del
cotizador y los viáticos, y ver las consultas recibidas, sin tocar código.

---

## 1. Ingresar

1. Abrir **`https://<dominio de PRIVAT>/admin/`**. El dominio se definirá al publicar el sitio.
2. Escribir el email y la contraseña.
3. **Segundo factor** (obligatorio):
   - **La primera vez**, el panel muestra un **código QR**. Escanéelo con una app autenticadora en el
     teléfono (Google Authenticator, Microsoft Authenticator, 1Password u otra) y escriba el código de
     6 dígitos que muestra la app.
   - **Las veces siguientes**, solo se pide el código de 6 dígitos de la app.
4. Si no se usa el panel durante **15 minutos**, la sesión se cierra sola. La sesión también se cierra
   al cerrar la pestaña del navegador.

> **Seguridad:** no comparta su contraseña ni su teléfono con la app autenticadora. Si pierde el
> teléfono, avise de inmediato para desactivar su acceso.

---

## 2. Cómo funcionan los cambios: borrador y "Publicar"

Todo lo que se cambia en el panel se guarda como **borrador** y **no se ve en la web** hasta pulsar
**Publicar**. Así un error de tipeo en un precio nunca llega a la web por accidente.

```
Editar (borrador)  →  Probar (simulación de prueba)  →  Publicar  →  Web actualizada
```

- **El cotizador** usa los precios nuevos **apenas** se publica.
- **Los textos de la página** se actualizan unos minutos después de publicar, cuando termina de
  regenerarse el sitio.
- **Si algo salió mal**, en **Publicar → Historial** se puede **Restaurar** una versión anterior.

---

## 3. Pestaña "Contenidos"

A la izquierda está la lista de secciones de la página. Elija una, cambie los textos y pulse
**Guardar borrador**.

| Sección | Qué contiene |
|---|---|
| Ajustes generales | Aviso de "contenido provisorio", botón "Acceso clientes" y versión de la política de privacidad |
| Marca | Nombre comercial |
| Buscadores (SEO) | Título y descripción que muestra Google |
| Menú | Textos del menú superior |
| Portada (hero) | Titular, subtítulo, botón y sellos de confianza |
| Servicios | Encabezado de la sección y los 3 niveles de servicio |
| Transparencia | Los puntos de "Cómo trabajamos" |
| Cobertura | Textos del mapa |
| Cotizador | Textos y aviso legal del resultado |
| Contacto | Teléfono, WhatsApp, email y dirección. Si se dejan vacíos, no se muestran |
| Pie de página | Datos legales y enlaces a la política de privacidad y a los términos (deben empezar con `https://`) |

**Ajustes generales → "Contenido provisorio".** Mientras esté marcado, la web muestra un aviso de
vista previa y Google no la indexa. **Desmárquelo solo cuando todos los textos estén aprobados.**

**Preguntas frecuentes.** Se agregan al final de la pestaña. Sin preguntas, la sección no aparece en la
web.

**Testimonios.** Cargue **solo testimonios reales con autorización escrita del autor**, e indique la
fecha de esa autorización. Sin testimonios visibles, la sección no aparece.

Si un dato no es válido (por ejemplo, un texto demasiado largo o un enlace que no empieza con
`https://`), el panel muestra un mensaje explicando qué corregir.

---

## 4. Pestaña "Precios y viáticos"

> Esta información es **comercial y confidencial**: nunca se muestra en la web. El visitante solo ve
> el resultado final.

### 4.1 Perfiles de cálculo
La tabla tiene los **5 tipos de propiedad × 3 niveles = 15 perfiles**. Pulse una celda para cargar o
editar sus valores:
- visitas por mes;
- horas por visita y de traslado;
- horas de administración, de coordinación y de gestión de personal;
- valor hora y gastos fijos;
- prima (se escribe como fracción: **0.2 = 20 %**);
- coeficiente de temporada alta (2 = el doble);
- meses de temporada alta (se admite 2.5).

Los decimales van con **punto o coma**. Si un perfil no está configurado, el cotizador de la web
responde que no hay tarifa para esa combinación e invita a escribir.

### 4.2 Viáticos y base de operaciones
- **Base:** escriba un nombre y **haga clic en el mapa** donde está la base. Debe estar en Uruguay.
- **Radio sin cargo (km):** dentro de ese radio no se cobra traslado.
- **Factor de ruta:** corrige la distancia en línea recta para aproximarla a la distancia por carretera.
  Valor inicial: 1.3. Conviene ajustarlo con 3 o 4 trayectos reales.
- **Costo por km (USD).**

### 4.3 Simulación de prueba
Antes de publicar, elija tipo, nivel y una ubicación y pulse **Simular**. Verá el detalle completo
(horas, km, viático, abonos y total anual) calculado con el **borrador**. La simulación no se guarda
ni afecta a la web.

---

## 5. Pestaña "Consultas"

- Lista de formularios recibidos desde la web, con la estimación del cotizador si el visitante la
  adjuntó.
- Cambie el **estado** (Nueva → Contactada → Cerrada) para organizar el seguimiento.
- **Exportar CSV** descarga las consultas para abrirlas en Excel. Cada exportación queda registrada.

> Son **datos personales** (Ley 18.331): úselos solo para responder la consulta y no los comparta.

---

## 6. Pestaña "Publicar"

- **Publicar:** copia el borrador a la web. Si falta alguna sección, el panel la indica y no publica.
- **Avisos:** el panel avisa, por ejemplo, si todavía no hay base de operaciones (el cotizador seguirá
  "no configurado").
- **Historial:** todas las publicaciones con fecha y autor. **Restaurar** vuelve a publicar una
  versión anterior tal como estaba, sin borrar nada.

---

## 7. Pestaña "Registro de cambios"

Muestra **quién cambió qué y cuándo**, con el valor anterior y el nuevo. Este registro **no se puede
modificar ni borrar**.

---

## 8. Usuarios del panel

El alta y la baja de usuarios del panel las hace el responsable técnico (ver la guía técnica). Por
seguridad, un usuario no se borra: se **desactiva**, para conservar el historial de cambios.

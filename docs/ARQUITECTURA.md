# Cómo está hecho valère

Esta guía explica qué hace cada archivo, en qué orden se carga todo y dónde tocar para cada cambio.
Cada archivo trae además, al inicio, un bloque de comentarios que dice **qué hace**, **qué usa** y **qué expone**.

---

## 1. Mapa de carpetas

```
valere/
├── index.html … contacto.html   Las 6 páginas. SE GENERAN SOLAS (ver sección 5): no se editan a mano
├── data/
│   └── perfumes.json            El catálogo: perfumes, precios, notas y modelos de frasco
├── images/
│   └── frascos/                 Fotos de frascos: <foto>.webp
├── plantillas/                  De aquí salen las páginas
│   ├── comun-arriba.html        <head>, estilos, scripts y cabecera (iguales en todas)
│   ├── comun-abajo.html         Pie, Mi lista y avisos (iguales en todas)
│   ├── bienvenida.html          Animación de entrada (solo portada)
│   ├── paginas.txt              Lista de páginas con su título y descripción
│   └── paginas/<página>.html    El contenido propio de cada página
├── herramientas/
│   └── generar-paginas.ps1      Junta las plantillas y escribe los .html
├── css/                         Estilos, un archivo por tema (sección 3)
├── js/                          Código, un archivo por tarea (sección 2)
└── docs/ARQUITECTURA.md         Esta guía
```

| Página | Archivo | Qué tiene |
|---|---|---|
| Inicio | `index.html` | Bienvenida animada, título, frasco destacado, tres razones |
| Descubrir | `descubrir.html` | Buscador, filtros, tarjetas y examen de gustos |
| Kits | `kits.html` | Tarjetas de kits |
| Comparar | `comparar.html` | Hasta 3 perfumes lado a lado |
| Perfume | `perfume.html?p=versace-eros` | Detalle de un perfume (cada uno tiene su link) |
| Nosotros | `nosotros.html` | La historia: por qué existe valère y qué nos importa |
| Contacto | `contacto.html` | WhatsApp, Instagram, Facebook y cómo pedir |

En **todas** las páginas están la cabecera, el pie, la ventana **Mi lista** y la barrita flotante de comparar.

---

## 2. JavaScript

### Cómo se organiza

- Cada archivo crea **un solo objeto** con un nombre claro (`Catalogo`, `Lista`, `Comparador`…) y solo expone lo que los demás necesitan.
- Los archivos se cargan **en orden** (lo marca `plantillas/comun-arriba.html`). Uno puede usar a los que se cargaron antes.
- Los botones no llevan código: dicen qué hacen con `data-accion="..."` y **`js/app.js`** tiene la tabla `ACCIONES` que conecta cada nombre con su función.
- Datos y dibujo van separados: `js/datos/` guarda y calcula; `js/vistas/` dibuja.

### Orden de carga

| # | Archivo | Objeto | Qué hace |
|---|---|---|---|
| — | **Antes de pintar** (en `<head>`) | | |
| 1 | `js/config.js` | `AJUSTES` | **Lo que edita el dueño**: WhatsApp, redes, regalo, modo ligero, 3D, fechas del tema |
| 2 | `js/base/antes-de-pintar.js` | `Temporada` | Prende el tema de temporada, el modo ligero y decide si se ve la bienvenida (clases `hw`, `lite`, `noiv` en `<html>`) |
| — | **Con la página ya armada** (`defer`) | | |
| 3 | `js/base/utilidades.js` | `$`, `$$`, `Texto`, `Almacen`, `Registro` | Buscar elementos, normalizar palabras, guardar en el navegador, atrapar errores |
| 4 | `js/base/ajustes.js` | `Config` | Los `AJUSTES` revisados y con valores seguros |
| 5 | `js/base/compatibilidad.js` | — | Respaldo de ventanas para iPhone viejos |
| 6 | `js/base/anticopia.js` | — | Bloquea clic derecho, copiar y atajos |
| 7 | `js/datos/catalogo.js` | `Catalogo` | Lee `perfumes.json`, lo revisa y responde: buscar, precios, descuentos, búsqueda |
| 8 | `js/datos/lista.js` | `Lista`, `Regalo` | Mi lista: agregar, quitar, totales y el mensaje para WhatsApp |
| 9 | `js/interfaz/formato.js` | `Formato` | Pesos, tamaños, etiqueta de descuento y el frasco en HTML |
| 10 | `js/interfaz/pagina.js` | `Pagina` | En qué página estamos y los links entre páginas |
| 11 | `js/interfaz/avisos.js` | `Avisos` | Aviso corto, copiar y compartir |
| 12 | `js/interfaz/ventanas.js` | `Ventanas` | Abrir/cerrar ventanas, botón Atrás, doble toque |
| 13 | `js/frascos/fotos.js` | `Frascos` | Decide si el frasco va en 3D, con foto o dibujado, y lo pinta |
| 14 | `js/frascos/motor3d.js` | `Motor3D` | Motor 3D propio con WebGL (apagado con `VISTA_3D: false`) |
| 15 | `js/vistas/catalogo.js` | `VistaCatalogo` | Tarjetas, filtros y búsqueda |
| 16 | `js/vistas/producto.js` | `VistaProducto` | Detalle del perfume |
| 17 | `js/vistas/mi-lista.js` | `VistaLista` | Dibuja Mi lista |
| 18 | `js/vistas/comparador.js` | `Comparador` | Botones "Comparar", barrita, comparador y selector |
| 19 | `js/vistas/examen.js` | `Examen` | Examen de gustos y recomendación |
| 20 | `js/vistas/bienvenida.js` | `Bienvenida` | Acomoda el acento de la animación y la quita al terminar |
| 21 | `js/temporadas/halloween.js` | `Halloween` | Figuras, ambientes y efectos de temporada |
| 22 | `js/app.js` | `App` | **Conecta todo** y arranca (ver abajo) |

### Qué pasa al abrir una página

```
config.js + antes-de-pintar.js   → <html class="hw lite noiv"> según el caso
(la página se dibuja)
App.iniciar()
  1. escucha clics, buscador y regalo
  2. Catalogo.cargar()            → descarga data/perfumes.json (o usa el último que cargó bien)
  3. Lista.leer(), Regalo.leer(), Comparador.leer()
  4. pinta: redes, catálogo, Mi lista, portada y lo propio de la página
  5. avisa "valere:listo"         → arranca el tema de temporada
  6. Frascos.cargarFotos()        → al terminar avisa "valere:fotos" y se vuelve a pintar
```

### Lo que se guarda en el navegador

| Clave | Qué guarda | Archivo |
|---|---|---|
| `vc` | Mi lista: `[[id, tamaño, cantidad], …]` | `js/datos/lista.js` |
| `vg` | Regalo: `{ g: sí/no, n: mensaje }` | `js/datos/lista.js` |
| `vx` | Perfumes que se están comparando | `js/vistas/comparador.js` |
| `vcat` | Último catálogo que cargó bien (respaldo) | `js/datos/catalogo.js` |
| `vh` | Tema prendido/apagado por el dueño | `js/base/antes-de-pintar.js` |
| `vi` | Ya se vio la bienvenida (solo esta visita) | `js/base/antes-de-pintar.js` |

### Acciones de los botones (`data-accion`)

| Acción | Dónde | Qué hace |
|---|---|---|
| `abrir-lista` | Cabecera | Abre Mi lista |
| `agregar` | Tarjetas, comparador | Agrega a Mi lista (`data-id`) |
| `cambiar-cantidad` | Mi lista | − / + (`data-linea`, `data-cambio`) |
| `copiar-lista`, `compartir-lista`, `copiar-y-abrir` | Mi lista | Copiar, compartir, copiar y abrir Instagram/Facebook |
| `filtrar` | Descubrir | Filtro de género (`data-genero`) |
| `elegir-tamano`, `guardar-perfume` | Detalle | Elegir ml y guardar |
| `alternar-comparar`, `comparar-con` | Tarjetas, detalle | Agregar o quitar de la comparación |
| `abrir-selector`, `elegir-perfume`, `cerrar-selector` | Comparador | "Cambiar perfume" |
| `agregar-a-comparacion`, `quitar-de-comparacion`, `limpiar-comparacion` | Comparador, barrita | Tercer perfume, quitar, vaciar |
| `abrir-examen`, `examen-*` | Descubrir | Examen de gustos |
| `cerrar`, `saltar-bienvenida` | Ventanas, portada | Cerrar ventana, saltar animación |

---

## 3. CSS

Cada archivo es un tema. **El orden importa**: los de abajo pueden ajustar a los de arriba (está en `plantillas/comun-arriba.html`).

| Archivo | Qué estiliza |
|---|---|
| `base.css` | **Colores** (`:root`), letra, reglas generales |
| `componentes.css` | Botones, chips, etiqueta de descuento, frasco, bloques de tres columnas |
| `cabecera.css` | Barra de arriba, logo, menú y "Mi lista" |
| `pie.css` | Pie de página |
| `dialogos.css` | Lo común a todas las ventanas |
| `avisos.css` | Aviso corto de abajo |
| `bienvenida.css` | Animación de entrada |
| `portada.css` | Portada |
| `catalogo.css` | Buscador, filtros y tarjetas |
| `producto.css` | Detalle del perfume |
| `mi-lista.css` | Mi lista, regalo y su aviso |
| `comparador.css` | Barrita, comparador y selector |
| `examen.css` | Examen de gustos |
| `paginas.css` | Títulos de página y Contacto |
| `pantallas-especiales.css` | Plegables, navegadores viejos, menos transparencia/movimiento |
| `modo-ligero.css` | Menos efectos en equipos modestos |
| `anticopia.css` | Sin selección de texto ni impresión |
| `temporadas/halloween.css` | Tema de Halloween (solo con `html.hw`) |

Cada archivo pone sus ajustes para celular **al final**, con `@media`:
`max-width: 700px` celular · `701–1100px` tablet · `max-width: 359px` celulares muy chicos · `max-height: 520px` celular acostado · `pointer: coarse` pantallas táctiles.

---

## 4. Datos: `data/perfumes.json`

```json
{
  "modelos": {
    "eros": { "foto": "eros", "c": "#0f78a0", "v": 1, "t": "#c9a54a", "tp": "cubo", "l": "#f1ecdf", "e": "eros|eau de toilette" }
  },
  "perfumes": [
    {
      "nombre": "Eros", "marca": "Versace", "genero": "h",
      "precios": { "200": 2299 }, "preciosNormales": { "200": 3800 }, "descuento": 39,
      "familia": "Aromático fougère",
      "notas": "menta, manzana verde, limón | haba tonka, ambroxan, geranio | vainilla, cedro, vetiver, musgo de roble",
      "color": "#0f5c73", "modelo": "eros"
    }
  ]
}
```

| Campo | Obligatorio | Qué es |
|---|---|---|
| `nombre`, `marca` | sí | Juntos no se pueden repetir; de ahí sale el link (`versace-eros`) |
| `precios` | sí | `{ ml: precio que se cobra }`. Un kit usa `"1"` en vez de ml |
| `genero` | — | `"h"` hombre · `"m"` mujer · `"u"` unisex |
| `preciosNormales`, `descuento` | — | Precio antes del descuento y el % que se muestra |
| `familia`, `notas` | — | Notas: `"salida \| corazón \| fondo"`, separadas por comas |
| `color` | — | Color del frasco dibujado |
| `modelo` | — | Nombre en `modelos` (foto y forma del frasco 3D) |
| `incluye` | — | Qué trae un kit |

Campos de `modelos`: `foto` (nombre del .webp), `c` color del frasco, `v` 1 = vidrio, `t` color de tapa, `tp` tapa (`cubo`, `cilindro`, `corona`), `l` color de etiqueta, `e` texto de etiqueta (`|` = renglón), `w`/`h`/`d` medidas.

---

## 5. Recetas

**Agregar o cambiar un perfume** → `data/perfumes.json`. Guardar y recargar.

**Cambiar WhatsApp, redes, regalo o fechas del tema** → `js/config.js`.

**Cambiar un color de todo el sitio** → `css/base.css`, en `:root`.

**Cambiar el menú, el pie o algo que está en todas las páginas**
1. Edita `plantillas/comun-arriba.html` o `plantillas/comun-abajo.html`.
2. En VS Code: *Terminal → Ejecutar tarea… → Generar páginas*.

**Cambiar el contenido de una página** → `plantillas/paginas/<página>.html` y luego *Generar páginas*.

**Agregar una página nueva**
1. Crea `plantillas/paginas/nueva.html`.
2. Agrega una línea en `plantillas/paginas.txt`.
3. Si va en el menú, agrégala en `comun-arriba.html` (y en `$secciones` de `herramientas/generar-paginas.ps1`).
4. *Generar páginas*.

**Agregar un botón que haga algo**
1. En el HTML: `<button data-accion="mi-accion">`.
2. En `js/app.js`, dentro de `ACCIONES`: `"mi-accion": (el) => { … }`.

**Agregar una temporada (Navidad)**
1. Copia `js/temporadas/halloween.js` y `css/temporadas/halloween.css` como `navidad.*`.
2. Cambia figuras, frases y colores, y usa otra clase en `<html>` (por ejemplo `nv`).
3. Agrega los dos archivos en `plantillas/comun-arriba.html` y *Generar páginas*.

**Probar en tu compu** → con Live Server (clic derecho en `index.html` → *Open with Live Server*). Con doble clic no carga el catálogo.

---

## 6. Formato del código

- Todo se formatea con **Prettier** (reglas en `.prettierrc.json`). Con la extensión de Prettier en VS Code se acomoda solo al guardar.
- Nombres y comentarios en español.
- Cada archivo empieza con un bloque que dice qué hace, qué usa y qué expone. Si agregas un archivo, sigue el mismo formato y anótalo en esta guía.

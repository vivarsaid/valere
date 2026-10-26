# Cómo está hecho valère

Esta guía explica qué hace cada archivo, en qué orden se carga todo y dónde tocar para cada cambio.
Cada archivo trae además, al inicio, un bloque de comentarios que dice **qué hace**, **qué usa** y **qué expone**.

---

## 1. Mapa de carpetas

```
valere/
├── index.html … terminos.html   Las 9 páginas. SE GENERAN SOLAS (ver sección 5): no se editan a mano
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
| Inicio | `index.html` | Bienvenida animada, «Lo más vendido» en carrusel 3D, tres razones |
| Descubrir | `descubrir.html` | Buscador, filtros, tarjetas y examen de gustos |
| Kits | `kits.html` | Tarjetas de kits |
| Comparar | `comparar.html` | Hasta 3 perfumes lado a lado |
| Perfume | `perfume.html?p=versace-eros` | Detalle de un perfume (cada uno tiene su link) |
| Nosotros | `nosotros.html` | La historia (con color al bajar), números del catálogo, pirámide olfativa y valores |
| Contacto | `contacto.html` | Botón de WhatsApp con mensaje listo, redes con su color, cómo pedir y preguntas frecuentes |
| Aviso de privacidad | `privacidad.html` | Qué datos se reciben, para qué y cómo pedir verlos o borrarlos |
| Términos y condiciones | `terminos.html` | Cómo se compra: productos, precios, pagos, envíos y devoluciones |

En **todas** las páginas están la cabecera, el pie (con los enlaces legales), la ventana **Mi lista** y la barrita flotante (comparar y «Finalizar compra»).

> Las páginas legales tienen su fecha de «Última actualización» arriba. Si cambias algo de lo que dicen
> (envíos, pagos, devoluciones, datos que pides), actualízalas y cambia la fecha.

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
| 12 | `js/interfaz/vuelo.js` | `Vuelo` | Al guardar, el frasco se encoge y vuela hasta «Mi lista», que da un saltito |
| 13 | `js/interfaz/ventanas.js` | `Ventanas` | Abrir/cerrar ventanas, botón Atrás, doble toque |
| 14 | `js/frascos/fotos.js` | `Frascos` | Decide si el frasco va en 3D, con foto o dibujado, y lo pinta |
| 15 | `js/frascos/motor3d.js` | `Motor3D` | Motor 3D propio con WebGL (apagado con `VISTA_3D: false`) |
| 16 | `js/vistas/catalogo.js` | `VistaCatalogo` | Tarjetas, filtros, orden, búsqueda y la invitación al examen dentro de la cuadrícula |
| 17 | `js/vistas/producto.js` | `VistaProducto` | Detalle del perfume |
| 18 | `js/vistas/mi-lista.js` | `VistaLista` | Dibuja Mi lista: pasos, tarjetas, «Te puede gustar» y resumen |
| 19 | `js/vistas/comparador.js` | `Comparador` | Botones "Comparar", comparador y selector (si no eligieron nada, pone dos de ejemplo que no se guardan) |
| 20 | `js/vistas/barra.js` | `Barra` | Barrita flotante: comparar y «Finalizar compra» (abre Mi lista) |
| 21 | `js/vistas/carrusel.js` | `Carrusel` | Carrusel 3D de la portada (Three.js, se descarga después; ver abajo) |
| 22 | `js/vistas/nosotros.js` | `VistaNosotros` | Nosotros: números del catálogo, color al bajar por los capítulos y pirámide olfativa |
| 23 | `js/vistas/examen.js` | `Examen` | Examen de gustos y recomendación |
| 24 | `js/vistas/bienvenida.js` | `Bienvenida` | Acomoda el acento de la animación y la quita al terminar |
| 25 | `js/temporadas/halloween.js` | `Halloween` | Figuras, ambientes y efectos de temporada |
| 26 | `js/app.js` | `App` | **Conecta todo** y arranca (ver abajo) |

### El carrusel 3D de la portada

- Usa los perfumes del catálogo (sin kits). La forma del frasco y el color de la tapa salen del `modelo` del JSON si lo tiene (`tp: "cubo"` → cuadrado, `"corona"` → hexagonal); si no, a cada perfume le toca siempre la misma. El líquido es su `color`, y el fondo, ese mismo tono oscurecido.
- **Three.js** (versión fija 0.160.0, desde jsDelivr) se descarga cuando la página ya terminó de cargar. Mientras, se ve el frasco plano y el carrusel ya funciona.
- Para que sea fluido: solo arma los frascos cerca del centro (uno por cuadro), comparte las formas, no dibuja si no se ve o hay una ventana abierta, baja a 30 cuadros por segundo cuando está quieto y baja la resolución si el aparato va lento. Con el carrusel debajo, la cabecera y la barrita dejan de desenfocar (`html.car-bajo`).
- Sin 3D: con `CARRUSEL_3D: false` en `js/config.js`, en modo ligero o sin WebGL.

### Qué pasa al abrir una página

```
config.js + antes-de-pintar.js   → <html class="hw lite noiv"> según el caso
(la página se dibuja)
App.iniciar()
  1. escucha clics, buscador y regalo
  2. Catalogo.cargar()            → descarga data/perfumes.json (o usa el último que cargó bien)
  3. Lista.leer(), Regalo.leer(), Comparador.leer()
  4. pinta: redes, catálogo, Mi lista, barrita, lo propio de la página y el carrusel (portada)
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
| `abrir-lista` | Cabecera, barrita («Finalizar compra») | Abre Mi lista |
| `agregar` | Tarjetas, comparador, carrusel | Agrega a Mi lista (`data-id`) |
| `carrusel-mover` | Portada | Flechas del carrusel (`data-paso`: −1 / 1) |
| `piramide-capa` | Nosotros | Capa de la pirámide olfativa (`data-capa`: salida, corazon, fondo) |
| `cambiar-cantidad` | Mi lista | − / + (`data-linea`, `data-cambio`) |
| `copiar-lista`, `compartir-lista`, `copiar-y-abrir` | Mi lista | Copiar, compartir, copiar y abrir Instagram/Facebook |
| `filtrar` | Descubrir | Filtro de género (`data-genero`) |
| `filtrar-precio`, `limpiar-filtros` | Descubrir | Filtro de precio (`data-rango`) y «Quitar filtros» |
| `menu` | Cabecera (celular) | Abre y cierra el menú ☰ |
| `elegir-tamano`, `guardar-perfume` | Detalle | Elegir ml y guardar |
| `alternar-comparar`, `comparar-con` | Tarjetas, detalle | Agregar o quitar de la comparación |
| `abrir-selector`, `elegir-perfume`, `cerrar-selector` | Comparador | "Cambiar perfume" |
| `agregar-a-comparacion`, `quitar-de-comparacion`, `limpiar-comparacion` | Comparador, barrita | Tercer perfume, quitar, vaciar |
| `abrir-examen`, `examen-*` | Descubrir (botón junto al título y tarjeta en la cuadrícula) | Examen de gustos |
| `cerrar`, `saltar-bienvenida` | Ventanas, portada | Cerrar ventana, saltar animación |

---

## 3. CSS

Cada archivo es un tema. **El orden importa**: los de abajo pueden ajustar a los de arriba (está en `plantillas/comun-arriba.html`).

| Archivo | Qué estiliza |
|---|---|
| `base.css` | **Colores** (`:root`), letra, reglas generales |
| `componentes.css` | Botones (y sus animaciones), chips, etiqueta de descuento, frasco, vuelo a Mi lista, bloques de tres columnas |
| `cabecera.css` | Barra de arriba, logo, menú (en celular, el panel ☰) y "Mi lista" |
| `pie.css` | Pie de página |
| `dialogos.css` | Lo común a todas las ventanas |
| `avisos.css` | Aviso corto de abajo |
| `bienvenida.css` | Animación de entrada |
| `portada.css` | Portada |
| `carrusel.css` | Carrusel 3D de la portada |
| `catalogo.css` | Buscador, filtros (para quién y precio), orden y tarjetas |
| `producto.css` | Detalle del perfume |
| `mi-lista.css` | Mi lista (pasos, tarjetas, sugerencias, resumen), regalo y su aviso |
| `comparador.css` | Barrita (comparar y finalizar compra), comparador y selector |
| `examen.css` | Examen de gustos |
| `paginas.css` | Títulos de página, Contacto, Nosotros y páginas legales |
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
| `masVendido` | — | Lugar en «Lo más vendido» de la portada: `1` el primero, `2` el segundo… Sin este campo no sale. Si ninguno lo tiene, el carrusel muestra todos |

Campos de `modelos`: `foto` (nombre del .webp), `c` color del frasco, `v` 1 = vidrio, `t` color de tapa, `tp` tapa (`cubo`, `cilindro`, `corona`), `l` color de etiqueta, `e` texto de etiqueta (`|` = renglón), `w`/`h`/`d` medidas.

---

## 5. Recetas

> **Regla general:** después de cambiar cualquier archivo de `plantillas/`, `css/` o `js/`, corre *Generar páginas*.
> Además de armar los `.html`, le pone a cada CSS y JS una huella de su contenido (`css/base.css?v=1a2b3c4d`).
> Si el archivo cambia, cambia la huella y el navegador descarga el nuevo; si no, usa el que ya tenía guardado
> (GitHub Pages deja guardar los archivos 10 minutos, y sin la huella se mezclaba HTML nuevo con JS viejo).
> `data/perfumes.json` no lo necesita: siempre se pide sin caché.

**Agregar o cambiar un perfume** → `data/perfumes.json`. Guardar y recargar.

**Cambiar «Lo más vendido» de la portada** → en `data/perfumes.json`, pon `"masVendido": 1`, `2`, `3`… en los perfumes que quieras, en ese orden. Quítaselo a los que ya no.

**Cambiar las preguntas frecuentes** → `plantillas/paginas/contacto.html` (cada una es un `<details>`). Si tocan envíos, pagos o devoluciones, que digan lo mismo que los Términos.

**Cambiar WhatsApp, redes, correo, regalo, 3D del carrusel o fechas del tema** → `js/config.js` y luego *Generar páginas*.

**Cambiar lo que dicen el Aviso de privacidad o los Términos** → `plantillas/paginas/privacidad.html` o `terminos.html`, cambia la fecha de «Última actualización» y genera las páginas.

**Cambiar un color de todo el sitio** → `css/base.css`, en `:root`, y luego *Generar páginas*.

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

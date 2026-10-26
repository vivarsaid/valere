/* =============================================================================
   VISTA: CATÁLOGO
   -----------------------------------------------------------------------------
   Dibuja las tarjetas de perfumes:
     · descubrir.html → filtros #ch (para quién) y #chp (precio), el orden (#ord),
                        el contador (#nres) y #g (perfumes sin kits)
     · kits.html      → #kg (solo kits)
   La búsqueda (#q), los filtros y el orden se aplican al volver a pintar.

   Usa:     $, Catalogo, Formato, Pagina, Comparador
   Expone:  VistaCatalogo
   ============================================================================= */

const VistaCatalogo = (() => {
  let genero = ""; // "" = todos
  let busqueda = "";
  let precio = ""; // "" = todos, o la clave de RANGOS
  let orden = ""; // "" = como vienen en el JSON

  // Rangos del filtro de precio (sobre el precio más bajo de cada perfume).
  // Para cambiarlos, cambia los números: [clave, texto, desde, hasta]
  const RANGOS = [
    ["1", "Hasta $1,500", 0, 1500],
    ["2", "$1,500 a $2,500", 1500, 2500],
    ["3", "$2,500 a $3,000", 2500, 3000],
    ["4", "Más de $3,000", 3000, Infinity],
  ];
  const enRango = (p, clave) => {
    const r = RANGOS.find((x) => x[0] === clave);
    if (!r) return true;
    const m = Catalogo.precioMinimo(p);
    return m >= r[2] && m < r[3];
  };

  const ORDENES = {
    "precio-asc": (a, b) => Catalogo.precioMinimo(a) - Catalogo.precioMinimo(b),
    "precio-desc": (a, b) => Catalogo.precioMinimo(b) - Catalogo.precioMinimo(a),
    descuento: (a, b) =>
      Catalogo.descuento(b, Catalogo.primerTamano(b)) - Catalogo.descuento(a, Catalogo.primerTamano(a)),
    nombre: (a, b) => a.nombre.localeCompare(b.nombre, "es"),
  };
  const E = Formato.escapar;

  /** Los botones Todos / Hombre / Mujer / Unisex, y el atajo a Kits. */
  function pintarFiltros() {
    const caja = $("#ch");
    if (!caja) return;
    const opciones = [["", "Todos"], ...Object.entries(Formato.GENERO)];
    const botones = opciones
      .map(
        ([k, nombre]) =>
          `<button class="chip" data-accion="filtrar" data-genero="${k}" aria-pressed="${k === genero}">${nombre}</button>`
      )
      .join("");
    const hayKits = Catalogo.todos().some((p) => p.esKit);
    caja.innerHTML = botones + (hayKits ? `<a class="chip ks" href="kits.html">Kits de perfume ›</a>` : "");

    // Precio: solo los rangos en los que hay perfumes
    const cajaPrecio = $("#chp");
    if (!cajaPrecio) return;
    const perfumes = Catalogo.todos().filter((p) => !p.esKit);
    cajaPrecio.innerHTML = [["", "Todos"], ...RANGOS.filter(([k]) => perfumes.some((p) => enRango(p, k)))]
      .map(
        ([k, texto]) =>
          `<button class="chip" data-accion="filtrar-precio" data-rango="${k}" aria-pressed="${k === precio}">${texto}</button>`
      )
      .join("");
  }

  /** Una tarjeta. `n` es su posición (para escalonar la animación de entrada). */
  function tarjeta(p, n) {
    const tam = Catalogo.primerTamano(p);
    const subtitulo = p.esKit ? p.incluye || Formato.PARA[p.genero] || "" : p.familia;
    const desde = Object.keys(p.precios).length > 1 ? "Desde " : "";
    return (
      `<article class="card" data-id="${E(p.id)}" style="--i:${Math.min(n, 6)}">` +
      `<a class="main" href="${Pagina.enlacePerfume(p)}">` +
      `<div class="bt">${Formato.frasco(p)}${Formato.etiqueta(p, tam)}</div>` +
      `<small>${E(p.marca)}</small><b>${E(p.nombre)}</b><span>${E(subtitulo)}</span>` +
      `<em>${desde}${Formato.precio(p, tam)} <u>${Formato.tamano(tam)}</u></em>` +
      `</a>` +
      `<div class="act">` +
      `<button class="cp" data-accion="alternar-comparar" data-id="${E(p.id)}" aria-pressed="false">Comparar</button>` +
      `<button class="cp sv" data-accion="agregar" data-id="${E(p.id)}">+ Mi lista</button>` +
      `</div></article>`
    );
  }

  /** Mensaje cuando no hay tarjetas que mostrar en Descubrir. */
  function sinResultados(hayKitsQueCoinciden) {
    if (hayKitsQueCoinciden) return `Lo que buscas está en <a href="kits.html">Kits de perfume</a>.`;
    const hayEnCategoria = Catalogo.todos().some((p) => !p.esKit && (!genero || p.genero === genero));
    if (precio && hayEnCategoria) return "No hay perfumes en ese precio con estos filtros. Prueba con otro rango.";
    return hayEnCategoria
      ? "No encontramos perfumes con esa búsqueda. Prueba con otra palabra."
      : "Pronto tendremos perfumes en esta categoría.";
  }

  /** Vuelve a dibujar las tarjetas de la página actual. */
  function pintar() {
    const palabras = Texto.paraBuscar(busqueda).split(/\s+/).filter(Boolean);
    const coinciden = Catalogo.todos().filter((p) => Catalogo.coincide(p, palabras, genero));
    const perfumes = coinciden.filter((p) => !p.esKit && enRango(p, precio));
    if (ORDENES[orden]) perfumes.sort(ORDENES[orden]);
    const kits = coinciden.filter((p) => p.esKit);

    const g = $("#g");
    if (g) g.innerHTML = perfumes.map(tarjeta).join("") || `<p id="none">${sinResultados(kits.length > 0)}</p>`;

    // contador y "Quitar filtros"
    const n = $("#nres");
    if (n) n.textContent = perfumes.length === 1 ? "1 perfume" : `${perfumes.length} perfumes`;
    const quitar = $("#lfl");
    if (quitar) quitar.hidden = !(genero || precio || busqueda.trim());

    const kg = $("#kg");
    if (kg) kg.innerHTML = kits.map(tarjeta).join("") || `<p id="none">Pronto tendremos kits.</p>`;

    Comparador.marcar();
  }

  return {
    pintarFiltros,
    pintar,
    filtrar(g) {
      genero = g;
      pintarFiltros();
      pintar();
    },
    filtrarPrecio(rango) {
      precio = rango;
      pintarFiltros();
      pintar();
    },
    ordenar(o) {
      orden = o;
      pintar();
    },
    buscar(t) {
      busqueda = t;
      pintar();
    },
    /** "Quitar filtros": vuelve a todos (el orden elegido se respeta). */
    limpiar() {
      genero = "";
      precio = "";
      busqueda = "";
      const q = $("#q");
      if (q) q.value = "";
      pintarFiltros();
      pintar();
    },
    reiniciar() {
      genero = "";
      busqueda = "";
      precio = "";
      orden = "";
      const q = $("#q");
      if (q) q.value = "";
      const o = $("#ord");
      if (o) o.value = "";
    },
  };
})();

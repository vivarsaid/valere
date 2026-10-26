/* =============================================================================
   VISTA: CATÁLOGO
   -----------------------------------------------------------------------------
   Dibuja las tarjetas de perfumes:
     · descubrir.html → #ch (filtros por género) y #g (perfumes sin kits)
     · kits.html      → #kg (solo kits)
   La búsqueda (#q) y el filtro se aplican al volver a pintar.

   Usa:     $, Catalogo, Formato, Pagina, Comparador
   Expone:  VistaCatalogo
   ============================================================================= */

const VistaCatalogo = (() => {
  let genero = ""; // "" = todos
  let busqueda = "";
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
    return hayEnCategoria
      ? "No encontramos perfumes con esa búsqueda. Prueba con otra palabra."
      : "Pronto tendremos perfumes en esta categoría.";
  }

  /** Vuelve a dibujar las tarjetas de la página actual. */
  function pintar() {
    const palabras = Texto.paraBuscar(busqueda).split(/\s+/).filter(Boolean);
    const coinciden = Catalogo.todos().filter((p) => Catalogo.coincide(p, palabras, genero));
    const perfumes = coinciden.filter((p) => !p.esKit);
    const kits = coinciden.filter((p) => p.esKit);

    const g = $("#g");
    if (g) g.innerHTML = perfumes.map(tarjeta).join("") || `<p id="none">${sinResultados(kits.length > 0)}</p>`;

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
    buscar(t) {
      busqueda = t;
      pintar();
    },
    reiniciar() {
      genero = "";
      busqueda = "";
      const q = $("#q");
      if (q) q.value = "";
    },
  };
})();

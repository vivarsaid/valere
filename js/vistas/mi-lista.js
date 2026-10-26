/* =============================================================================
   VISTA: MI LISTA (ventana #cd, en todas las páginas)
   -----------------------------------------------------------------------------
   Dibuja Mi lista:
     · arriba, los tres pasos (Elige → Envía → Confirmamos) y cuántas piezas van;
     · cada perfume en una tarjeta con su frasco (sobre el color del perfume),
       descuento, precio de antes y cantidad. Con una sola pieza, el "−" se
       vuelve un botecito de basura. El que se acaba de agregar entra con un destello;
     · "Te puede gustar": sugerencias que se agregan con un toque (con la lista
       vacía se llaman "Para empezar");
     · abajo, el resumen (precio normal, descuentos, regalo, total), el regalo y
       los botones para mandar la lista.
   También actualiza el número junto a "Mi lista" en la cabecera (#bn).

   Usa:     $, Lista, Regalo, Config, Formato, Catalogo, Pagina, Barra
   Expone:  VistaLista
   ============================================================================= */

const VistaLista = (() => {
  const E = Formato.escapar;
  const M = Formato.dinero;
  const SUGERENCIAS = 6; // cuántas salen en "Te puede gustar"

  // Botecito de basura: sale en lugar del "−" cuando solo queda una pieza
  const BASURA =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>';

  let clavesAntes = null; // qué líneas había la vez pasada (para el destello de la nueva)
  let totalAnterior = -1;

  /** Una tarjeta de la lista. */
  function linea(l, i, nueva) {
    const p = l.perfume;
    const tam = l.item.tam;
    const cantidad = l.item.cantidad;
    const antes = Catalogo.precioAntes(p, tam);
    const descuento = Catalogo.descuento(p, tam);
    const menos =
      cantidad > 1
        ? `<button data-accion="cambiar-cantidad" data-linea="${i}" data-cambio="-1" aria-label="Quitar una pieza">−</button>`
        : `<button class="bo" data-accion="cambiar-cantidad" data-linea="${i}" data-cambio="-1" aria-label="Quitar ${E(p.nombre)} de la lista">${BASURA}</button>`;
    return (
      `<div class="ln${nueva ? " nueva" : ""}" style="--pc:${E(p.color)}">` +
      `<a class="lf" href="${E(Pagina.enlacePerfume(p))}" tabindex="-1" aria-hidden="true">${Formato.frascoDibujado(p.color)}</a>` +
      `<div class="lt"><small>${E(p.marca)}</small><b>${E(p.nombre)}</b>` +
      `<span>${Formato.tamano(tam)}${descuento ? ` <i class="dc">−${descuento}%</i>` : ""}</span>` +
      `<div class="qt">${menos}<i>${cantidad}</i>` +
      `<button data-accion="cambiar-cantidad" data-linea="${i}" data-cambio="1" aria-label="Agregar una pieza">+</button></div></div>` +
      `<div class="pr">${antes ? `<s>${M(antes * cantidad)}</s>` : ""}<b>${M(l.subtotal)}</b>` +
      `${cantidad > 1 ? `<small>${M(l.precio)} c/u</small>` : ""}</div>` +
      `</div>`
    );
  }

  /** "Te puede gustar": perfumes que no están en la lista, del mismo tipo, con más descuento primero. */
  function sugerencias(titulo) {
    const enLista = new Set(Lista.items().map((x) => x.id));
    const generos = new Set(Lista.lineas().map((l) => l.perfume.genero));
    let opciones = Catalogo.todos().filter((p) => !p.esKit && !enLista.has(p.id));
    const parecidos = opciones.filter((p) => !generos.size || generos.has(p.genero) || p.genero === "u");
    if (parecidos.length >= 3) opciones = parecidos;
    const desc = (p) => Catalogo.descuento(p, Catalogo.primerTamano(p));
    opciones = opciones.sort((a, b) => desc(b) - desc(a)).slice(0, SUGERENCIAS);
    if (!opciones.length) return "";
    return (
      `<section class="sg"><h4>${titulo}</h4><div class="sg-l">` +
      opciones
        .map((p) => {
          const tam = Catalogo.primerTamano(p);
          return (
            `<div class="sg-c" style="--pc:${E(p.color)}">` +
            `<a class="sg-f" href="${E(Pagina.enlacePerfume(p))}" tabindex="-1" aria-hidden="true">${Formato.frascoDibujado(p.color)}${Formato.etiqueta(p, tam)}</a>` +
            `<small>${E(p.marca)}</small><b>${E(p.nombre)}</b><span>${M(p.precios[tam])}</span>` +
            `<button class="sg-a" data-accion="agregar" data-id="${E(p.id)}" aria-label="Agregar ${E(p.nombre)} a Mi lista">+</button>` +
            `</div>`
          );
        })
        .join("") +
      `</div></section>`
    );
  }

  /** Lista vacía: dibujo, botón para ir a elegir y sugerencias para empezar. */
  function vacia() {
    return (
      `<div id="em"><svg class="ev" viewBox="0 0 100 140" aria-hidden="true"><use href="#bo"/></svg>` +
      `<b>Tu lista está vacía</b>` +
      `<p>Toca «+ Mi lista» en los perfumes que te gusten y aquí se van juntando.</p>` +
      `<a class="btn" href="descubrir.html">Ver perfumes</a></div>` +
      sugerencias("Para empezar")
    );
  }

  /** La parte de "Envolver para regalo". */
  function pintarRegalo(hayPiezas) {
    const caja = $("#gf");
    if (!caja) return;
    const disponible = Config.regaloActivo;
    caja.hidden = !hayPiezas;
    caja.classList.toggle("off", !disponible);
    $("#gk").checked = Regalo.activo();
    $("#gk").setAttribute("aria-disabled", !disponible);
    $("#gn").hidden = !Regalo.activo();
    if ($("#gm").value !== Regalo.notaSinRecortar()) $("#gm").value = Regalo.notaSinRecortar();
    $("#gh").textContent = !disponible
      ? "No disponible en la página por ahora"
      : Config.regaloCosto
        ? `Costo del envoltorio: ${M(Config.regaloCosto)}`
        : "Lo preparamos listo para regalar.";
  }

  /** Los botones de envío: se apagan si la lista está vacía. */
  function pintarBotonesDeEnvio(hayPiezas) {
    const mensaje = Lista.mensaje();
    const enlaces = {
      sw: `https://wa.me/${Config.whatsapp}?text=${encodeURIComponent(mensaje)}`,
      si: Config.esMovil
        ? `https://ig.me/m/${Config.instagram}`
        : `https://www.instagram.com/${encodeURIComponent(Config.instagram)}/`,
      sf: `https://m.me/${Config.facebook}`,
    };
    for (const id in enlaces) {
      const a = $("#" + id);
      if (hayPiezas) {
        a.href = enlaces[id];
        a.removeAttribute("aria-disabled");
      } else {
        a.removeAttribute("href");
        a.setAttribute("aria-disabled", "true");
      }
    }
    ["#sc", "#sh"].forEach((sel) =>
      hayPiezas ? $(sel).removeAttribute("aria-disabled") : $(sel).setAttribute("aria-disabled", "true")
    );
  }

  /** El resumen: precio normal, descuentos, regalo y total (que da un brinquito al cambiar). */
  function pintarResumen(total, ahorro, extraRegalo) {
    $("#rn").textContent = M(total + ahorro);
    $("#rnf").hidden = !ahorro; // sin descuentos, "precio normal" sería igual al total
    $("#sv").textContent = `−${M(ahorro)}`;
    $("#svf").hidden = !ahorro;
    $("#rgf").hidden = !extraRegalo;
    $("#rgv").textContent = M(extraRegalo);

    const totalFinal = total + extraRegalo;
    const ct = $("#ct");
    ct.textContent = M(totalFinal);
    if (totalAnterior >= 0 && totalAnterior !== totalFinal) {
      ct.classList.remove("cambia");
      void ct.offsetWidth;
      ct.classList.add("cambia");
    }
    totalAnterior = totalFinal;
  }

  /** Vuelve a dibujar todo Mi lista. Se llama cada vez que cambia la lista o el regalo. */
  function pintar() {
    const L = Lista.lineas();
    const n = Lista.piezas();
    const total = L.reduce((t, l) => t + l.subtotal, 0);
    const ahorro = L.reduce((t, l) => t + l.ahorro, 0);
    const extraRegalo = Regalo.activo() && n && Config.regaloCosto ? Config.regaloCosto : 0;

    // número en la cabecera
    $("#bn").textContent = n;
    $("#bn").dataset.n = n;

    // pasos: con algo en la lista, ya vas en "Envía"
    $("#cpasos").dataset.paso = n ? 2 : 1;
    $("#cn").textContent = n ? `${n} ${n === 1 ? "pieza" : "piezas"}` : "";

    // las tarjetas (la recién agregada entra con un destello)
    const claves = L.map((l) => l.item.id + "|" + l.item.tam);
    const nuevas = clavesAntes ? claves.filter((c) => !clavesAntes.includes(c)) : [];
    clavesAntes = claves;
    $("#ci").innerHTML = L.length
      ? L.map((l, i) => linea(l, i, nuevas.includes(claves[i]))).join("") + sugerencias("Te puede gustar")
      : vacia();

    $("#cf").hidden = !n; // con la lista vacía no hay resumen ni botones de envío
    pintarResumen(total, ahorro, extraRegalo);
    const aMano = $("#mn");
    if (aMano) aMano.hidden = true;

    pintarRegalo(n > 0);
    pintarBotonesDeEnvio(n > 0);
    Barra.pintar(); // "Finalizar compra" y el texto de la barrita
  }

  return { pintar };
})();

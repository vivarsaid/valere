/* =============================================================================
   VISTA: MI LISTA (ventana #cd, en todas las páginas)
   -----------------------------------------------------------------------------
   Dibuja las líneas de la lista, el total, lo que se ahorra, la opción de
   regalo y los botones para mandarla por WhatsApp, Instagram o Facebook.
   También actualiza el número junto a "Mi lista" en la cabecera (#bn).

   Cada perfume va en una tarjeta con su frasco; con una sola pieza, el "−" se
   vuelve un botecito de basura. Con la lista vacía se esconde la parte de abajo
   y sale un botón para ir a elegir.

   Usa:     $, Lista, Regalo, Config, Formato, Pagina, Barra
   Expone:  VistaLista
   ============================================================================= */

const VistaLista = (() => {
  const E = Formato.escapar;
  const M = Formato.dinero;

  // Botecito de basura: sale en lugar del "−" cuando solo queda una pieza
  const BASURA =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>';

  /** Una tarjeta de la lista: frasco, marca, nombre, tamaño, cantidad y subtotal. */
  function linea(l, i) {
    const p = l.perfume;
    const cantidad = l.item.cantidad;
    const menos =
      cantidad > 1
        ? `<button data-accion="cambiar-cantidad" data-linea="${i}" data-cambio="-1" aria-label="Quitar una pieza">−</button>`
        : `<button class="bo" data-accion="cambiar-cantidad" data-linea="${i}" data-cambio="-1" aria-label="Quitar ${E(p.nombre)} de la lista">${BASURA}</button>`;
    return (
      `<div class="ln">` +
      `<a class="lf" href="${E(Pagina.enlacePerfume(p))}" tabindex="-1" aria-hidden="true">${Formato.frascoDibujado(p.color)}</a>` +
      `<div class="lt"><small>${E(p.marca)}</small><b>${E(p.nombre)}</b>` +
      `<span>${Formato.tamano(l.item.tam)} · ${M(l.precio)} c/u</span></div>` +
      `<div class="lr"><div class="pr">${M(l.subtotal)}</div>` +
      `<div class="qt">${menos}<i>${cantidad}</i>` +
      `<button data-accion="cambiar-cantidad" data-linea="${i}" data-cambio="1" aria-label="Agregar una pieza">+</button>` +
      `</div></div></div>`
    );
  }

  /** Lista vacía: dibujo y botón para ir a elegir. */
  const VACIA =
    `<div id="em"><svg class="ev" viewBox="0 0 100 140" aria-hidden="true"><use href="#bo"/></svg>` +
    `<b>Tu lista está vacía</b>` +
    `<p>Toca «+ Mi lista» en los perfumes que te gusten y aquí se van juntando.</p>` +
    `<a class="btn" href="descubrir.html">Ver perfumes</a></div>`;

  let totalAnterior = -1;

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

    $("#ci").innerHTML = L.map(linea).join("") || VACIA;
    $("#cn").textContent = n ? `${n} ${n === 1 ? "pieza" : "piezas"}` : "";
    $("#cf").hidden = !n; // con la lista vacía no hay total ni botones de envío

    // el total da un brinquito cuando cambia
    const totalFinal = total + extraRegalo;
    const ct = $("#ct");
    ct.textContent = M(totalFinal);
    if (totalAnterior >= 0 && totalAnterior !== totalFinal) {
      ct.classList.remove("cambia");
      void ct.offsetWidth;
      ct.classList.add("cambia");
    }
    totalAnterior = totalFinal;
    $("#sv").textContent = ahorro > 0 ? `Ahorras ${M(ahorro)} con los descuentos` : "";
    const aMano = $("#mn");
    if (aMano) aMano.hidden = true;

    pintarRegalo(n > 0);
    pintarBotonesDeEnvio(n > 0);
    Barra.pintar(); // "Finalizar compra" aparece en cuanto hay algo en la lista
  }

  return { pintar };
})();

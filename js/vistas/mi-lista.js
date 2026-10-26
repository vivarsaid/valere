/* =============================================================================
   VISTA: MI LISTA (ventana #cd, en todas las páginas)
   -----------------------------------------------------------------------------
   Dibuja las líneas de la lista, el total, lo que se ahorra, la opción de
   regalo y los botones para mandarla por WhatsApp, Instagram o Facebook.
   También actualiza el número junto a "Mi lista" en la cabecera (#bn).

   Usa:     $, Lista, Regalo, Config, Formato, Barra
   Expone:  VistaLista
   ============================================================================= */

const VistaLista = (() => {
  const E = Formato.escapar;
  const M = Formato.dinero;

  function linea(l, i) {
    return (
      `<div class="ln"><div>` +
      `<b>${E(l.perfume.nombre)}</b><br>` +
      `<span>${E(l.perfume.marca)} · ${Formato.tamano(l.item.tam)} · ${M(l.precio)}</span>` +
      `<div class="qt">` +
      `<button data-accion="cambiar-cantidad" data-linea="${i}" data-cambio="-1" aria-label="Quitar uno">−</button>` +
      `<i>${l.item.cantidad}</i>` +
      `<button data-accion="cambiar-cantidad" data-linea="${i}" data-cambio="1" aria-label="Agregar uno">+</button>` +
      `</div></div>` +
      `<div class="pr">${M(l.subtotal)}</div></div>`
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

    $("#ci").innerHTML =
      L.map(linea).join("") ||
      `<p id="em">Aún no hay perfumes en tu lista.<br>Toca «+ Mi lista» en los que te gusten.</p>`;
    $("#ct").textContent = M(total + extraRegalo);
    $("#sv").textContent = ahorro > 0 ? `Con los descuentos ahorras ${M(ahorro)}` : "";
    const aMano = $("#mn");
    if (aMano) aMano.hidden = true;

    pintarRegalo(n > 0);
    pintarBotonesDeEnvio(n > 0);
    Barra.pintar(); // "Finalizar compra" aparece en cuanto hay algo en la lista
  }

  return { pintar };
})();

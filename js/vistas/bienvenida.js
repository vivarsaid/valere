/* =============================================================================
   VISTA: BIENVENIDA (animación de entrada, solo en index.html)
   -----------------------------------------------------------------------------
   El logo se dibuja trazo a trazo y luego desaparece. La animación es puro CSS
   (css/bienvenida.css); aquí solo se acomoda el acento de la "è" sobre la letra
   real (depende de la fuente) y se quita la capa al terminar, aunque la
   animación no corra.

   Si ya se vio en esta visita, js/base/antes-de-pintar.js pone html.noiv y la
   capa se quita de inmediato.

   Usa:     $
   Expone:  Bienvenida
   ============================================================================= */

const Bienvenida = (() => {
  const capa = $("#iv");

  if (capa && document.documentElement.classList.contains("noiv")) {
    capa.remove();
  } else if (capa) {
    /** Coloca el acento (#ia) justo encima de la "e" (#ie). */
    const colocarAcento = () => {
      if (!capa.isConnected) return;
      const palabra = $("#iw");
      const W = palabra.getBoundingClientRect();
      const e = $("#ie").getBoundingClientRect();
      const base = $("#ib").getBoundingClientRect();
      const estilo = getComputedStyle(palabra);
      const medidor = document.createElement("canvas").getContext("2d");
      medidor.font = estilo.font;
      const tam = parseFloat(estilo.fontSize) * 0.2;
      const acento = $("#ia");
      acento.style.width = acento.style.height = tam + "px";
      acento.style.left = e.left - W.left + e.width / 2 - tam / 2 + "px";
      acento.style.top = base.bottom - W.top - medidor.measureText("e").actualBoundingBoxAscent - tam * 1.3 + "px";
    };
    const colocar = () => {
      try {
        colocarAcento();
      } catch (_) {}
    };
    colocar();
    try {
      if (document.fonts) {
        document.fonts.ready.then(colocar);
        document.fonts.addEventListener("loadingdone", colocar);
      }
    } catch (_) {}
    addEventListener("resize", colocar);

    // Se quita sola (con el tema de temporada la animación dura más).
    const espera = document.documentElement.classList.contains("hw") ? 8000 : 6500;
    setTimeout(() => {
      try {
        capa.remove();
      } catch (_) {}
    }, espera);
    capa.addEventListener("animationend", (e) => {
      if (e.target === capa && e.animationName.startsWith("out")) capa.remove();
    });
  }

  return {
    /** Botón "Saltar". */
    saltar() {
      const v = $("#iv");
      if (v) v.style.animation = "out2 .4s forwards";
    },
  };
})();

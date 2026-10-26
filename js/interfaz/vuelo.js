/* =============================================================================
   VUELO A MI LISTA
   -----------------------------------------------------------------------------
   Al guardar un perfume, su frasco se hace chiquito y vuela en curva hasta el
   botón "Mi lista" de la cabecera, que da un saltito al recibirlo (como en las
   apps de comida a domicilio).

   · Sale del frasco más cercano al botón que se tocó: el de la tarjeta, el del
     detalle, el del carrusel o el de la columna del comparador.
   · La curva se logra con dos capas: la de afuera avanza de lado a velocidad
     pareja y la de adentro baja acelerando, como algo que cae.
   · Con "reducir movimiento" en el aparato no vuela: solo salta el botón.

   Usa:     $, Formato
   Expone:  Vuelo
   ============================================================================= */

const Vuelo = (() => {
  const sinMovimiento = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DURACION = 720;

  /** El dibujo del frasco desde donde sale el vuelo (o el propio botón si no hay frasco). */
  function origen(boton) {
    const zona = boton && boton.closest && boton.closest(".card, #pd, .car, .col");
    if (zona) {
      const frasco = zona.matches(".car")
        ? zona.querySelector(".car-plano")
        : zona.querySelector(".bt svg, .bt canvas, .im svg, .im canvas, .ct svg, .ct canvas");
      if (frasco && frasco.getBoundingClientRect().width) return frasco;
    }
    return boton;
  }

  /** El botón "Mi lista" da un saltito y su número brilla. */
  function saltito() {
    const bag = $("#bag");
    if (!bag) return;
    bag.classList.remove("recibe");
    void bag.offsetWidth; // reinicia la animación
    bag.classList.add("recibe");
  }

  /** El botón que se tocó confirma con un "✓" un momento. */
  function confirmar(boton) {
    if (!boton || !boton.classList) return;
    boton.classList.remove("hecho");
    void boton.offsetWidth;
    boton.classList.add("hecho");
    clearTimeout(boton._tHecho);
    boton._tHecho = setTimeout(() => boton.classList.remove("hecho"), 1300);
  }

  /**
   * Hace volar el frasco de `p` desde cerca de `boton` hasta "Mi lista".
   * @param boton  el botón que se tocó (para saber de dónde sale)
   * @param p      el perfume (para el color del frasco)
   */
  function aMiLista(boton, p) {
    confirmar(boton);
    const bag = $("#bag");
    if (sinMovimiento || !bag || !p || !document.body.animate) return saltito();

    const desde = origen(boton).getBoundingClientRect();
    const hasta = bag.getBoundingClientRect();
    if (!desde.width || !hasta.width) return saltito();

    // el frasco volador, del tamaño del de la tarjeta (máx. 150 px de alto)
    const alto = Math.min(150, Math.max(56, desde.height));
    const ancho = (alto * 100) / 140;
    const x0 = desde.left + desde.width / 2;
    const y0 = desde.top + desde.height / 2;
    const dx = hasta.left + hasta.width / 2 - x0;
    const dy = hasta.top + hasta.height / 2 - y0;

    const afuera = document.createElement("div");
    afuera.className = "vuelo";
    afuera.style.cssText = `left:${x0 - ancho / 2}px;top:${y0 - alto / 2}px;width:${ancho}px;height:${alto}px`;
    const adentro = document.createElement("div");
    adentro.innerHTML = Formato.frascoDibujado(p.color);
    afuera.appendChild(adentro);
    document.body.appendChild(afuera);

    // de lado: parejo
    afuera.animate([{ transform: "translateX(0)" }, { transform: `translateX(${dx}px)` }], {
      duration: DURACION,
      easing: "cubic-bezier(.3,.1,.6,1)",
      fill: "forwards",
    });
    // arriba-abajo y tamaño: primero crece un poquito, luego se encoge mientras sube
    const vuelo = adentro.animate(
      [
        { transform: "translateY(0) scale(1)", opacity: 1 },
        { transform: "translateY(-14px) scale(1.12)", opacity: 1, offset: 0.14 },
        { transform: `translateY(${dy * 0.55}px) scale(.55)`, opacity: 1, offset: 0.6 },
        { transform: `translateY(${dy}px) scale(.14)`, opacity: 0.35 },
      ],
      { duration: DURACION, easing: "cubic-bezier(.55,0,.7,.4)", fill: "forwards" }
    );
    vuelo.onfinish = vuelo.oncancel = () => {
      afuera.remove();
      saltito();
    };
  }

  return {
    aMiLista: (boton, p) => {
      try {
        aMiLista(boton, p);
      } catch (e) {
        saltito();
      }
    },
  };
})();

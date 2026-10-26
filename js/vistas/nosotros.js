/* =============================================================================
   VISTA: NOSOTROS (nosotros.html)
   -----------------------------------------------------------------------------
   Tres cosas, todas opcionales (si la página no las tiene, no hace nada):
     · Números (data-num): perfumes, marcas y el mayor descuento, calculados del
       catálogo. Suben contando cuando aparecen en pantalla.
     · Capítulos (.hs-p): aparecen al bajar, y el que está en el centro de la
       pantalla pinta el fondo (.hs-fondo) con su data-color.
     · Pirámide olfativa (.pi): al tocar una capa se ve qué es, con un ejemplo
       real del catálogo.

   Usa:     $, $$, Catalogo, Formato, Pagina
   Expone:  VistaNosotros
   ============================================================================= */

const VistaNosotros = (() => {
  const html = document.documentElement;
  const sinMovimiento = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const CAPAS = {
    salida: {
      titulo: "Notas de salida",
      dura: "Los primeros 15 a 30 minutos",
      texto:
        "Lo primero que hueles al ponértelo. Son notas ligeras y frescas, como cítricos o frutas, que se van rápido.",
    },
    corazon: {
      titulo: "Notas de corazón",
      dura: "De 30 minutos a unas horas",
      texto:
        "El carácter del perfume. Aparecen cuando la salida se va: suelen ser flores, especias o notas aromáticas.",
    },
    fondo: {
      titulo: "Notas de fondo",
      dura: "Horas, hasta el final del día",
      texto: "Lo que se queda en tu piel. Son las notas más pesadas, como maderas, vainilla, ámbar o almizcle.",
    },
  };
  let ejemplo = null; // el perfume que sirve de ejemplo en la pirámide

  /* ── Números ─────────────────────────────────────────────────────────────── */

  function pintarNumeros() {
    const casillas = $$("[data-num]");
    if (!casillas.length) return;
    const todos = Catalogo.todos();
    const perfumes = todos.filter((p) => !p.esKit);
    const valores = {
      perfumes: perfumes.length,
      marcas: new Set(todos.map((p) => p.marca)).size,
      descuento: Math.max(0, ...todos.map((p) => Catalogo.descuento(p, Catalogo.primerTamano(p)))),
    };
    const texto = (k, v) => (k === "descuento" ? `hasta ${v}%` : String(v));

    casillas.forEach((b) => {
      const k = b.dataset.num;
      const final = valores[k] || 0;
      b.textContent = texto(k, final);
      if (sinMovimiento || !window.IntersectionObserver) return;
      // cuando aparece en pantalla, cuenta de 0 al número
      b.textContent = texto(k, 0);
      const vigia = new IntersectionObserver((es) => {
        if (!es[0].isIntersecting) return;
        vigia.disconnect();
        const inicio = performance.now();
        const paso = (ahora) => {
          const t = Math.min(1, (ahora - inicio) / 900);
          b.textContent = texto(k, Math.round(final * (1 - Math.pow(1 - t, 3))));
          if (t < 1) requestAnimationFrame(paso);
        };
        requestAnimationFrame(paso);
      });
      vigia.observe(b);
    });
  }

  /* ── Capítulos con color ─────────────────────────────────────────────────── */

  function vigilarCapitulos() {
    const capitulos = $$(".hs-p[data-color]");
    const fondo = $(".hs-fondo");
    if (!capitulos.length || !fondo || !window.IntersectionObserver) {
      capitulos.forEach((c) => c.classList.add("visto"));
      return;
    }
    html.classList.add("hs-anima"); // sin JS, los capítulos se ven normales

    // aparecer al entrar en pantalla (una sola vez)
    const aparecer = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visto");
            aparecer.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -12% 0px" }
    );
    // el que cruza la franja del centro de la pantalla pinta el fondo
    const enCentro = new Set();
    const pintar = new IntersectionObserver(
      (es) => {
        es.forEach((e) => (e.isIntersecting ? enCentro.add(e.target) : enCentro.delete(e.target)));
        const activo = capitulos.find((c) => enCentro.has(c));
        fondo.style.setProperty("--hs-c", activo ? activo.dataset.color : "transparent");
        fondo.classList.toggle("on", !!activo);
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    capitulos.forEach((c) => {
      aparecer.observe(c);
      pintar.observe(c);
    });
  }

  /* ── Pirámide olfativa ───────────────────────────────────────────────────── */

  /** El perfume del ejemplo: Eros si está, si no el primero con las tres capas. */
  function elegirEjemplo() {
    const completos = Catalogo.todos().filter(
      (p) => p.notas.salida.length && p.notas.corazon.length && p.notas.fondo.length
    );
    return completos.find((p) => p.id === "versace-eros") || completos[0] || null;
  }

  function capa(k) {
    const info = CAPAS[k];
    const caja = $(".pi");
    if (!info || !caja) return;
    $$(".pi-c", caja).forEach((b) => b.setAttribute("aria-pressed", b.dataset.capa === k));
    caja.dataset.activa = k; // por si se quiere dar estilo según la capa
    const E = Formato.escapar;
    $('[data-pi="dura"]', caja).textContent = info.dura;
    $('[data-pi="titulo"]', caja).textContent = info.titulo;
    $('[data-pi="texto"]', caja).textContent = info.texto;
    $('[data-pi="ejemplo"]', caja).innerHTML = ejemplo
      ? `En <a href="${E(Pagina.enlacePerfume(ejemplo))}">${E(ejemplo.nombre)} de ${E(ejemplo.marca)}</a>: ` +
        `${E(ejemplo.notas[k].join(", "))}.`
      : "";
    const t = $(".pi-t", caja);
    t.classList.remove("cambio");
    void t.offsetWidth; // reinicia la animación
    t.classList.add("cambio");
  }

  /* ── Arranque ────────────────────────────────────────────────────────────── */

  /** Se llama una vez, cuando ya cargó el catálogo. */
  function iniciar() {
    if (Pagina.actual !== "nosotros") return;
    pintarNumeros();
    vigilarCapitulos();
    if ($(".pi")) {
      ejemplo = elegirEjemplo();
      capa("salida");
    }
  }

  return { iniciar, capa };
})();

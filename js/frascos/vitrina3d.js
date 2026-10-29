/* =============================================================================
   VITRINA 3D: EL FRASCO QUE GIRA EN EL DETALLE DEL PERFUME (perfume.html)
   -----------------------------------------------------------------------------
   Pone, encima del frasco plano, el mismo frasco en 3D que se ve en el
   carrusel (js/frascos/taller3d.js). Gira despacio solo; con el dedo, el
   mouse o la barra de abajo (‹ ━━●━━ ›) se puede girar. Mientras Three.js no
   carga, se ve el frasco plano.

   · No dibuja si no se ve, si la pestaña está oculta o hay una ventana abierta.
   · En modo ligero, sin WebGL o con AJUSTES.CARRUSEL_3D = false se queda plano.
   · Si se abre otro perfume, la vitrina anterior se apaga y suelta la memoria.

   Usa:     Taller3D, Config
   Expone:  Vitrina3D
   ============================================================================= */

const Vitrina3D = (() => {
  const html = document.documentElement;
  const sinMovimiento = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let actual = null; // { apagar() } de la vitrina que se ve

  /** Pone el frasco 3D de `p` dentro de `caja` (el recuadro del frasco del detalle). */
  function montar(caja, p) {
    if (actual) actual.apagar();
    actual = null;
    if (!caja || !p || !Config.carrusel3d || html.classList.contains("lite")) return;

    const lienzo = document.createElement("canvas");
    lienzo.className = "vt-gl";
    lienzo.setAttribute("aria-hidden", "true");
    caja.appendChild(lienzo);

    let vivo = true;
    actual = {
      apagar() {
        vivo = false;
      },
    };

    Taller3D.cargarThree()
      .then((THREE) => {
        if (!vivo || !lienzo.isConnected) return;
        actual = iniciar(THREE, caja, lienzo, p);
        caja.classList.add("con-3d");
      })
      .catch((e) => console.warn("[valère] el detalle sigue sin 3D", e));
  }

  function iniciar(THREE, caja, lienzo, p) {
    const dpr = devicePixelRatio || 1;
    const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: dpr < 2, alpha: true });
    renderer.setPixelRatio(Math.min(dpr, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    const escena = new THREE.Scene();
    const camara = new THREE.PerspectiveCamera(30, 1, 0.1, 40);
    camara.position.set(0, 0.1, 8.4);

    const frasco = Taller3D.nuevo(THREE, renderer, escena).armar(p);
    frasco.scale.setScalar(1.05);
    escena.add(frasco);

    function ajustar() {
      const w = Math.max(1, caja.clientWidth);
      const h = Math.max(1, caja.clientHeight);
      renderer.setSize(w, h, false);
      camara.aspect = w / h;
      camara.updateProjectionMatrix();
      dibujarUnaVez = true;
      despertar();
    }

    let giro = 0.5; // ángulo actual
    let velocidad = sinMovimiento ? 0 : 0.45; // rad/s, el giro solo
    /* Barra para girar (‹ ━━●━━ ›): al moverla, el frasco va a ese ángulo y deja de girar solo */
    const barra = document.createElement("label");
    barra.className = "vt-giro";
    barra.innerHTML =
      '<span aria-hidden="true">‹</span><input type="range" min="0" max="360" step="1" value="30" aria-label="Girar el frasco"><span aria-hidden="true">›</span>';
    caja.appendChild(barra);
    const deslizador = barra.querySelector("input");
    const pintarBarra = () => {
      const grados = ((((giro * 180) / Math.PI) % 360) + 360) % 360;
      deslizador.value = Math.round(grados);
      deslizador.style.setProperty("--avance", (grados / 360) * 100 + "%");
    };
    deslizador.addEventListener("input", () => {
      velocidad = 0; // ya lo está girando la persona
      giro = (+deslizador.value * Math.PI) / 180;
      deslizador.style.setProperty("--avance", (+deslizador.value / 360) * 100 + "%");
      despertar();
    });

    /* Girar con el dedo o el mouse (de lado); arriba-abajo sigue bajando la página */
    let arrastre = null;
    lienzo.addEventListener("pointerdown", (e) => {
      arrastre = { x: e.clientX, g: giro, id: e.pointerId };
    });
    lienzo.addEventListener("pointermove", (e) => {
      if (!arrastre) return;
      const dx = e.clientX - arrastre.x;
      if (Math.abs(dx) > 4) {
        try {
          lienzo.setPointerCapture(arrastre.id);
        } catch (_) {}
      }
      giro = arrastre.g + dx * 0.012;
      despertar();
    });
    const soltar = () => (arrastre = null);
    lienzo.addEventListener("pointerup", soltar);
    lienzo.addEventListener("pointercancel", soltar);

    /* Ciclo de dibujo: solo cuando se ve */
    let visible = true;
    let corriendo = false;
    let vivo = true;
    let ultimo = 0;
    let t = 0;
    let dibujarUnaVez = true;
    const pausado = () => !vivo || !visible || document.hidden || html.classList.contains("lock");

    function cuadro(ahora) {
      corriendo = false;
      if (pausado()) return;
      const dt = Math.min((ahora - ultimo) / 1000, 0.05);
      ultimo = ahora;
      t += dt;
      if (!arrastre) giro += velocidad * dt;
      frasco.rotation.set(0.06, giro, 0);
      if (velocidad || arrastre) pintarBarra();
      frasco.position.y = sinMovimiento ? 0 : Math.sin(t * 1.1) * 0.08;
      renderer.render(escena, camara);
      dibujarUnaVez = false;
      if (velocidad || arrastre || dibujarUnaVez) {
        corriendo = true;
        requestAnimationFrame(cuadro);
      }
    }
    function despertar() {
      if (corriendo || pausado()) return;
      corriendo = true;
      ultimo = performance.now();
      requestAnimationFrame(cuadro);
    }

    let vigia = null;
    if (window.IntersectionObserver) {
      vigia = new IntersectionObserver((es) => {
        visible = es[es.length - 1].isIntersecting;
        despertar();
      });
      vigia.observe(caja);
    }
    const alCambiarPestana = () => despertar();
    document.addEventListener("visibilitychange", alCambiarPestana);
    const vigiaVentanas = new MutationObserver(despertar);
    vigiaVentanas.observe(html, { attributes: true, attributeFilter: ["class"] });
    const vigiaTamano = window.ResizeObserver ? new ResizeObserver(ajustar) : null;
    if (vigiaTamano) vigiaTamano.observe(caja);
    else addEventListener("resize", ajustar);

    ajustar();
    despertar();

    return {
      apagar() {
        vivo = false;
        if (vigia) vigia.disconnect();
        if (vigiaTamano) vigiaTamano.disconnect();
        vigiaVentanas.disconnect();
        document.removeEventListener("visibilitychange", alCambiarPestana);
        barra.remove();
        renderer.dispose();
        try {
          renderer.forceContextLoss();
        } catch (_) {}
      },
    };
  }

  return { montar };
})();

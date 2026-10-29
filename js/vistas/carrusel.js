/* =============================================================================
   VISTA: CARRUSEL 3D DE LA PORTADA (#car, solo en index.html)
   -----------------------------------------------------------------------------
   "Lo más vendido": los perfumes con "masVendido" en data/perfumes.json (si
   ninguno lo tiene, todos menos los kits) en un carrusel que se mueve con el
   dedo, el mouse, la rueda del trackpad (de lado), las flechas o el teclado.
   Si son pocos, se repiten para que el anillo se vea lleno.
   Los frascos se dibujan en 3D con Three.js y el fondo toma el color del
   perfume que está al centro. Tocar el frasco del centro abre su página.

   Para que se sienta fluido:
     · La página nunca espera al 3D. Primero se ve el frasco plano y Three.js
       se descarga después, cuando el navegador ya terminó lo demás.
     · Solo se arman los frascos cercanos al centro (uno por cuadro, para no
       trabar), y los lejanos no se dibujan. Las formas se comparten.
     · No dibuja nada si el carrusel no se ve, si la pestaña está oculta o si
       hay una ventana abierta (Mi lista, por ejemplo).
     · Quieto, dibuja a 30 cuadros por segundo; al moverse, a 60. Si el aparato
       va lento, baja la resolución él solo.
     · En modo ligero (html.lite), sin WebGL o con AJUSTES.CARRUSEL_3D = false
       se queda con el frasco plano: el carrusel funciona igual.

   El color del perfume del centro también se riega como resplandor por toda
   la portada (.car-brillo, ver regarBrillo).

   Usa:     $, $$, Catalogo, Formato, Pagina, Config, Registro, Taller3D
   Expone:  Carrusel
   ============================================================================= */

const Carrusel = (() => {
  const { hexARgb, numeroDe, aspecto } = Taller3D; // colores y forma de cada frasco
  const ALCANCE = 3.6; // cuántos frascos a cada lado del centro se dibujan
  const html = document.documentElement;
  const mod = (a, n) => ((a % n) + n) % n;
  const limitar = (v, a, b) => Math.min(b, Math.max(a, v));
  const dosCifras = (n) => String(n).padStart(2, "0");
  const sinMovimiento = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let caja = null; // <section id="car">
  const el = {};
  let perfumes = []; // los lugares del anillo (si son pocos, se repiten)
  let N = 0; // cuántos lugares tiene el anillo
  let distintos = 0; // cuántos perfumes distintos son (lo que dice el contador)
  const MINIMO_EN_ANILLO = 9; // con menos, los frascos brincarían de un lado al otro
  let fondos = []; // [r, g, b] del fondo de cada perfume

  let destino = 0; // a dónde va (entero cuando está quieto)
  let pos = 0; // dónde está ahorita (se acerca suave a destino)
  let mostrado = -1; // qué perfume dicen los textos
  let arrastre = null;
  let tocado = false;

  let gl = null; // el 3D, cuando ya cargó
  let visible = true;
  let corriendo = false;
  let ultimo = 0;
  let t = 0;
  let fondoActual = "";
  let giroActual = "";

  /* ── Colores y forma de cada frasco ──────────────────────────────────────── */

  /** El fondo: el mismo tono del perfume, pero oscuro (para que el texto blanco se lea). */
  function colorDeFondo(hex) {
    const [r, g, b] = hexARgb(hex).map((v) => v / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    let h = 0;
    let s = 0;
    if (d) {
      s = d / (1 - Math.abs(2 * l - 1));
      h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h = (h * 60 + 360) % 360;
    }
    const L = limitar(l * 0.5, 0.09, 0.24);
    const S = Math.min(s, 0.6);
    const c = (1 - Math.abs(2 * L - 1)) * S;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = L - c / 2;
    const [a, b2, c2] =
      h < 60
        ? [c, x, 0]
        : h < 120
          ? [x, c, 0]
          : h < 180
            ? [0, c, x]
            : h < 240
              ? [0, x, c]
              : h < 300
                ? [x, 0, c]
                : [c, 0, x];
    return [a + m, b2 + m, c2 + m].map((v) => Math.round(v * 255));
  }

  /* ── Textos de abajo ─────────────────────────────────────────────────────── */

  function pintarDatos(i) {
    const p = perfumes[i];
    const E = Formato.escapar;
    const tam = Catalogo.primerTamano(p);
    const detalle = [Formato.GENERO[p.genero], p.familia, Formato.tamano(tam)].filter(Boolean).join(" · ");

    el.num.textContent = dosCifras((i % distintos) + 1);
    el.datos.innerHTML =
      `<small>${E(p.marca)}</small><h2>${E(p.nombre)}</h2><p class="car-fam">${E(detalle)}</p>` +
      `<div class="car-pr"><span>${Formato.precio(p, tam)} ${Formato.etiqueta(p, tam)}</span>` +
      `<button class="btn" data-accion="agregar" data-id="${E(p.id)}">+ Mi lista</button></div>`;
    el.datos.classList.remove("cambio");
    void el.datos.offsetWidth; // reinicia la animación de entrada
    el.datos.classList.add("cambio");

    el.ver.href = Pagina.enlacePerfume(p);
    el.ver.setAttribute("aria-label", `Ver ${p.nombre} de ${p.marca}`);

    regarBrillo(colorDeBrillo(p.color));

    // Mientras no hay 3D, se ve el frasco plano del perfume del centro.
    if (!gl) {
      el.plano.style.setProperty("--cap", aspecto(p).tapa);
      el.plano.innerHTML = Formato.frascoDibujado(p.color);
    }
  }

  /**
   * El color del perfume se riega por la portada (.car-brillo). Son dos capas:
   * la nueva toma el color y aparece mientras la otra se apaga. Solo cambia la
   * transparencia, que es lo más barato de animar.
   */
  /** El tono del perfume, pero luminoso (un perfume casi negro no daría luz). */
  function colorDeBrillo(hex) {
    const [r, g, b] = hexARgb(hex).map((v) => v / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    let h = 0;
    let s = 0;
    if (d) {
      s = d / (1 - Math.abs(2 * l - 1));
      h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h = (h * 60 + 360) % 360;
    }
    return `hsl(${Math.round(h)} ${Math.round(Math.min(s, 0.75) * 100)}% ${Math.round(limitar(l, 0.42, 0.62) * 100)}%)`;
  }

  let capaBrillo = 0;
  function regarBrillo(color) {
    const capas = el.brillo;
    if (!capas || capas.length < 2) return;
    capaBrillo ^= 1;
    capas[capaBrillo].style.setProperty("--c", color);
    capas[capaBrillo].classList.add("on");
    capas[capaBrillo ^ 1].classList.remove("on");
  }

  /* ── Moverse ─────────────────────────────────────────────────────────────── */

  function interactuo() {
    if (tocado) return;
    tocado = true;
    caja.classList.add("tocado");
  }

  /** Avanza (+1) o regresa (−1) un perfume. */
  function mover(paso) {
    if (!N) return;
    interactuo();
    destino = Math.round(destino) + paso;
    despertar();
  }

  const pxPorFrasco = () => caja.clientWidth * (caja.clientWidth < 700 ? 0.42 : 0.26);

  /** Tocar sin arrastrar: el frasco del centro abre su página; uno de lado se trae al centro. */
  function tocar(e) {
    const indice = gl ? gl.frascoEn(e.clientX, e.clientY) : -1;
    const centro = mod(Math.round(destino), N);
    if (indice < 0) {
      // sin 3D: tocar el frasco plano abre el perfume (tocar el fondo no hace nada)
      const r = el.plano.getBoundingClientRect();
      const enFrasco = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!gl && enFrasco) Pagina.ir(Pagina.enlacePerfume(perfumes[centro]));
      return;
    }
    const d = mod(indice - centro + N / 2, N) - N / 2;
    if (Math.abs(d) < 0.5) Pagina.ir(Pagina.enlacePerfume(perfumes[indice]));
    else mover(Math.round(d));
  }

  function escucharGestos() {
    const esc = el.esc;

    // Arrastrar de lado mueve el carrusel; de arriba a abajo se deja al navegador (scroll de la página).
    esc.addEventListener("pointerdown", (e) => {
      if (e.button > 0) return;
      arrastre = { x: e.clientX, y: e.clientY, d0: destino, deLado: false, lx: e.clientX, lt: performance.now(), v: 0 };
      arrastre.id = e.pointerId;
    });
    esc.addEventListener("pointermove", (e) => {
      if (!arrastre) return;
      const dx = e.clientX - arrastre.x;
      const dy = e.clientY - arrastre.y;
      if (!arrastre.deLado) {
        if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
          arrastre.deLado = true;
          try {
            esc.setPointerCapture(arrastre.id);
          } catch (_) {}
          caja.classList.add("arrastrando");
          interactuo();
        } else {
          if (Math.abs(dy) > 10) arrastre = null; // está bajando la página
          return;
        }
      }
      destino = arrastre.d0 - dx / pxPorFrasco();
      const ahora = performance.now();
      const dt = ahora - arrastre.lt;
      if (dt > 0) {
        arrastre.v = 0.8 * arrastre.v + 0.2 * ((e.clientX - arrastre.lx) / dt);
        arrastre.lx = e.clientX;
        arrastre.lt = ahora;
      }
      despertar();
    });
    esc.addEventListener("pointerup", (e) => {
      if (!arrastre) return;
      const a = arrastre;
      arrastre = null;
      caja.classList.remove("arrastrando");
      if (!a.deLado) return tocar(e);
      // un deslizón rápido puede brincar hasta dos perfumes
      const impulso = limitar((-a.v * 140) / pxPorFrasco(), -0.9, 0.9);
      destino = Math.round(destino + impulso);
      despertar();
    });
    esc.addEventListener("pointercancel", () => {
      if (arrastre && arrastre.deLado) destino = Math.round(destino);
      arrastre = null;
      caja.classList.remove("arrastrando");
      despertar();
    });

    // Rueda o trackpad: solo el movimiento de lado (el de arriba-abajo baja la página).
    let acumulado = 0;
    let bloqueo = 0;
    esc.addEventListener(
      "wheel",
      (e) => {
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
        e.preventDefault();
        const ahora = performance.now();
        if (ahora < bloqueo) return;
        acumulado += e.deltaX;
        if (Math.abs(acumulado) > 50) {
          mover(acumulado > 0 ? 1 : -1);
          acumulado = 0;
          bloqueo = ahora + 480;
        }
      },
      { passive: false }
    );

    // Teclado: flechas izquierda/derecha cuando el foco está dentro del carrusel.
    caja.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") mover(1);
      else if (e.key === "ArrowLeft") mover(-1);
      else return;
      e.preventDefault();
    });

    // Solo trabaja cuando se ve.
    if (window.IntersectionObserver) {
      new IntersectionObserver((es) => {
        visible = es[es.length - 1].isIntersecting;
        despertar();
      }).observe(caja);
    }
    document.addEventListener("visibilitychange", despertar);
    // html.lock = hay una ventana abierta; al cerrarse, sigue.
    new MutationObserver(despertar).observe(html, { attributes: true, attributeFilter: ["class"] });

    // Con el carrusel debajo de la cabecera, la cabecera deja de desenfocar
    // (desenfocar algo que cambia 60 veces por segundo cuesta mucho).
    const revisarCabecera = () => {
      const r = caja.getBoundingClientRect();
      html.classList.toggle("car-bajo", r.top < 60 && r.bottom > 0);
    };
    addEventListener("scroll", revisarCabecera, { passive: true });
    revisarCabecera();
  }

  /* ── El ciclo de dibujo ──────────────────────────────────────────────────── */

  const pausado = () => !visible || document.hidden || html.classList.contains("lock");

  function despertar() {
    if (corriendo || pausado() || !N) return;
    corriendo = true;
    ultimo = performance.now();
    requestAnimationFrame(cuadro);
  }

  function cuadro(ahora) {
    corriendo = false;
    if (pausado()) return; // despertar() lo reanuda
    const dt = Math.min((ahora - ultimo) / 1000, 0.05);
    ultimo = ahora;
    t += dt;

    const antes = pos;
    pos += (destino - pos) * (1 - Math.exp(-dt * (arrastre ? 16 : 7.5)));
    if (Math.abs(destino - pos) < 0.0005) pos = destino;
    const moviendo = pos !== antes || !!(arrastre && arrastre.deLado);

    // Fondo: mezcla entre el color del perfume de este lado y el del siguiente.
    const i0 = Math.floor(pos);
    const f = pos - i0;
    const a = fondos[mod(i0, N)];
    const b = fondos[mod(i0 + 1, N)];
    const rgb = a.map((v, k) => Math.round(v + (b[k] - v) * f));
    const css = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
    if (css !== fondoActual) {
      caja.style.backgroundColor = css;
      fondoActual = css;
    }

    // El texto circular gira un poco con el carrusel (el giro lento lo hace el CSS).
    const giro = `rotate(${(pos * 26).toFixed(1)}deg)`;
    if (giro !== giroActual) {
      el.anillo.style.transform = giro;
      giroActual = giro;
    }

    const indice = mod(Math.round(destino), N);
    if (indice !== mostrado) {
      mostrado = indice;
      pintarDatos(indice);
    }

    let seguir = moviendo;
    if (gl) seguir = gl.dibujar(ahora, dt, t, rgb, moviendo) || seguir;
    if (seguir) {
      corriendo = true;
      requestAnimationFrame(cuadro);
    }
  }

  /* ── 3D ──────────────────────────────────────────────────────────────────── */

  function cargar3D() {
    if (!Config.carrusel3d || html.classList.contains("lite")) return;
    const empezar = () => {
      Taller3D.cargarThree()
        .then(
          (THREE) =>
            new Promise((listo) =>
              // deja respirar al navegador antes del trabajo pesado
              requestAnimationFrame(() => setTimeout(() => listo(THREE), 30))
            )
        )
        .then((THREE) => {
          gl = crear3D(THREE);
          caja.classList.add("con-3d");
          despertar();
        })
        .catch((e) => {
          gl = null;
          console.warn("[valère] el carrusel sigue sin 3D", e);
        });
    };
    const cuandoEsteLibre = () =>
      window.requestIdleCallback ? requestIdleCallback(empezar, { timeout: 2000 }) : setTimeout(empezar, 300);
    if (document.readyState === "complete") cuandoEsteLibre();
    else addEventListener("load", cuandoEsteLibre, { once: true });
  }

  function crear3D(THREE) {
    const lienzo = el.gl;
    const esCelular = Math.min(innerWidth, innerHeight) < 700;
    const dpr = devicePixelRatio || 1;
    const renderer = new THREE.WebGLRenderer({
      canvas: lienzo,
      antialias: dpr < 2, // en pantallas muy finas no hace falta y cuesta
      alpha: true,
      powerPreference: "default",
    });
    let resolucion = Math.min(dpr, esCelular ? 1.5 : 2);
    renderer.setPixelRatio(resolucion);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const escena = new THREE.Scene();
    escena.fog = new THREE.Fog(0x000000, 10, 18);
    const camara = new THREE.PerspectiveCamera(32, 1, 0.1, 60);

    // Reflejos, luces, materiales, formas y etiquetas: js/frascos/taller3d.js
    const taller = Taller3D.nuevo(THREE, renderer, escena);

    /* Un frasco completo */
    const frascos = new Array(N).fill(null);
    function armar(i) {
      const p = perfumes[i];
      const grupo = taller.armar(p);
      grupo.userData.indice = i;
      grupo.userData.fase = (numeroDe(p.id) % 100) / 10 + i * 1.7; // + i: los repetidos no flotan igual
      escena.add(grupo);
      frascos[i] = grupo;
      return grupo;
    }

    /* Tamaño del lienzo y cámara (según el tamaño del recuadro, no de la ventana) */
    const vista = { vertical: false, paso: 0.56, radio: 5.6, alturaBase: 0.35 };
    const punto = new THREE.Vector3();
    function ajustar() {
      const w = Math.max(1, caja.clientWidth);
      const h = Math.max(1, caja.clientHeight);
      renderer.setSize(w, h, false);
      camara.aspect = w / h;
      vista.vertical = camara.aspect < 0.9;
      camara.position.set(0, 0, vista.vertical ? 12.8 : 11.4);
      vista.paso = vista.vertical ? 0.46 : 0.56;
      vista.radio = vista.vertical ? 4.4 : 5.6;
      // los frascos van arriba, para dejar libre abajo el nombre y el precio
      vista.alturaBase = vista.vertical ? 1.25 : 1.05;
      escena.fog.near = camara.position.z - 1;
      escena.fog.far = camara.position.z + 7;
      camara.updateProjectionMatrix();
      camara.updateMatrixWorld();
      punto.set(0, vista.alturaBase, 0).project(camara);
      caja.style.setProperty("--tag-y", (((1 - punto.y) / 2) * h).toFixed(1) + "px");
      ultimoDibujo = 0; // dibuja en el siguiente cuadro
      despertar();
    }

    /* Tocar un frasco: ¿cuál es? (−1 si ninguno) */
    const rayo = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    function frascoEn(cx, cy) {
      const r = lienzo.getBoundingClientRect();
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      rayo.setFromCamera(ndc, camara);
      const golpe = rayo.intersectObjects(
        frascos.filter((f) => f && f.visible),
        true
      )[0];
      let o = golpe && golpe.object;
      while (o && o.userData.indice === undefined) o = o.parent;
      return o ? o.userData.indice : -1;
    }

    /* Si el aparato va lento, baja la resolución (hasta 1). */
    let tiempos = 0;
    let cuadros = 0;
    function medir(dt) {
      tiempos += dt;
      if (++cuadros < 40) return;
      const promedio = tiempos / cuadros;
      tiempos = 0;
      cuadros = 0;
      if (promedio > 1 / 40 && resolucion > 1) {
        resolucion = Math.max(1, resolucion - 0.25);
        renderer.setPixelRatio(resolucion);
        ajustar();
      }
    }

    // Antes del primer cuadro: los 5 del centro, para que no aparezcan de golpe.
    for (let d = -2; d <= 2; d++) if (N) frascos[mod(d, N)] || armar(mod(d, N));

    const flota = !sinMovimiento;
    let ultimoDibujo = 0;

    /** Dibuja un cuadro. Devuelve true si necesita seguir animando aunque esté quieto. */
    function dibujar(ahora, dt, tiempo, rgb, moviendo) {
      // Quieto, 30 cuadros por segundo bastan para que floten.
      if (!moviendo && ahora - ultimoDibujo < 32) return flota;
      if (moviendo) medir(dt);
      ultimoDibujo = ahora;

      escena.fog.color.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, THREE.SRGBColorSpace);
      const vel = destino - pos;
      const amp = flota ? 1 : 0;
      let armadosAhora = 0;
      for (let i = 0; i < N; i++) {
        const d = mod(i - pos + N / 2, N) - N / 2;
        const ad = Math.abs(d);
        let b = frascos[i];
        if (ad > ALCANCE) {
          if (b) b.visible = false;
          continue;
        }
        if (!b) {
          if (armadosAhora++) continue; // uno nuevo por cuadro, para no trabar
          b = armar(i);
        }
        const fase = b.userData.fase;
        const th = d * vista.paso;
        b.visible = true;
        b.position.set(
          Math.sin(th) * vista.radio,
          vista.alturaBase + Math.sin(tiempo * 1.1 + fase) * 0.1 * amp - ad * 0.1,
          (Math.cos(th) - 1) * vista.radio
        );
        b.rotation.set(
          Math.sin(tiempo * 0.5 + fase) * 0.04 * amp,
          -th * 0.7 + vel * 0.9 + Math.sin(tiempo * 0.6 + fase) * 0.22 * amp,
          -vel * 0.12 - d * 0.07
        );
        b.scale.setScalar(1 - Math.min(ad, 2) * 0.09);
      }
      renderer.render(escena, camara);
      return flota || armadosAhora > 1; // si quedaron frascos por armar, sigue
    }

    ajustar();
    if (window.ResizeObserver) new ResizeObserver(ajustar).observe(caja);
    else addEventListener("resize", ajustar);
    return { dibujar, frascoEn };
  }

  /* ── Arranque ────────────────────────────────────────────────────────────── */

  /**
   * "Lo más vendido": los perfumes con "masVendido" en el JSON, del 1 en adelante.
   * Si ninguno lo tiene, salen todos (sin los kits), en el orden del JSON.
   */
  function elegirPerfumes() {
    const sinKits = Catalogo.todos().filter((p) => !p.esKit);
    const vendidos = sinKits.filter((p) => p.masVendido > 0).sort((a, b) => a.masVendido - b.masVendido);
    return vendidos.length ? vendidos : sinKits;
  }

  /** Se llama una vez, cuando ya cargó el catálogo. */
  function iniciar() {
    caja = $("#car");
    if (!caja || caja.dataset.listo) return;
    caja.dataset.listo = 1;
    perfumes = elegirPerfumes();
    distintos = perfumes.length;
    // Pocos perfumes: se repiten para llenar el anillo (el contador sigue diciendo 01 / 03)
    if (distintos) while (perfumes.length < MINIMO_EN_ANILLO) perfumes = perfumes.concat(perfumes.slice(0, distintos));
    N = perfumes.length;
    caja.hidden = !N;
    if (!N) return;

    el.esc = $(".car-esc", caja);
    el.anillo = $(".car-anillo", caja);
    el.gl = $(".car-gl", caja);
    el.plano = $(".car-plano", caja);
    el.ver = $(".car-ver", caja);
    el.num = $(".car-num b", caja);
    el.datos = $(".car-datos", caja);
    el.brillo = $$(".car-brillo i");
    $(".car-tot", caja).textContent = dosCifras(distintos);

    fondos = perfumes.map((p) => colorDeFondo(p.color));
    escucharGestos();
    despertar();
    cargar3D();
  }

  return { iniciar, mover: Registro.seguro(mover) };
})();

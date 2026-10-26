/* =============================================================================
   TEMPORADA: HALLOWEEN + DÍA DE MUERTOS
   -----------------------------------------------------------------------------
   Solo actúa cuando <html> tiene la clase "hw" (la decide js/base/antes-de-pintar.js
   según AJUSTES.TEMPORADA). Los estilos están en css/temporadas/halloween.css.

   Qué agrega:
     · Portada: luna, estrellas, calabaza, fantasma, cempasúchil, murciélagos y pétalos.
     · Cada perfume toma un "ambiente" según el color de su frasco (brillo y figura).
     · Mi lista: figuras de fondo con el ambiente de los perfumes elegidos.
     · Pantalla de carga con el logo que se vuelve luna al abrir WhatsApp/Instagram/Facebook.
     · Al tocar una figura, se anima y dice una frase.
     · Truco del dueño: 7 toques rápidos al logo prenden/apagan el tema en ese aparato.

   Para otra temporada (Navidad): copia este archivo y su CSS, cambia las
   figuras y frases, y usa otra clase en <html>.

   Usa:     Temporada, Catalogo, Lista, Comparador, VistaProducto, Avisos
   Expone:  Halloween { aura(p), prendido() }
   Escucha: "valere:listo" (js/app.js) para empezar
   ============================================================================= */

const Halloween = (() => {
  const html = document.documentElement;
  const prendido = () => html.classList.contains("hw");

  /* ── Figuras (SVG de 64×64) ──────────────────────────────────────────────── */
  function cempasuchil() {
    let s = "";
    for (let i = 0; i < 12; i++)
      s += `<ellipse cx="32" cy="14" rx="5.6" ry="11" transform="rotate(${i * 30} 32 32)" fill="${i % 2 ? "#ff9d1a" : "#ffb92e"}"/>`;
    for (let i = 0; i < 8; i++)
      s += `<ellipse cx="32" cy="21" rx="4" ry="7.5" transform="rotate(${i * 45 + 20} 32 32)" fill="#ff7a00"/>`;
    return s + `<circle cx="32" cy="32" r="5" fill="#b84300"/>`;
  }
  const FIGURAS = {
    moon: '<path d="M40 5A27 27 0 1 0 59 45 22 22 0 0 1 40 5z" fill="#ffe7b0"/><circle cx="22" cy="40" r="4" fill="#f2cf8a"/><circle cx="29" cy="21" r="3" fill="#f2cf8a"/><circle cx="14" cy="27" r="2" fill="#f2cf8a"/>',
    pumpkin:
      '<path d="M30 17c1-7 6-11 12-11l-1 6c-4 0-6 2-7 5z" fill="#3d9b3a"/><ellipse cx="32" cy="39" rx="27" ry="20" fill="#ff8a1f"/><ellipse cx="17" cy="39" rx="9" ry="19" fill="#ef7210"/><ellipse cx="47" cy="39" rx="9" ry="19" fill="#ef7210"/><ellipse cx="32" cy="39" rx="9" ry="20" fill="#ff9a35"/><path class="gl" d="M17 31h8l-4 8zM39 31h8l-4 8z" fill="#ffe27a"/><path class="gl" d="M20 46l4 4 4-3 4 3 4-3 4 3 4-4-3 8H23z" fill="#ffe27a"/>',
    bat: '<path class="wg" d="M32 27C26 16 14 12 2 17c4 4 5 9 4 15 4-3 9-3 12 1 2-5 7-6 11-3 1-1 2-2 3-3 1 1 2 2 3 3 4-3 9-2 11 3 3-4 8-4 12-1-1-6 0-11 4-15-12-5-24-1-30 10z" fill="#1d1336" stroke="#9b6dff" stroke-width="1.6"/><path d="M27 25l1-8 4 4 4-4 1 8c0 5-10 5-10 0z" fill="#1d1336" stroke="#9b6dff" stroke-width="1.6"/><circle cx="30" cy="25" r="1.2" fill="#ffd36b"/><circle cx="34" cy="25" r="1.2" fill="#ffd36b"/>',
    ghost:
      '<path class="fl" d="M12 57V28C12 14 20 6 32 6s20 8 20 22v29l-6-5-7 5-7-5-7 5-7-5z" fill="#f4f1ff"/><circle cx="24" cy="26" r="3.5" fill="#1d1336"/><circle cx="40" cy="26" r="3.5" fill="#1d1336"/><ellipse cx="32" cy="38" rx="4" ry="5.5" fill="#1d1336"/>',
    flower: cempasuchil(),
    star: '<path class="gl" d="M32 3c2 14 6 19 21 29-15 10-19 15-21 29-2-14-6-19-21-29C26 22 30 17 32 3z" fill="#fff3c4"/>',
  };
  const FRASES = {
    moon: "La luna también se perfuma.",
    pumpkin: "Esta calabaza huele a vainilla.",
    bat: "Shhh… ya vuelve.",
    ghost: "¡Bú! Soy un fantasma muy bien perfumado.",
    flower: "Cempasúchil: su aroma guía el camino a casa.",
    star: "Pide un deseo… y un perfume.",
  };
  const svg = (k) => `<svg viewBox="0 0 64 64" aria-hidden="true">${FIGURAS[k] || ""}</svg>`;

  /* ── Ambiente de cada perfume ────────────────────────────────────────────────
     Según el color del frasco: oscuro → noche (violeta), blanco → espectro,
     azul/verde → tóxico (verde), dorado/rojo → calabaza, lo demás → bruja.
     gl = color del brillo (r,g,b) · kit = las 3 figuras que lo acompañan. */
  const AMBIENTES = {
    noche: { gl: "155,110,255", kit: ["bat", "moon", "ghost"] },
    toxico: { gl: "120,255,70", kit: ["ghost", "star", "bat"] },
    calabaza: { gl: "255,138,31", kit: ["pumpkin", "flower", "flower"] },
    espectro: { gl: "255,255,255", kit: ["ghost", "moon", "star"] },
    bruja: { gl: "210,90,255", kit: ["bat", "star", "flower"] },
  };

  function aura(p) {
    let h = String((p && p.color) || "#3a3a3f").replace("#", "");
    if (h.length < 6)
      h = h
        .split("")
        .map((c) => c + c)
        .join("");
    const [r, g, b] = [0, 2, 4].map((i) => (parseInt(h.substr(i, 2), 16) || 0) / 255);
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b),
      luz = (max + min) / 2,
      d = max - min;
    const saturacion = d ? d / (1 - Math.abs(2 * luz - 1)) : 0;
    let tono = 0;
    if (d) {
      tono = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      tono = (tono * 60 + 360) % 360;
    }
    if (luz < 0.2) return AMBIENTES.noche;
    if (luz > 0.78 && saturacion < 0.3) return AMBIENTES.espectro;
    if (tono >= 95 && tono <= 240) return AMBIENTES.toxico;
    if (tono <= 70 || tono >= 345) return AMBIENTES.calabaza;
    return AMBIENTES.bruja;
  }
  const brillo = (a, opacidad) => `rgba(${a.gl},${opacidad})`;

  /* ── Crear figuras ───────────────────────────────────────────────────────── */

  /**
   * Una figura flotante (span.dk). Todo lo que crea el tema lleva data-hwd="1",
   * para poder quitarlo de golpe al apagarlo.
   * @param estilo   CSS en línea (posición, --s tamaño, --d duración...)
   * @param tocable  false = no reacciona al toque (las de las tarjetas)
   */
  function figura(k, estilo, clase, tocable) {
    const e = document.createElement("span");
    e.className = "dk" + (clase ? " " + clase : "") + (tocable === false ? " sm" : "");
    e.dataset.k = k;
    e.dataset.hwd = "1";
    e.setAttribute("aria-hidden", "true");
    e.style.cssText = estilo;
    e.innerHTML = svg(k);
    return e;
  }
  /** { right: "5%", "--s": "84px" } → "right:5%;--s:84px" (+ el brillo del ambiente) */
  const css = (o, a) =>
    Object.entries(o)
      .map(([k, v]) => `${k}:${v}`)
      .join(";") + (a ? `;--gl:${brillo(a, 0.8)}` : "");

  /* ── Portada ─────────────────────────────────────────────────────────────── */
  function decorarPortada() {
    const hero = $(".hero");
    if (!hero || $(".hwo", hero)) return;
    const capa = document.createElement("div");
    capa.className = "hwo";
    capa.dataset.hwd = "1";
    const poner = (k, o, a) => capa.appendChild(figura(k, css(o, a)));
    const { calabaza, noche, espectro } = AMBIENTES;
    poner("moon", { right: "5%", top: "6px", "--s": "84px", "--d": "7s", "--fy": "-6px" }, { gl: "255,214,140" });
    poner("star", { right: "20%", top: "46px", "--s": "22px", "--d": "3s" }, { gl: "255,230,150" });
    poner("star", { right: "3%", top: "120px", "--s": "16px", "--d": "4s", "--dl": "-1s" }, { gl: "255,230,150" });
    // Las de abajo se paran sobre la orilla de arriba del carrusel (--car-h, en
    // css/carrusel.css), para no tapar sus flechas ni el número.
    const sobre = (px) => `calc(var(--car-h, 0px) + ${px}px)`;
    poner("pumpkin", { left: "2.5%", bottom: sobre(10), "--s": "76px", "--d": "5s" }, calabaza);
    poner("ghost", { right: "3.5%", bottom: sobre(40), "--s": "66px", "--d": "6s", "--fy": "-14px" }, espectro);
    poner("flower", { left: "13%", bottom: sobre(16), "--s": "44px", "--d": "7s" }, calabaza);
    poner("flower", { right: "15%", bottom: sobre(18), "--s": "36px", "--d": "8s", "--dl": "-2s" }, calabaza);

    if (!html.classList.contains("lite")) {
      // murciélagos que cruzan: [arriba %, tamaño px, duración s, retraso s]
      [
        [8, 30, 22, 0],
        [24, 24, 26, -8],
        [40, 36, 30, -15],
      ].forEach(([arriba, tam, dur, retraso]) => {
        const vuelo = document.createElement("div");
        vuelo.className = "bf";
        vuelo.dataset.hwd = "1";
        vuelo.style.cssText = `top:${arriba}%;--s:${tam}px;--d:${dur}s;--dl:${retraso}s`;
        vuelo.appendChild(figura("bat", "--gl:rgba(155,109,255,.7)"));
        capa.appendChild(vuelo);
      });
      // pétalos de cempasúchil que caen
      for (let i = 0; i < 8; i++) {
        const petalo = document.createElement("i");
        petalo.className = "pt";
        petalo.style.cssText = `left:${6 + i * 12}%;--d:${11 + (i % 4) * 3}s;--dl:${-i * 1.7}s;--fx:${(i % 2 ? -1 : 1) * (20 + i * 5)}px`;
        capa.appendChild(petalo);
      }
    }
    hero.appendChild(capa);
    // fuera de pantalla, las animaciones de la portada se pausan (html.hwoff)
    try {
      new IntersectionObserver((es) => html.classList.toggle("hwoff", !es[0].isIntersecting)).observe(hero);
    } catch (_) {}
  }

  /* ── Tarjetas: se iluminan al pasar por el centro de la pantalla ─────────── */
  let observadorTarjetas = null;
  function vigilarTarjetas() {
    if (!window.IntersectionObserver) return;
    observadorTarjetas =
      observadorTarjetas ||
      new IntersectionObserver((es) => es.forEach((en) => en.target.classList.toggle("lit", en.isIntersecting)), {
        rootMargin: "-28% 0px -28% 0px",
      });
    const tarjetas = $$("#g .card,#kg .card");
    if (tarjetas.some((c) => !c.dataset.io)) {
      observadorTarjetas.disconnect();
      tarjetas.forEach((c) => {
        c.dataset.io = 1;
        observadorTarjetas.observe(c);
      });
    }
  }

  /* ── Decorar todo lo que haya en pantalla (cada elemento se marca con data-hw) */
  function decorar() {
    if (!prendido() || !Catalogo.todos().length) return;
    decorarPortada();

    $$("#g .card,#kg .card").forEach((c) => {
      const caja = $(".bt", c);
      const p = Catalogo.buscar(c.dataset.id);
      if (!caja || !p || caja.dataset.hw) return;
      const a = aura(p);
      caja.dataset.hw = 1;
      c.style.setProperty("--gl", brillo(a, 0.55));
      caja.style.setProperty("--gl", brillo(a, 0.6));
      caja.appendChild(figura(a.kit[0], css({ right: "2px", top: "0", "--s": "34px", "--d": "4s" }, a), "", false));
    });
    vigilarTarjetas();

    const im = $("#pd .im");
    const actual = VistaProducto.actual();
    if (im && !im.dataset.hw && actual) {
      im.dataset.hw = 1;
      const a = aura(actual);
      im.style.setProperty("--gl", brillo(a, 0.65));
      [
        [a.kit[0], { left: "8%", top: "10%", "--s": "54px", "--d": "5s" }],
        [a.kit[1], { right: "8%", bottom: "14%", "--s": "48px", "--d": "6s", "--dl": "-2s" }],
        [a.kit[2], { right: "64px", top: "12px", "--s": "38px", "--d": "4.5s", "--dl": "-1s" }],
      ].forEach(([k, o]) => im.appendChild(figura(k, css(o, a))));
    }

    const elegidos = Comparador.seleccion();
    $$("#cm .ct").forEach((c, k) => {
      const p = Catalogo.buscar(elegidos[k]);
      if (c.dataset.hw || !p) return;
      const a = aura(p);
      c.dataset.hw = 1;
      c.style.setProperty("--gl", brillo(a, 0.6));
      c.appendChild(figura(a.kit[k % 3], css({ right: "4px", bottom: "4px", "--s": "36px", "--d": "5s" }, a)));
    });

    decorarMiLista();
  }

  /** Mi lista: cada línea y el fondo toman el ambiente de sus perfumes. */
  function decorarMiLista() {
    const cd = $("#cd");
    if (!cd) return;
    const items = Lista.items();

    $$("#ci .ln").forEach((l, i) => {
      const p = items[i] && Catalogo.buscar(items[i].id);
      if (l.dataset.hw || !p) return;
      const a = aura(p);
      l.dataset.hw = 1;
      l.style.setProperty("--gl2", brillo(a, 0.2));
      l.appendChild(figura(a.kit[i % 3], css({ "--s": "34px", "--d": "4s" }, a)));
    });

    let fondo = $(".hwl", cd);
    if (!fondo) {
      fondo = document.createElement("div");
      fondo.className = "hwl";
      fondo.dataset.hwd = "1";
      cd.insertBefore(fondo, cd.firstChild);
    }
    const firma = items.map((x) => x.id).join("|");
    if (fondo.dataset.s === firma) return;
    fondo.dataset.s = firma;
    fondo.innerHTML = "";

    const perfumes = [...new Set(items.map((x) => x.id))].slice(0, 4).map(Catalogo.buscar).filter(Boolean);
    // lugares fijos: [izquierda, arriba, tamaño px]
    const LUGARES = [
      ["8%", "14%", 44],
      ["78%", "20%", 38],
      ["14%", "46%", 34],
      ["84%", "52%", 46],
      ["6%", "74%", 40],
      ["80%", "80%", 36],
      ["46%", "88%", 30],
      ["50%", "6%", 30],
    ];
    const piezas = [];
    (perfumes.length ? perfumes.map(aura) : [AMBIENTES.noche]).forEach((a) =>
      a.kit.forEach((k) => piezas.push([k, a]))
    );
    piezas.slice(0, LUGARES.length).forEach(([k, a], i) => {
      const [x, y, tam] = LUGARES[i];
      fondo.appendChild(
        figura(k, css({ left: x, top: y, "--s": tam + "px", "--d": 4 + (i % 4) + "s", "--dl": -i + "s" }, a))
      );
    });
  }

  /* ── Pantalla de carga al abrir un chat ──────────────────────────────────── */
  function pantallaDeCarga() {
    let l = $("#ld");
    if (!l) {
      l = document.createElement("div");
      l.id = "ld";
      l.setAttribute("role", "status");
      l.setAttribute("popover", "manual");
      l.innerHTML =
        `<div><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="lc" cx="50" cy="50" r="44"/><path class="lv" d="M31 40L50 74L69 40"/>` +
        `<path class="la" d="M42 22L52 30"/><path class="lm2" d="M62 18A34 34 0 1 0 82 66 27 27 0 0 1 62 18z" fill="#ffe7b0"/></svg><p></p></div>`;
      document.body.appendChild(l);
    }
    return l;
  }
  let tCarga = 0;
  function mostrarCarga(texto) {
    if (!prendido()) return;
    const l = pantallaDeCarga();
    $("p", l).textContent = texto;
    try {
      l.hidePopover();
      l.showPopover();
    } catch (_) {}
    l.classList.add("on");
    clearTimeout(tCarga);
    tCarga = setTimeout(ocultarCarga, 2600);
  }
  function ocultarCarga() {
    clearTimeout(tCarga);
    const l = $("#ld");
    if (!l) return;
    l.classList.remove("on");
    try {
      l.hidePopover();
    } catch (_) {}
  }

  /* ── Prender / apagar ────────────────────────────────────────────────────── */
  function quitarTodo() {
    $$("[data-hwd],#ld").forEach((e) => e.remove());
    $$("[data-hw]").forEach((e) => {
      delete e.dataset.hw;
      e.style.removeProperty("--gl");
      e.style.removeProperty("--gl2");
    });
    $$("[data-io]").forEach((e) => {
      delete e.dataset.io;
      e.classList.remove("lit");
    });
    if (observadorTarjetas) {
      observadorTarjetas.disconnect();
      observadorTarjetas = null;
    }
  }

  let pendiente = 0;
  const programar = () => {
    if (pendiente) return;
    pendiente = requestAnimationFrame(() => {
      pendiente = 0;
      try {
        decorar();
      } catch (e) {}
    });
  };

  function aplicar() {
    html.classList.toggle("hw", Temporada.activa());
    if (prendido()) programar();
    else quitarTodo();
  }

  /* ── Arranque ────────────────────────────────────────────────────────────── */
  function iniciar() {
    try {
      // Tocar una figura: se anima y dice su frase (máximo una frase cada 1.5 s).
      let ultimaFrase = 0;
      document.addEventListener(
        "click",
        (e) => {
          const d = e.target.closest && e.target.closest(".dk");
          if (!d || !prendido() || d.classList.contains("sm")) return;
          e.stopPropagation();
          e.preventDefault();
          d.classList.remove("go");
          void d.offsetWidth; // reinicia la animación
          d.classList.add("go");
          setTimeout(() => d.classList.remove("go"), 1300);
          const ahora = Date.now();
          if (ahora - ultimaFrase > 1500 && FRASES[d.dataset.k]) {
            ultimaFrase = ahora;
            Avisos.corto(FRASES[d.dataset.k]);
          }
        },
        true
      );

      // Pantalla de carga al tocar WhatsApp / Instagram / Facebook en Mi lista.
      document.addEventListener(
        "click",
        (e) => {
          const a = e.target.closest && e.target.closest("#sw,#si,#sf");
          if (!a || a.getAttribute("aria-disabled") === "true") return;
          mostrarCarga({ sw: "Abriendo WhatsApp…", si: "Abriendo Instagram…", sf: "Abriendo Facebook…" }[a.id]);
        },
        true
      );
      document.addEventListener("visibilitychange", ocultarCarga);
      addEventListener("pageshow", ocultarCarga);

      // Redecorar cuando cambia lo que hay en pantalla.
      ["#g", "#kg", "#pd", "#cm", "#ci", "#qz", "#cd"].forEach((sel) => {
        const el = $(sel);
        if (el) new MutationObserver(programar).observe(el, { childList: true, subtree: true });
      });

      // Truco del dueño: 7 toques al logo en menos de 3 s.
      let toques = 0;
      let primerToque = 0;
      document.addEventListener(
        "click",
        (e) => {
          if (!(e.target.closest && e.target.closest("header .logo"))) return;
          const ahora = Date.now();
          if (ahora - primerToque > 3000) {
            toques = 0;
            primerToque = ahora;
          }
          toques++;
          if (toques < 7) return;
          toques = 0;
          e.preventDefault();
          const estaba = prendido();
          Temporada.guardarEleccionDueno(!estaba);
          aplicar();
          Avisos.corto(
            estaba ? "Tema de temporada apagado en este dispositivo" : "Tema de temporada prendido en este dispositivo"
          );
        },
        true
      );
      addEventListener("storage", (e) => {
        if (e.key === Temporada.CLAVE_DUENO) aplicar();
      });

      // Revisar cada 5 minutos y al volver a la pestaña (por si cambió el día).
      const revisar = () => {
        try {
          if (Temporada.activa() !== prendido()) aplicar();
        } catch (_) {}
      };
      setInterval(revisar, 5 * 60 * 1000);
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) revisar();
      });

      if (prendido()) programar();
    } catch (e) {
      try {
        console.debug("[valère] tema", e);
      } catch (_) {}
    }
  }

  addEventListener("valere:listo", iniciar, { once: true });

  return { aura, prendido };
})();

/* =============================================================================
   VISTA: COMPARADOR (comparar.html)
   -----------------------------------------------------------------------------
   Compara hasta 3 perfumes lado a lado: frasco, precio, estilo, notas de
   salida/corazón/fondo, tamaños y las notas que comparten.

   Partes:
     · Botones "Comparar" de las tarjetas: en todas las páginas. La selección se
       guarda (clave "vx") y sigue al cambiar de página. La barrita flotante
       (#cb) la dibuja js/vistas/barra.js.
     · El comparador (#cm .cb): solo en comparar.html.
     · El selector "Cambiar perfume" (#pk): lista de todos los perfumes.

   Arriba de las notas: el radar de aromas y los veredictos (un ganador por
   categoría, la tarjeta se voltea al tocarla). Cada lado de la página se
   lleva una banda vertical con su color (columnas de color).

   Usa:     $, $$, Almacen, Catalogo, Formato, Texto, Pagina, Avisos, Ventanas, Barra, Examen, Taller3D
   Expone:  Comparador
   ============================================================================= */

const Comparador = (() => {
  const CLAVE = "vx";
  const MAXIMO = 3;
  const E = Formato.escapar;
  let seleccion = []; // ids de los perfumes que se comparan
  let columnaCambiando = -1; // qué columna se está cambiando en el selector
  let tCerrarSelector = 0;

  // Íconos de cada sección (trazos SVG de 48×48)
  const ICONOS = {
    estilo:
      '<path d="M24 5c1.4 10.5 6.4 15.6 17 19-10.6 3.4-15.6 8.5-17 19-1.4-10.5-6.4-15.6-17-19 10.6-3.4 15.6-8.5 17-19z"/>',
    salida: '<path d="M24 6C17 16 12 22 12 29a12 12 0 0 0 24 0c0-7-5-13-12-23z"/>',
    corazon: '<path d="M24 40S8 30 8 19a8 8 0 0 1 16-2 8 8 0 0 1 16 2c0 11-16 21-16 21z"/>',
    fondo: '<path d="M24 7L6 17l18 10 18-10z"/><path d="M6 24l18 10 18-10"/><path d="M6 31l18 10 18-10"/>',
    precio: '<path d="M6 24V8h16l20 20-16 16z"/><circle cx="15" cy="17" r="2.5"/>',
  };
  const icono = (k) => `<svg class="ic" viewBox="0 0 48 48" aria-hidden="true">${ICONOS[k]}</svg>`;

  // [clave en p.notas, título de la sección, nombre corto]
  const CAPAS = [
    ["salida", "Notas de salida", "Salida"],
    ["corazon", "Notas de corazón", "Corazón"],
    ["fondo", "Notas de fondo", "Fondo"],
  ];

  /* ── Selección ───────────────────────────────────────────────────────────── */

  /** Lee la selección guardada (se llama cuando ya cargó el catálogo). */
  function leer() {
    const guardada = Almacen.leer(CLAVE, []);
    seleccion = (Array.isArray(guardada) ? guardada : [])
      .map((x) => Catalogo.buscar(String(x)))
      .filter(Boolean)
      .map((p) => p.id);
  }

  const perfumes = () => seleccion.map(Catalogo.buscar);
  const primeroSinElegir = () => Catalogo.todos().find((p) => !seleccion.includes(p.id));

  /** Limpia la selección, la guarda y actualiza los botones y la barrita. */
  function marcar() {
    seleccion = seleccion.filter((id, k) => Catalogo.buscar(id) && seleccion.indexOf(id) === k).slice(0, MAXIMO);
    Almacen.guardar(CLAVE, seleccion);

    $$('[data-accion="alternar-comparar"]').forEach((b) => {
      const elegido = seleccion.includes(b.dataset.id);
      b.setAttribute("aria-pressed", elegido);
      b.textContent = elegido ? "✓ Comparando" : "Comparar";
    });

    Barra.pintar();
  }

  /* ── Colores: uno por perfume, siempre distintos entre sí ──────────────────
     Se usa el tono del perfume; si es casi gris (como Club de Nuit) o se parece
     mucho al de otro, se toma uno de la paleta. Así nunca se confunden. */
  const PALETA = ["#d4ad6e", "#4aa8c8", "#d26b7f", "#8fc97a", "#b48cf0"];
  function coloresDe(ps) {
    const tono = (hsl) => +hsl.match(/hsl\((\d+)/)[1];
    const satur = (hsl) => +hsl.match(/hsl\(\d+ (\d+)%/)[1];
    const tonoHex = (hex) => tono(Taller3D.colorVivo(hex));
    const cerca = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b)) < 40;
    const usados = [];
    return ps.map((p) => {
      let c = Taller3D.colorVivo(p.color);
      let t = tono(c);
      if (satur(c) < 25 || usados.some((u) => cerca(u, t))) {
        c = PALETA.find((x) => !usados.some((u) => cerca(u, tonoHex(x)))) || PALETA[usados.length % PALETA.length];
        t = tonoHex(c);
      }
      usados.push(t);
      return c;
    });
  }

  /* ── Aromas: cuánto tiene cada perfume de cada familia (para el radar y los veredictos) ── */

  /** { cit: { n: 2, notas: ["limón", "bergamota"] }, … } según las palabras de cada familia */
  function aromasDe(p) {
    const res = {};
    const todas = [p.familia, ...p.notas.salida, ...p.notas.corazon, ...p.notas.fondo];
    for (const [k, , palabras] of Examen.aromas()) {
      const notas = todas.filter((t) => {
        const x = Texto.normalizar(t);
        return palabras.some((w) => x.includes(w));
      });
      res[k] = { n: Math.min(3, notas.length), notas };
    }
    return res;
  }

  /** Radar de aromas: una telaraña de 5 puntas con un polígono por perfume. */
  function radar(ps, colores) {
    const fam = Examen.aromas();
    const C = 130; // centro
    const R = 92; // radio
    const punta = (k, f) => {
      const a = -Math.PI / 2 + (k * 2 * Math.PI) / fam.length;
      return [C + Math.cos(a) * R * f, C + Math.sin(a) * R * f];
    };
    const pts = (f) =>
      fam
        .map((_, k) =>
          punta(k, typeof f === "function" ? f(k) : f)
            .map((v) => v.toFixed(1))
            .join(",")
        )
        .join(" ");
    const red =
      [1, 2 / 3, 1 / 3].map((f) => `<polygon points="${pts(f)}"/>`).join("") +
      fam
        .map(
          (_, k) => `<line x1="${C}" y1="${C}" x2="${punta(k, 1)[0].toFixed(1)}" y2="${punta(k, 1)[1].toFixed(1)}"/>`
        )
        .join("");
    const etiquetas = fam
      .map(([k, nombre], i) => {
        const [x, y] = punta(i, 1.24);
        const ancla = x < C - 10 ? "end" : x > C + 10 ? "start" : "middle";
        return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="${ancla}">${E(nombre.split(" y ")[0])}</text>`;
      })
      .join("");
    const formas = ps
      .map((p, i) => {
        const a = aromasDe(p);
        const c = colores[i];
        return (
          `<polygon class="rd-p" style="--c:${c};animation-delay:${i * 0.18}s" ` +
          `points="${pts((k) => Math.max(0.08, a[fam[k][0]].n / 3))}"/>`
        );
      })
      .join("");
    const leyenda = ps
      .map((p, i) => {
        const a = aromasDe(p);
        const fuertes = Examen.aromas()
          .filter(([k]) => a[k].n)
          .sort((x, y) => a[y[0]].n - a[x[0]].n)
          .slice(0, 2)
          .map(([, nombre]) => nombre.split(" y ")[0].toLowerCase());
        return (
          `<li style="--c:${colores[i]}"><i></i><b>${E(p.nombre)}</b>` +
          `<span>${fuertes.length ? "Más " + fuertes.join(" y ") : "Sin notas suficientes"}</span></li>`
        );
      })
      .join("");
    return (
      `<section class="sec rdr"><h3 class="cen">Radar de aromas</h3>` +
      `<div class="rd-g"><svg viewBox="-70 -10 400 290" role="img" aria-label="Radar de aromas">` +
      `<g class="rd-red">${red}</g>${formas}<g class="rd-t">${etiquetas}</g></svg>` +
      `<ul class="rd-l">${leyenda}</ul></div></section>`
    );
  }

  /** Veredictos: un ganador por categoría; al tocar la tarjeta se voltea y muestra a todos. */
  function veredictos(ps, colores) {
    const M = Formato.dinero;
    const datos = ps.map((p) => ({ p, a: aromasDe(p) }));
    const tarjetas = [];
    const ganadorDe = (valor, mejorEsMenor) => {
      const vals = datos.map(valor);
      const validos = vals.filter((v) => v != null);
      if (!validos.length) return null;
      const mejor = mejorEsMenor ? Math.min(...validos) : Math.max(...validos);
      if (!mejorEsMenor && mejor <= 0) return null;
      const quienes = datos.filter((_, i) => vals[i] === mejor);
      return { quienes, vals };
    };
    const agregar = (titulo, icono, g, motivo, detalle) => {
      if (!g) return;
      const empate = g.quienes.length > 1;
      const p = g.quienes[0].p;
      tarjetas.push(
        `<button class="vr${empate ? " emp" : ""}" data-accion="voltear-veredicto" style="--c:${colores[ps.indexOf(p)]}" aria-label="${E(titulo)}: ver detalle">` +
          `<span class="vr-f"><small>${icono}${E(titulo)}</small><b>${empate ? "Empate" : E(p.nombre)}</b>` +
          `<i>${empate ? g.quienes.map((d) => E(d.p.nombre)).join(" y ") : E(motivo(g.quienes[0]))}</i><em>Toca para ver el detalle</em></span>` +
          `<span class="vr-d"><small>${E(titulo)}</small>` +
          datos.map((d, i) => `<span><b>${E(d.p.nombre)}</b>${E(detalle(d, g.vals[i]))}</span>`).join("") +
          `</span></button>`
      );
    };
    const FAM = { cit: "Más fresco", dul: "Más dulce", mad: "Más amaderado", flo: "Más floral", esp: "Más especiado" };
    for (const [k] of Examen.aromas()) {
      agregar(
        FAM[k],
        Examen.icono(k),
        ganadorDe((d) => d.a[k].n),
        (d) => d.a[k].notas.slice(0, 2).join(" · "),
        (d, v) => (v ? d.a[k].notas.join(", ") : "—")
      );
    }
    const porMl = (d) => {
      if (d.p.esKit) return null;
      const tam = Catalogo.primerTamano(d.p);
      return d.p.precios[tam] / tam;
    };
    agregar(
      "Mejor precio por ml",
      '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3C8 8.5 6 12 6 15a6 6 0 0 0 12 0c0-3-2-6.5-6-12z"/></svg>',
      ganadorDe(porMl, true),
      (d) => M(Math.round(porMl(d))) + " por ml",
      (d, v) => (v == null ? "Kit" : M(Math.round(v)) + " por ml")
    );
    const desc = (d) => Catalogo.descuento(d.p, Catalogo.primerTamano(d.p));
    agregar(
      "Mayor descuento",
      Examen.icono("precio"),
      ganadorDe(desc),
      (d) => "−" + desc(d) + "%",
      (d, v) => (v ? "−" + v + "%" : "Sin descuento")
    );
    if (!tarjetas.length) return "";
    return `<section class="sec vrs"><h3 class="cen">Veredictos</h3><div class="vr-g">${tarjetas.join("")}</div></section>`;
  }

  /** Una frase corta según la familia del perfume (para la ficha). */
  function fraseDe(p) {
    const f = Texto.normalizar(p.familia + " " + p.nombre);
    if (p.esKit) return "Un set listo para regalar.";
    if (/gourmand|vainilla|dulce/.test(f)) return "Dulce y envolvente.";
    if (/oriental|especiad|ambar|intens/.test(f)) return "Cálido e intenso.";
    if (/amaderad/.test(f)) return "Profundo y elegante.";
    if (/floral/.test(f)) return "Delicado y femenino.";
    if (/citric|fresc|acuatic|verde/.test(f)) return "Fresco y ligero.";
    if (/aromatic|fougere/.test(f)) return "Limpio y clásico.";
    return "Un aroma para descubrir.";
  }

  /* ── El comparador ───────────────────────────────────────────────────────── */

  /**
   * Con menos de 2 perfumes no hay tabla: se ven dos lugares ("＋ Elegir
   * perfume") para escogerlos. Así nunca se compara nada que no se eligió.
   */
  function pintarVacio(ps) {
    const lugar = (k) => {
      const p = ps[k];
      return p
        ? `<div class="cv-l lleno" style="--pc:${E(p.color)}"><div class="ct">${Formato.frasco(p)}</div>` +
            `<small>${E(p.marca)}</small><b>${E(p.nombre)}</b>` +
            `<button class="btn l cv-c" data-accion="abrir-selector" data-columna="${k}">Cambiar</button></div>`
        : `<button class="cv-l" data-accion="abrir-selector" data-columna="${k}" aria-haspopup="dialog">` +
            `<span class="cv-mas" aria-hidden="true">+</span><b>Elegir perfume</b><small>${k ? "el segundo" : "el primero"}</small></button>`;
    };
    $("#cm .cb").innerHTML =
      `<div class="cv"><div class="cv-g">${lugar(0)}<span class="cv-vs" aria-hidden="true">vs</span>${lugar(1)}</div>` +
      `<p class="lead">Elige dos perfumes y te mostramos lado a lado sus notas, su estilo y su precio. También puedes tocar «Comparar» en cualquier tarjeta de Descubrir.</p>` +
      `<p class="cv-ir"><a class="btn l" href="descubrir.html">Ir a Descubrir</a></p></div>`;
  }

  function pintar() {
    const ps = perfumes();
    const n = ps.length;
    if (n < 2) return pintarVacio(ps);
    const colores = coloresDe(ps); // uno por columna: bandas, radar y veredictos
    const M = Formato.dinero;
    const notas = (p, capa) => p.notas[capa];

    /** Cuántos perfumes tienen cada nota (para resaltar las repetidas). */
    function conteo(capa) {
      const porPerfume = ps.map((p) => new Set(notas(p, capa).map(Texto.normalizar)));
      const veces = {};
      porPerfume.forEach((s) => s.forEach((t) => (veces[t] = (veces[t] || 0) + 1)));
      const comunes = [
        ...new Map(
          ps
            .flatMap((p) => notas(p, capa))
            .filter((t) => veces[Texto.normalizar(t)] > 1)
            .map((t) => [Texto.normalizar(t), t])
        ).values(),
      ];
      return { porPerfume, veces, comunes };
    }

    const cm = $("#cm");
    const esVentana = cm.tagName === "DIALOG";
    const barraVentana = esVentana
      ? `<div class="cb-bar"><span></span><b>Comparar perfumes</b><button class="cx" data-accion="cerrar" aria-label="Cerrar">×</button></div>`
      : "";
    const SWAP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h12l-3-3M17 17H5l3 3"/></svg>';
    const porMl = (p) => (p.esKit ? 0 : p.precios[Catalogo.primerTamano(p)] / Catalogo.primerTamano(p));

    /* 1. Fichas: una por perfume, con su color, frasco, estilo, precio y botones */
    const fichas =
      `<div class="cmb-f" style="--n:${n}">` +
      ps
        .map((p, k) => {
          const tam = Catalogo.primerTamano(p);
          return (
            `<article class="cmf" style="--pc:${colores[k]};--i:${k}">` +
            `<div class="cmf-im">${Formato.frasco(p)}${Formato.etiqueta(p, tam)}</div>` +
            `<div class="cmf-t"><small>${E(p.marca)}</small><h3>${E(p.nombre)}</h3>` +
            `<span class="cmf-e">${E(p.familia || "Perfume")}</span>` +
            `<p class="cmf-fr">${E(fraseDe(p))}</p>` +
            `<p class="cmf-pr">${Formato.precio(p, tam)} <span>${Formato.tamano(tam)}</span></p></div>` +
            `<div class="cmf-b"><button class="btn" data-accion="agregar" data-id="${E(p.id)}">+ Mi lista</button>` +
            `<button class="sw" data-accion="abrir-selector" data-columna="${k}" aria-haspopup="dialog" aria-label="Cambiar ${E(p.nombre)}" title="Cambiar perfume">${SWAP}</button>` +
            (n > 2
              ? `<button class="sw rmx" data-accion="quitar-de-comparacion" data-columna="${k}" aria-label="Quitar ${E(p.nombre)}" title="Quitar">×</button>`
              : "") +
            `</div></article>`
          );
        })
        .join("") +
      `</div>`;

    /* 2. Números clave: precio por ml, descuento y tamaño, con barras */
    const maxMl = Math.max(...ps.map(porMl), 1);
    const maxDesc = Math.max(...ps.map((p) => Catalogo.descuento(p, Catalogo.primerTamano(p))), 1);
    const fila = (titulo, valor, ancho, mejor) =>
      `<div class="cmn-f"><span class="cmn-t">${titulo}</span><div class="cmn-v">` +
      ps
        .map((p, k) => {
          const v = valor(p);
          return (
            `<div class="cmn-c${mejor(p) ? " gana" : ""}" style="--pc:${colores[k]};--w:${ancho(p)}%">` +
            `<span class="cmn-n">${E(p.nombre)}</span><b>${v}</b><i></i></div>`
          );
        })
        .join("") +
      `</div></div>`;
    const mlMin = Math.min(...ps.filter((p) => !p.esKit).map(porMl));
    const numeros =
      `<section class="cmc cmn"><h3>En números</h3>` +
      fila(
        "Precio por ml",
        (p) => (p.esKit ? "Kit" : M(Math.round(porMl(p)))),
        (p) => (p.esKit ? 0 : Math.max(6, (porMl(p) / maxMl) * 100)),
        (p) => !p.esKit && porMl(p) === mlMin
      ) +
      fila(
        "Descuento",
        (p) => {
          const d = Catalogo.descuento(p, Catalogo.primerTamano(p));
          return d ? "−" + d + "%" : "—";
        },
        (p) => Math.max(4, (Catalogo.descuento(p, Catalogo.primerTamano(p)) / maxDesc) * 100),
        (p) => Catalogo.descuento(p, Catalogo.primerTamano(p)) === maxDesc
      ) +
      `<p class="cmn-a">La barra más corta en precio por ml es la que más rinde tu dinero.</p></section>`;

    /* 3. Notas: tabla compacta, las compartidas en bronce; sin datos, invitación al chat */
    const chat = Config.whatsapp
      ? `https://wa.me/${Config.whatsapp}?text=${encodeURIComponent("Hola valère, ¿me cuentan las notas de este perfume?")}`
      : "contacto.html";
    const tablaNotas =
      `<section class="cmc cmt"><h3>Notas</h3><p class="cmc-a">Las que comparten aparecen en bronce.</p>` +
      `<div class="cmt-g" style="--n:${n}"><span></span>` +
      ps.map((p, k) => `<span class="cmt-h" style="--pc:${colores[k]}"><i></i>${E(p.nombre)}</span>`).join("") +
      CAPAS.map(([capa, titulo]) => {
        const { veces } = conteo(capa);
        return (
          `<span class="cmt-c">${Texto.mayuscula(titulo.replace("Notas de ", ""))}</span>` +
          ps
            .map((p, k) => {
              const lista = notas(p, capa);
              const celda = lista.length
                ? lista.map((t) => `<i class="${veces[Texto.normalizar(t)] > 1 ? "cp2" : ""}">${E(t)}</i>`).join("")
                : `<a class="cmt-x" href="${E(chat)}" target="_blank" rel="noopener">Te contamos sus notas por chat ›</a>`;
              return `<div class="cmt-d" style="--pc:${colores[k]}" data-p="${E(p.nombre)}">${celda}</div>`;
            })
            .join("")
        );
      }).join("") +
      `</div></section>`;

    const comunes = CAPAS.flatMap(([capa]) => conteo(capa).comunes);
    const enComun =
      `<section class="cmc cmk"><h3>Tienen en común</h3>` +
      (comunes.length
        ? `<p>${comunes.map((t) => `<i>${E(Texto.mayuscula(t))}</i>`).join("")}</p>`
        : `<p class="mu">Estos perfumes no comparten notas: son muy distintos entre sí.</p>`) +
      `</section>`;

    const pie =
      `<div class="cmb-p">` +
      (n < MAXIMO && Catalogo.todos().length > n
        ? `<button class="btn l" data-accion="agregar-a-comparacion">+ Agregar otro perfume</button>`
        : "") +
      `<button class="cmb-q" data-accion="limpiar-comparacion">× Quitar comparación</button></div>`;

    // El tablero: fichas arriba; radar + veredictos; números; notas y en común (css/comparador.css)
    cm.querySelector(".cb").innerHTML =
      barraVentana +
      fichas +
      `<div class="cmb">` +
      `<div class="cmc cmr">${radar(ps, colores)}</div>` +
      `<div class="cmc cmv">${veredictos(ps, colores)}</div>` +
      numeros +
      enComun +
      tablaNotas +
      `</div>` +
      pie;
  }

  const repintar = () => {
    pintar();
    marcar();
  };

  /** En comparar.html dibuja el comparador; en las demás páginas lleva a comparar.html. */
  function abrir() {
    const cm = $("#cm");
    if (!cm) {
      marcar();
      return Pagina.ir("comparar.html");
    }
    if (Catalogo.todos().length < 2) return Avisos.corto("Agrega al menos 2 perfumes para comparar");
    repintar();
    if (cm.tagName === "DIALOG") Ventanas.abrir(cm);
  }

  /* ── Selector «Cambiar perfume» ──────────────────────────────────────────── */

  const selectorAbierto = () => {
    const pk = $("#pk");
    return !!pk && !pk.hidden;
  };

  function cerrarSelector(deInmediato) {
    const el = $("#pk");
    el.classList.remove("on");
    clearTimeout(tCerrarSelector);
    if (deInmediato) {
      el.hidden = true;
      return;
    }
    tCerrarSelector = setTimeout(() => (el.hidden = true), 320); // espera la animación
  }

  function abrirSelector(columna) {
    columnaCambiando = columna;
    const el = $("#pk");
    clearTimeout(tCerrarSelector);
    const filas = Catalogo.todos()
      .map((p) => {
        const esEste = seleccion[columna] === p.id;
        const yaEsta = !esEste && seleccion.includes(p.id);
        return (
          `<button class="pk-r" data-accion="elegir-perfume" data-id="${E(p.id)}"${yaEsta ? " disabled" : ""} aria-pressed="${esEste}">` +
          `<span class="pk-i">${Formato.frasco(p)}</span>` +
          `<span class="pk-t"><small>${E(p.marca)}</small><b>${E(p.nombre)}</b>` +
          `<i>${yaEsta ? "Ya está en la comparación" : Formato.precio(p, Catalogo.primerTamano(p))}</i></span>` +
          `<span class="pk-c">${esEste ? "✓" : ""}</span></button>`
        );
      })
      .join("");
    el.innerHTML =
      `<div class="pk-bg" data-accion="cerrar-selector"></div>` +
      `<div class="pk" role="dialog" aria-label="Cambiar perfume">` +
      `<div class="pk-h"><b>Cambiar perfume</b><button class="cx" data-accion="cerrar-selector" aria-label="Cerrar">×</button></div>` +
      `<div class="pk-l">${filas}</div></div>`;
    el.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("on")));
    const foco = el.querySelector('.pk-r[aria-pressed="true"]') || el.querySelector(".pk-r:not(:disabled)");
    foco && foco.focus({ preventScroll: true });
  }

  function elegir(id) {
    const k = Math.min(columnaCambiando, seleccion.length); // un lugar vacío se llena al final
    seleccion[k] = id;
    cerrarSelector();
    repintar();
    const boton = $(`[data-accion="abrir-selector"][data-columna="${k}"]`);
    boton && boton.focus({ preventScroll: true });
  }

  // Escape, Atrás o cerrar la ventana también cierran el selector.
  const cm = $("#cm");
  if (cm) {
    cm.addEventListener("cancel", (e) => {
      if (selectorAbierto()) {
        e.preventDefault();
        cerrarSelector();
      }
    });
    cm.addEventListener("close", () => cerrarSelector(true));
  }
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && selectorAbierto()) cerrarSelector();
  });
  Ventanas.alIrAtras(() => {
    if (selectorAbierto()) cerrarSelector(true);
  });

  return {
    leer,
    marcar,
    abrir,
    abrirSelector,
    cerrarSelector,
    elegir,
    seleccion: () => seleccion,

    /** Botón "Comparar" de una tarjeta: agrega o quita (si ya hay 3, sale el más viejo). */
    alternar(id) {
      const k = seleccion.indexOf(id);
      if (k >= 0) seleccion.splice(k, 1);
      else {
        if (seleccion.length >= MAXIMO) seleccion.shift();
        seleccion.push(id);
      }
      marcar();
    },
    /** "Comparar con otro" en el detalle: agrega este perfume y abre el comparador. */
    con(id) {
      if (!seleccion.includes(id)) {
        if (seleccion.length >= MAXIMO) seleccion.shift();
        seleccion.push(id);
      }
      if (VistaProducto.esVentana()) $("#pd").close();
      abrir();
    },
    quitar(columna) {
      seleccion.splice(columna, 1);
      repintar();
    },
    agregarOtro() {
      const p = primeroSinElegir();
      if (p && seleccion.length < MAXIMO) {
        seleccion.push(p.id);
        repintar();
      }
    },
    /** "Quitar comparación": vacía la selección (en comparar.html quedan los lugares vacíos). */
    limpiar() {
      seleccion = [];
      if ($("#cm .cb")) pintar();
      marcar();
    },
  };
})();

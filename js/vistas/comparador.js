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
   difumina con el color de su perfume.

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
  function radar(ps) {
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
        return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="${ancla}">${Examen.icono(k)} ${E(nombre.split(" y ")[0])}</text>`;
      })
      .join("");
    const formas = ps
      .map((p, i) => {
        const a = aromasDe(p);
        const c = Taller3D.colorVivo(p.color);
        return (
          `<polygon class="rd-p" style="--c:${c};animation-delay:${i * 0.18}s" ` +
          `points="${pts((k) => Math.max(0.08, a[fam[k][0]].n / 3))}"/>`
        );
      })
      .join("");
    const leyenda = ps
      .map((p) => {
        const a = aromasDe(p);
        const fuertes = Examen.aromas()
          .filter(([k]) => a[k].n)
          .sort((x, y) => a[y[0]].n - a[x[0]].n)
          .slice(0, 2)
          .map(([, nombre]) => nombre.split(" y ")[0].toLowerCase());
        return (
          `<li style="--c:${Taller3D.colorVivo(p.color)}"><i></i><b>${E(p.nombre)}</b>` +
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
  function veredictos(ps) {
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
        `<button class="vr${empate ? " emp" : ""}" data-accion="voltear-veredicto" style="--c:${Taller3D.colorVivo(p.color)}" aria-label="${E(titulo)}: ver detalle">` +
          `<span class="vr-f"><small>${icono} ${E(titulo)}</small><b>${empate ? "Empate" : E(p.nombre)}</b>` +
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
      "💧",
      ganadorDe(porMl, true),
      (d) => M(Math.round(porMl(d))) + " por ml",
      (d, v) => (v == null ? "Kit" : M(Math.round(v)) + " por ml")
    );
    const desc = (d) => Catalogo.descuento(d.p, Catalogo.primerTamano(d.p));
    agregar(
      "Mayor descuento",
      "🏷️",
      ganadorDe(desc),
      (d) => "−" + desc(d) + "%",
      (d, v) => (v ? "−" + v + "%" : "Sin descuento")
    );
    if (!tarjetas.length) return "";
    return `<section class="sec vrs"><h3 class="cen">Veredictos</h3><div class="vr-g">${tarjetas.join("")}</div></section>`;
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
            `<button class="sw" data-accion="abrir-selector" data-columna="${k}">Cambiar</button></div>`
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
    // cada lado de la página se difumina con el color de su perfume (ver css/comparador.css)
    const cm0 = $("#cm");
    cm0.style.setProperty("--n", n);
    [0, 1, 2].forEach((i) =>
      cm0.style.setProperty("--c" + (i + 1), ps[i] ? Taller3D.colorVivo(ps[i].color) : "transparent")
    );
    cm0.classList.toggle("con-color", n >= 2);
    cm0.classList.toggle("tres", n === 3);
    if (n < 2) return pintarVacio(ps);
    const M = Formato.dinero;
    const notas = (p, capa) => p.notas[capa];

    /** Una fila con una columna por perfume (cada una con el color de su perfume en --pc). */
    const columnas = (contenido, clase = "") =>
      `<div class="cg${clase ? " " + clase : ""}" style="--n:${n}">` +
      ps.map((p, k) => `<div class="col" style="--pc:${E(p.color)}">${contenido(p, k)}</div>`).join("") +
      `</div>`;

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

    const seccionNotas = ([capa, titulo]) => {
      const { veces } = conteo(capa);
      const filas = (p) =>
        notas(p, capa)
          .map((t) => `<p${veces[Texto.normalizar(t)] > 1 ? ' class="sh2"' : ""}>${E(t)}</p>`)
          .join("") || `<p class="mu">—</p>`;
      // las notas van como pastillas; las que se repiten, en bronce
      return (
        `<section class="sec notas"><h3>${titulo}</h3>` +
        columnas((p) => icono(capa) + `<div class="nt">${filas(p)}</div>`) +
        `</section>`
      );
    };

    /** Al final: las notas que comparten, centradas. */
    function seccionEnComun() {
      const filas = CAPAS.map(([capa, , corto]) => {
        const { porPerfume, comunes } = conteo(capa);
        if (!comunes.length) return "";
        const lista = comunes
          .map((t) => {
            const quienes = ps.filter((p, j) => porPerfume[j].has(Texto.normalizar(t)));
            const nota = quienes.length < n ? ` <i>(${quienes.map((p) => E(p.nombre)).join(", ")})</i>` : "";
            return E(Texto.mayuscula(t)) + nota;
          })
          .join(" · ");
        return `<div class="cr"><small>${corto}</small><span>${lista}</span></div>`;
      }).join("");
      return (
        `<section class="sec"><h3 class="cen">Notas en común</h3>` +
        `<div class="mid">${filas || `<span class="mu">Estos perfumes no comparten notas.</span>`}</div></section>`
      );
    }

    const cm = $("#cm");
    const esVentana = cm.tagName === "DIALOG";
    const barraVentana = esVentana
      ? `<div class="cb-bar"><span></span><b>Comparar perfumes</b><button class="cx" data-accion="cerrar" aria-label="Cerrar">×</button></div>`
      : "";

    // nombres fijos arriba
    const encabezado =
      `<div class="cb-top">${barraVentana}` +
      columnas(
        (p, k) =>
          `<div class="nm"><h4>${E(p.nombre)}</h4>` +
          `<button class="sw" data-accion="abrir-selector" data-columna="${k}" aria-haspopup="dialog"><span class="lg">Cambiar perfume</span><span class="sh">Cambiar</span></button></div>`
      ) +
      `</div>`;

    const frascos = columnas((p, k) => {
      const tam = Catalogo.primerTamano(p);
      return (
        `<div class="ct">${Formato.frasco(p)}${Formato.etiqueta(p, tam)}</div>` +
        `<button class="btn" data-accion="agregar" data-id="${E(p.id)}"><span class="lg">Guardar en mi lista</span><span class="sh">+ Mi lista</span></button>` +
        (n > 2 ? `<button class="rm" data-accion="quitar-de-comparacion" data-columna="${k}">Quitar</button>` : "") +
        `<p class="pz">${Formato.precio(p, tam)}</p>`
      );
    }, "fr"); // fr: la fila de los frascos (lleva el "vs" entre columnas)

    const estilo =
      `<section class="sec"><h3>Estilo</h3>` +
      columnas(
        (p) =>
          icono("estilo") +
          `<div class="big">${E(p.familia)}</div><p class="mu">${E(Formato.PARA[p.genero] || "Perfume")} · ${E(p.marca)}</p>`
      ) +
      `</section>`;

    const precios =
      `<section class="sec"><h3>Tamaños y precios</h3>` +
      columnas(
        (p) =>
          icono("precio") +
          Object.keys(p.precios)
            .map((t) => {
              const antes = Catalogo.precioAntes(p, t);
              return (
                `<div class="big">${Formato.tamano(t)}</div><p>${Formato.precio(p, t)} ${Formato.etiqueta(p, t)}</p>` +
                (antes ? `<p class="sa">Ahorras ${M(antes - p.precios[t])}</p>` : "")
              );
            })
            .join("")
      ) +
      `</section>`;

    const agregarOtro =
      n < MAXIMO && Catalogo.todos().length > n
        ? `<p class="ad"><button class="btn o" data-accion="agregar-a-comparacion">+ Agregar otro perfume</button></p>`
        : "";

    cm.querySelector(".cb").innerHTML =
      encabezado +
      frascos +
      `<p class="lead">Las notas que se repiten aparecen resaltadas; al final las juntamos en el centro.</p>` +
      `<p class="cm-q"><button data-accion="limpiar-comparacion">× Quitar comparación</button></p>` +
      radar(ps) +
      veredictos(ps) +
      estilo +
      CAPAS.map(seccionNotas).join("") +
      precios +
      seccionEnComun() +
      agregarOtro;
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

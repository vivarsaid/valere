/* =============================================================================
   VISTA: EXAMEN DE GUSTOS (ventana #qz, en descubrir.html)
   -----------------------------------------------------------------------------
   Tres preguntas (para quién, qué aromas, cuánto gastar) y recomienda hasta
   3 perfumes. No recomienda kits.

   Puntos: 2 por cada aroma elegido que aparece en la familia o las notas,
   y 1 si el precio más bajo cabe en el presupuesto.

   Se ve como mosaicos con ícono, una barra de avance arriba y, al final, "Tu
   perfume ideal" en grande (con "+ Mi lista") y otras dos opciones.

   Usa:     $, Catalogo, Formato, Pagina, Texto, Ventanas
   Expone:  Examen
   ============================================================================= */

const Examen = (() => {
  // Ícono de línea de cada opción (trazos SVG de 24×24; sin emojis, para que se vea profesional)
  const TRAZOS = {
    h: '<circle cx="12" cy="7.5" r="3.5"/><path d="M5 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5"/>',
    m: '<circle cx="12" cy="7.5" r="3.5"/><path d="M8 20l2-6.5h4l2 6.5zM10 13.5l-2-1.5M14 13.5l2-1.5"/>',
    "*": '<circle cx="8.5" cy="8" r="3"/><circle cx="15.5" cy="8" r="3"/><path d="M3 20c0-3.5 2.5-5.5 5.5-5.5S14 16.5 14 20M13 14.8c.8-.2 1.6-.3 2.5-.3 3 0 5.5 2 5.5 5.5"/>',
    cit: '<circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16M6.3 6.3l11.4 11.4M17.7 6.3L6.3 17.7"/>',
    dul: '<path d="M8 3c2 2 2 4 0 6s-2 4 0 6M12 3c2 2 2 4 0 6s-2 4 0 6M16 3c2 2 2 4 0 6s-2 4 0 6"/><path d="M5 18h14l-1.5 3h-11z"/>',
    mad: '<path d="M12 3l6 9h-4l4 6H6l4-6H6z"/><path d="M12 18v3"/>',
    flo: '<circle cx="12" cy="12" r="2.5"/><path d="M12 9.5C10 6 10 4 12 3c2 1 2 3 0 6.5M14.5 12c3.5-2 5.5-2 6.5 0-1 2-3 2-6.5 0M12 14.5c2 3.5 2 5.5 0 6.5-2-1-2-3 0-6.5M9.5 12C6 14 4 14 3 12c1-2 3-2 6.5 0"/>',
    esp: '<path d="M14 6c3 0 5 2 5 5 0 6-6 10-12 10 4-3 5-7 5-10 0-3 0-5 2-5z"/><path d="M14 6c0-2 1-3 3-3"/>',
    precio: '<path d="M4 12V4h8l8 8-8 8z"/><circle cx="8.5" cy="8.5" r="1.5"/>',
  };
  const icono = (k) => (TRAZOS[k] ? `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${TRAZOS[k]}</svg>` : "");
  const PRECIO_ICONO = ["$", "$$", "$$$", "∞"];

  // [clave, nombre, palabras que lo identifican (sin acentos)]
  const AROMAS = [
    [
      "cit",
      "Cítrico y fresco",
      ["limon", "bergamota", "naranja", "mandarina", "toronja", "menta", "manzana", "pina", "fresco", "citrico"],
    ],
    [
      "dul",
      "Dulce y vainilla",
      ["vainilla", "haba tonka", "caramelo", "praline", "miel", "cacao", "almendra", "dulce"],
    ],
    ["mad", "Amaderado", ["cedro", "sandalo", "vetiver", "pachuli", "musgo", "abedul", "amaderado"]],
    ["flo", "Floral", ["jazmin", "rosa", "geranio", "floral", "iris", "lavanda", "violeta", "azahar"]],
    ["esp", "Especiado", ["pimienta", "canela", "cardamomo", "jengibre", "nuez moscada", "especiado", "azafran"]],
  ];
  // [texto, mínimo, máximo]
  const PRESUPUESTOS = [
    ["Hasta $1,500", 0, 1500],
    ["De $1,500 a $2,500", 1500, 2500],
    ["Más de $2,500", 2500, 1e9],
    ["Sin límite", 0, 1e9],
  ];
  const PARA_QUIEN = [
    ["h", "Para hombre"],
    ["m", "Para mujer"],
    ["*", "Para ambos / me da igual"],
  ];
  const E = Formato.escapar;

  const nuevo = () => ({ paso: 0, genero: "", aromas: [], presupuesto: -1 });
  let r = nuevo(); // las respuestas

  /** Los 3 perfumes con más puntos. */
  function resultado() {
    const [, min, max] = PRESUPUESTOS[r.presupuesto] || PRESUPUESTOS[3];
    return Catalogo.todos()
      .map((p) => {
        if (p.esKit) return null;
        if ((r.genero === "h" && p.genero === "m") || (r.genero === "m" && p.genero === "h")) return null;
        const texto = Texto.normalizar(p.familia + " " + p.textoNotas);
        const coinciden = AROMAS.filter(
          ([k, , palabras]) => r.aromas.includes(k) && palabras.some((x) => texto.includes(x))
        );
        const precio = Catalogo.precioMinimo(p);
        const enPresupuesto = precio >= min && precio <= max;
        return { p, coinciden, enPresupuesto, puntos: coinciden.length * 2 + (enPresupuesto ? 1 : 0) };
      })
      .filter(Boolean)
      .sort((a, b) => b.puntos - a.puntos)
      .slice(0, 3);
  }

  /** Arriba: franja de color con "Pregunta n de 3", barra de avance y "‹ Atrás". */
  const encabezado = (n, titulo, sub) =>
    `<div class="qh"><div class="qh-f">` +
    (n > 1
      ? `<button class="qa" data-accion="examen-atras" aria-label="Pregunta anterior">‹ Atrás</button>`
      : `<span></span>`) +
    `<span class="qp">${n ? `Pregunta ${n} de 3` : "Tu resultado"}</span></div>` +
    `<div class="qbar" aria-hidden="true"><i style="width:${n ? (n - 1) * 33.3 + 16 : 100}%"></i></div></div>` +
    `<div class="qc"><h3>${titulo}</h3>${sub ? `<p class="sub">${sub}</p>` : ""}`;

  /** Un mosaico de respuesta: ícono grande y texto. */
  const opcion = (accion, valor, icono, texto, presionado) =>
    `<button class="opt" data-accion="${accion}" data-valor="${valor}"${presionado == null ? "" : ` aria-pressed="${presionado}"`}>` +
    `<span class="oi" aria-hidden="true">${icono}</span><span class="ot">${texto}</span></button>`;

  function pintar() {
    const el = $("#qz .qb");
    let html = "";

    if (r.paso === 0) {
      html =
        encabezado(1, "¿Para quién es?", "Empecemos por lo básico.") +
        `<div class="qo">${PARA_QUIEN.map(([k, t]) => opcion("examen-genero", k, icono(k), t)).join("")}</div></div>`;
    } else if (r.paso === 1) {
      html =
        encabezado(2, "¿Qué aromas te gustan?", "Elige todos los que quieras.") +
        `<div class="qo dos">` +
        AROMAS.map(([k, t]) => opcion("examen-aroma", k, icono(k), t, r.aromas.includes(k))).join("") +
        `</div><button class="btn qs" data-accion="examen-continuar"${r.aromas.length ? "" : " disabled"}>` +
        `${r.aromas.length ? "Continuar ›" : "Elige al menos uno"}</button></div>`;
    } else if (r.paso === 2) {
      html =
        encabezado(3, "¿Cuánto quieres gastar?", "Por perfume.") +
        `<div class="qo dos">${PRESUPUESTOS.map(([t], k) => opcion("examen-presupuesto", k, PRECIO_ICONO[k], t)).join("")}</div></div>`;
    } else {
      const lista = resultado();
      const chips = ({ coinciden, enPresupuesto }) =>
        coinciden.map((a) => `<i>${icono(a[0])}${a[1].split(" y ")[0]}</i>`).join("") +
        (enPresupuesto ? `<i>${icono("precio")}En tu presupuesto</i>` : "");
      const tarjeta = (x, grande) => {
        const tam = Catalogo.primerTamano(x.p);
        return (
          `<div class="qr${grande ? " top" : ""}" style="--pc:${E(x.p.color)}">` +
          `<a class="qi" href="${Pagina.enlacePerfume(x.p)}" tabindex="-1" aria-hidden="true">${Formato.frascoDibujado(x.p.color)}</a>` +
          `<div class="qt2">${grande ? `<em>Tu perfume ideal</em>` : ""}<small>${E(x.p.marca)}</small><b>${E(x.p.nombre)}</b>` +
          `<span class="qch">${chips(x)}</span>` +
          `<span class="qpr">${Formato.precio(x.p, tam)} ${Formato.etiqueta(x.p, tam)}</span>` +
          `<span class="qbt"><button class="btn" data-accion="agregar" data-id="${E(x.p.id)}">+ Mi lista</button>` +
          `<a class="btn l" href="${Pagina.enlacePerfume(x.p)}">Ver</a></span></div></div>`
        );
      };
      html =
        encabezado(
          0,
          lista.length ? "Estos van contigo" : "Todavía no tenemos uno para ti",
          lista.length
            ? "Según lo que elegiste, el primero es el que más se parece a ti."
            : "Mira todo el catálogo; pronto habrá más."
        ) +
        `<div class="qrs">${lista.map((x, k) => tarjeta(x, k === 0)).join("")}</div>` +
        `<button class="btn o qs" data-accion="examen-reiniciar">↺ Volver a empezar</button></div>`;
    }
    el.innerHTML = html;
  }

  /** Al pasar de pregunta se pausa un instante, para que un doble toque no elija en la siguiente. */
  const avanzar = (cambio) => {
    cambio();
    pintar();
    Ventanas.pausar();
  };

  return {
    /** Las familias de aromas [clave, nombre, palabras] y sus íconos (las usa también el comparador). */
    aromas: () => AROMAS,
    icono,
    abrir() {
      r = nuevo();
      pintar();
      Ventanas.abrir($("#qz"));
    },
    genero: (g) =>
      avanzar(() => {
        r.genero = g;
        r.paso = 1;
      }),
    aroma(a) {
      const k = r.aromas.indexOf(a);
      k >= 0 ? r.aromas.splice(k, 1) : r.aromas.push(a);
      pintar();
    },
    continuar: () =>
      avanzar(() => {
        r.paso = 2;
      }),
    presupuesto: (b) =>
      avanzar(() => {
        r.presupuesto = b;
        r.paso = 3;
      }),
    reiniciar: () =>
      avanzar(() => {
        r = nuevo();
      }),
    /** "‹ Atrás": regresa a la pregunta anterior (sin borrar lo que ya eligió). */
    atras: () =>
      avanzar(() => {
        r.paso = Math.max(0, r.paso - 1);
      }),
  };
})();

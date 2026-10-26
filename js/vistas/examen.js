/* =============================================================================
   VISTA: EXAMEN DE GUSTOS (ventana #qz, en descubrir.html)
   -----------------------------------------------------------------------------
   Tres preguntas (para quién, qué aromas, cuánto gastar) y recomienda hasta
   3 perfumes. No recomienda kits.

   Puntos: 2 por cada aroma elegido que aparece en la familia o las notas,
   y 1 si el precio más bajo cabe en el presupuesto.

   Usa:     $, Catalogo, Formato, Pagina, Texto, Ventanas
   Expone:  Examen
   ============================================================================= */

const Examen = (() => {
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

  const encabezado = (n, titulo) => `<p class="qp">Examen de gustos · opcional · ${n} de 3</p><h3>${titulo}</h3>`;
  const opcion = (accion, valor, texto, presionado) =>
    `<button class="opt" data-accion="${accion}" data-valor="${valor}"${presionado == null ? "" : ` aria-pressed="${presionado}"`}>${texto}</button>`;

  function pintar() {
    const el = $("#qz .qb");

    if (r.paso === 0) {
      el.innerHTML =
        encabezado(1, "¿Para quién es?") +
        `<div class="qo">${PARA_QUIEN.map(([k, t]) => opcion("examen-genero", k, t)).join("")}</div>`;
    } else if (r.paso === 1) {
      el.innerHTML =
        encabezado(2, "¿Qué aromas te gustan?") +
        `<p class="sub">Elige los que quieras.</p><div class="qo">` +
        AROMAS.map(([k, t]) => opcion("examen-aroma", k, t, r.aromas.includes(k))).join("") +
        `<button class="btn" data-accion="examen-continuar">Continuar</button></div>`;
    } else if (r.paso === 2) {
      el.innerHTML =
        encabezado(3, "¿Cuánto quieres gastar?") +
        `<div class="qo">${PRESUPUESTOS.map(([t], k) => opcion("examen-presupuesto", k, t)).join("")}</div>`;
    } else {
      const lista = resultado();
      const porque = ({ coinciden, enPresupuesto }) =>
        coinciden.length
          ? "Coincide: " + coinciden.map((a) => a[1].toLowerCase()).join(", ")
          : enPresupuesto
            ? "Dentro de tu presupuesto"
            : "Otra opción del catálogo";
      el.innerHTML =
        `<p class="qp">Tu resultado</p>` +
        `<h3>${lista.length ? "Estos van contigo" : "Todavía no tenemos uno para ti"}</h3>` +
        `<p class="sub">${lista.length ? "Ordenados según lo que elegiste." : "Mira todo el catálogo; pronto habrá más."}</p>` +
        `<div class="qo">` +
        lista
          .map(
            (x) =>
              `<div class="qr"><div class="qi">${Formato.frasco(x.p)}</div>` +
              `<div class="qt2"><small>${E(x.p.marca)}</small><b>${E(x.p.nombre)}</b><span>${porque(x)}</span></div>` +
              `<a class="btn" href="${Pagina.enlacePerfume(x.p)}">Ver</a></div>`
          )
          .join("") +
        `<button class="btn o" data-accion="examen-reiniciar">Volver a empezar</button></div>`;
    }
  }

  /** Al pasar de pregunta se pausa un instante, para que un doble toque no elija en la siguiente. */
  const avanzar = (cambio) => {
    cambio();
    pintar();
    Ventanas.pausar();
  };

  return {
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
  };
})();

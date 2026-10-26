/* =============================================================================
   CATÁLOGO
   -----------------------------------------------------------------------------
   Lee data/perfumes.json, revisa cada perfume y responde preguntas sobre ellos
   (precios, descuentos, búsqueda). No dibuja nada.

   Si el JSON tiene un error (una coma de más, por ejemplo), la página usa el
   último catálogo que sí cargó bien en ese navegador.

   Usa:     Texto, Almacen (js/base/utilidades.js)
   Expone:  Catalogo

   ── Cómo es un perfume dentro de la página ──────────────────────────────────
   {
     id:              "versace-eros"            ← marca + nombre; va en el link perfume.html?p=…
     clave:           "Versace|Eros"            ← formato viejo, para leer listas guardadas antes
     nombre, marca:   "Eros", "Versace"
     genero:          "h" | "m" | "u"           ← hombre, mujer, unisex
     precios:         { "200": 2299 }           ← ml → precio que se cobra ("1" = kit)
     preciosNormales: { "200": 3800 }           ← ml → precio antes del descuento
     descuento:       39                        ← % que se muestra (0 = se calcula solo)
     familia:         "Aromático fougère"
     notas:           { salida: [...], corazon: [...], fondo: [...] }
     textoNotas:      "menta, … | … | …"        ← las notas tal cual, para buscar
     color:           "#0f5c73"                 ← color del frasco dibujado
     modelo:          "eros"                    ← nombre en "modelos" del JSON (opcional)
     incluye:         ""                        ← qué trae un kit
     esKit:           false
     masVendido:      2                         ← lugar en "Lo más vendido" (0 = no sale)
   }
   ============================================================================= */

const Catalogo = (() => {
  const RUTA = "data/perfumes.json";
  const CLAVE_RESPALDO = "vcat";
  const MAXIMO = 300;

  // Apodos para que la búsqueda encuentre marcas escritas de otra forma.
  const APODOS = {
    "Dolce & Gabbana": "d&g dg dyg",
    "Carolina Herrera": "ch",
    "Jean Paul Gaultier": "jpg jp gaultier",
    "Ariana Grande": "ari",
    "Paco Rabanne": "rabanne",
    Versace: "versache",
  };
  // Palabras con las que también se encuentra cada género.
  const PALABRAS_GENERO = {
    h: "hombre caballero masculino",
    m: "mujer dama femenino",
    u: "unisex hombre mujer",
  };

  let perfumes = [];
  let modelos = {};
  let porId = new Map();
  let porClave = new Map();

  /* ── Limpieza de datos ───────────────────────────────────────────────────── */

  const positivo = (x) => {
    x = +x;
    return isFinite(x) && x > 0 ? x : 0;
  };
  const texto = (v) => String(v == null ? "" : v);

  /** { "100": "2999" } → { 100: 2999 }; descarta tamaños o precios que no sean números. */
  function limpiarPrecios(o) {
    const limpio = {};
    if (o && typeof o === "object") {
      for (const tam in o) {
        const ml = Math.round(positivo(tam));
        const precio = Math.round(positivo(o[tam]));
        if (ml && precio) limpio[ml] = precio;
      }
    }
    return limpio;
  }

  /** "a, b | c | d" → { salida: ["a","b"], corazon: ["c"], fondo: ["d"] } */
  function separarNotas(s) {
    const [salida = "", corazon = "", fondo = ""] = texto(s)
      .split("|")
      .map((x) => x.trim());
    return {
      salida: Texto.separarComas(salida),
      corazon: Texto.separarComas(corazon),
      fondo: Texto.separarComas(fondo),
    };
  }

  /** "Versace" + "Eros" → "versace-eros" */
  const crearId = (marca, nombre) =>
    Texto.normalizar(marca + " " + nombre)
      .replace(/&/g, " y ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  /** Un perfume del JSON → perfume limpio, o null si le falta nombre o precio. */
  function limpiar(raw) {
    if (!raw || typeof raw !== "object") return null;
    const nombre = texto(raw.nombre).trim();
    const marca = texto(raw.marca).trim();
    const precios = limpiarPrecios(raw.precios);
    if (!nombre || !Object.keys(precios).length) return null;

    const descuento = positivo(raw.descuento);
    return {
      id: crearId(marca, nombre),
      clave: marca + "|" + nombre,
      nombre,
      marca,
      genero: ["h", "m", "u"].includes(raw.genero) ? raw.genero : "u",
      precios,
      preciosNormales: limpiarPrecios(raw.preciosNormales),
      descuento: descuento && descuento < 100 ? Math.round(descuento) : 0,
      familia: texto(raw.familia),
      notas: separarNotas(raw.notas),
      textoNotas: texto(raw.notas),
      color: /^#[0-9a-f]{3,8}$/i.test(String(raw.color)) ? String(raw.color) : "#3a3a3f",
      modelo: raw.modelo ? String(raw.modelo) : "",
      incluye: texto(raw.incluye).trim(),
      esKit: !!precios[1],
      masVendido: Math.floor(positivo(raw.masVendido)), // 1 = el más vendido; 0 = no está en la lista
    };
  }

  /** Revisa el JSON completo y lo deja listo. Devuelve cuántos perfumes quedaron. */
  function usar(datos) {
    perfumes = [];
    porId = new Map();
    porClave = new Map();
    modelos = datos && datos.modelos && typeof datos.modelos === "object" ? datos.modelos : {};

    const lista = datos && Array.isArray(datos.perfumes) ? datos.perfumes : [];
    for (const raw of lista) {
      try {
        const p = limpiar(raw);
        if (!p || porId.has(p.id)) continue; // marca + nombre repetidos: gana el primero
        perfumes.push(p);
        porId.set(p.id, p);
        porClave.set(p.clave, p);
        if (perfumes.length >= MAXIMO) break;
      } catch (e) {}
    }
    return perfumes.length;
  }

  /* ── Carga ───────────────────────────────────────────────────────────────── */

  /**
   * Descarga data/perfumes.json. Si falla o viene vacío, usa el respaldo guardado.
   * @returns {Promise<{ok: boolean, error: any}>}
   */
  async function cargar() {
    let datos = null;
    let error = null;
    try {
      const r = await fetch(RUTA, { cache: "no-cache" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      datos = await r.json();
    } catch (e) {
      error = e;
      console.warn("[valère] no se pudo leer " + RUTA, e);
    }

    if (usar(datos)) Almacen.guardar(CLAVE_RESPALDO, datos);
    else usar(Almacen.leer(CLAVE_RESPALDO, null));

    return { ok: !error, error };
  }

  /* ── Consultas ───────────────────────────────────────────────────────────── */

  const C = {
    cargar,

    /** Todos los perfumes, en el orden del JSON (perfumes y kits). */
    todos: () => perfumes,
    /** Los modelos 3D / fotos del JSON ("modelos"). */
    modelos: () => modelos,

    /** Busca por id ("versace-eros") o por la clave vieja ("Versace|Eros"). */
    buscar: (idOClave) => porId.get(idOClave) || porClave.get(idOClave) || null,

    /** El primer tamaño de la lista de precios (el que se muestra en las tarjetas). */
    primerTamano: (p) => Object.keys(p.precios)[0],
    precioMinimo: (p) => Math.min(...Object.values(p.precios)),
    tamanoValido: (id, tam) => {
      const p = C.buscar(id);
      return !!(p && p.precios[tam]);
    },

    /** Precio antes del descuento, o 0 si no hay descuento en ese tamaño. */
    precioAntes: (p, tam) => (p.preciosNormales[tam] > p.precios[tam] ? p.preciosNormales[tam] : 0),

    /** % de descuento que se muestra; si no viene en el JSON, se calcula. */
    descuento: (p, tam) => {
      const antes = C.precioAntes(p, tam);
      return antes ? p.descuento || Math.round(100 - (100 * p.precios[tam]) / antes) : 0;
    },

    /**
     * ¿El perfume coincide con la búsqueda y el filtro de género?
     * @param palabras  palabras ya normalizadas (Texto.paraBuscar)
     * @param genero    "h", "m", "u" o "" (todos)
     */
    coincide(p, palabras, genero) {
      if (genero && p.genero !== genero) return false;
      const extra =
        (/eau de parfum/i.test(p.nombre) ? " edp" : "") +
        (/eau de toilette/i.test(p.nombre) ? " edt" : "") +
        (p.esKit ? " set sets kit kits caja estuche regalo " + p.incluye : "");
      const todo = Texto.paraBuscar(
        p.nombre +
          " " +
          p.marca +
          " " +
          (APODOS[p.marca] || "") +
          " " +
          (PALABRAS_GENERO[p.genero] || "") +
          extra +
          " " +
          p.familia +
          " " +
          p.textoNotas
      );
      return palabras.every((x) => todo.includes(x));
    },
  };
  return C;
})();

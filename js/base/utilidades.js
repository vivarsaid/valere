/* =============================================================================
   UTILIDADES
   -----------------------------------------------------------------------------
   Herramientas pequeñas que usan todos los demás archivos.

   Expone:
     $(selector), $$(selector)   atajos para buscar elementos en la página
     Texto                       normalizar palabras (acentos, mayúsculas)
     Almacen                     guardar y leer en el navegador (localStorage)
     Registro                    atrapar errores y recuperar la página
   ============================================================================= */

/** El primer elemento que coincide con el selector (o null). */
const $ = (selector, raiz = document) => raiz.querySelector(selector);

/** Todos los elementos que coinciden con el selector, como arreglo. */
const $$ = (selector, raiz = document) => [...raiz.querySelectorAll(selector)];

/* ── Texto ──────────────────────────────────────────────────────────────────
   Para comparar palabras sin que importen acentos, mayúsculas ni apóstrofos. */
const Texto = {
  /** "Jean Paul Gaultier" → "jean paul gaultier"; "Limón" → "limon". */
  normalizar: (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(),

  /** Como normalizar, y además quita apóstrofos y puntos, y cambia comas y | por espacios. */
  paraBuscar: (s) =>
    Texto.normalizar(s)
      .replace(/['’‘`´.]/g, "")
      .replace(/[,|]/g, " "),

  /** "menta, limón ,  pera" → ["menta", "limón", "pera"] */
  separarComas: (s) =>
    (s || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean),

  /** "vainilla" → "Vainilla" */
  mayuscula: (s) => s.charAt(0).toUpperCase() + s.slice(1),
};

/* ── Almacen ────────────────────────────────────────────────────────────────
   Lo único que toca el almacenamiento del navegador. Si el navegador lo
   bloquea (modo privado, sin espacio), la página sigue funcionando.

   Claves que se usan:
     "vc"   Mi lista                       (js/datos/lista.js)
     "vg"   Envolver para regalo           (js/datos/lista.js)
     "vx"   Perfumes elegidos para comparar (js/vistas/comparador.js)
     "vcat" Último catálogo que cargó bien  (js/datos/catalogo.js)
     "vh"   Tema prendido/apagado por el dueño (js/base/antes-de-pintar.js) */
const Almacen = {
  leer(clave, siNoHay) {
    try {
      const valor = localStorage.getItem(clave);
      return valor == null ? siNoHay : JSON.parse(valor);
    } catch (e) {
      Almacen.borrar(clave);
      return siNoHay;
    }
  },
  guardar(clave, valor) {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
    } catch (e) {}
  },
  borrar(clave) {
    try {
      localStorage.removeItem(clave);
    } catch (e) {}
  },
};

/* ── Registro ───────────────────────────────────────────────────────────────
   Anota los errores en la consola y avisa a quien quiera recuperarse
   (js/app.js limpia lo temporal si algo falla varias veces seguidas). */
const Registro = (() => {
  const conteo = { veces: 0, ultima: 0 };
  const alRecuperarse = [];

  /** Anota un error y cuenta cuántos van en los últimos 12 segundos. */
  function recuperar(error, donde) {
    try {
      console.debug("[valère] recuperado", donde || "", error);
    } catch (_) {}
    try {
      const ahora = Date.now();
      conteo.veces = ahora - conteo.ultima < 12000 ? conteo.veces + 1 : 1;
      conteo.ultima = ahora;
      alRecuperarse.forEach((f) => {
        try {
          f(conteo.veces);
        } catch (_) {}
      });
    } catch (_) {}
  }

  /** Envuelve una función para que un error no rompa la página. */
  const seguro = (fn, donde) =>
    function () {
      try {
        return fn.apply(this, arguments);
      } catch (e) {
        recuperar(e, donde);
      }
    };

  // Errores no atrapados. Los de extensiones del navegador no son nuestros y se ignoran.
  window.onerror = (mensaje, url, linea, columna, error) => {
    const deExtension = /^(chrome|moz|safari|safari-web|ms-browser)-extension:|^webkit-masked-url:|^user-script:/i.test(
      String(url || "")
    );
    if (!/ResizeObserver|Script error/i.test(String(mensaje)) && !deExtension) {
      recuperar(error || mensaje, "error");
    }
    return true;
  };

  addEventListener("unhandledrejection", (e) => {
    try {
      e.preventDefault();
      console.debug("[valère] promesa ignorada", e.reason);
    } catch (_) {}
  });

  return { recuperar, seguro, alRecuperarse: (f) => alRecuperarse.push(f) };
})();

/* =============================================================================
   MI LISTA Y REGALO (solo datos)
   -----------------------------------------------------------------------------
   Guarda qué perfumes eligió la persona, cuántas piezas y si lo quiere envuelto
   para regalo. Arma el mensaje que se manda por WhatsApp, Instagram o Facebook.
   No dibuja nada: eso lo hace js/vistas/mi-lista.js.

   Se guarda en el navegador, así que sigue ahí al cambiar de página o volver
   otro día.

   Usa:     Almacen, Config, Catalogo, Formato
   Expone:  Lista, Regalo
   ============================================================================= */

/* ── Lista ──────────────────────────────────────────────────────────────────── */
const Lista = (() => {
  const CLAVE = "vc"; // se guarda como [[id, tamaño, cantidad], ...]
  let items = []; // [{ id, tam, cantidad }]
  const oyentes = [];

  const avisar = () =>
    oyentes.forEach((f) => {
      try {
        f();
      } catch (e) {
        Registro.recuperar(e, "lista");
      }
    });

  /** Lee la lista guardada y quita lo que ya no existe en el catálogo. */
  function leer() {
    const guardada = Almacen.leer(CLAVE, []);
    if (!Array.isArray(guardada)) {
      items = [];
      Almacen.borrar(CLAVE);
      return;
    }
    items = [];
    for (const x of guardada) {
      if (!Array.isArray(x)) continue;
      const p = Catalogo.buscar(String(x[0]));
      const tam = String(x[1]);
      const cantidad = Math.min(Config.maxPiezas, Math.floor(+x[2]));
      if (!p || !p.precios[tam] || !(cantidad > 0)) continue;
      // si el mismo perfume y tamaño aparece dos veces, se juntan
      const igual = items.find((y) => y.id === p.id && y.tam === tam);
      if (igual) igual.cantidad = Math.min(Config.maxPiezas, igual.cantidad + cantidad);
      else items.push({ id: p.id, tam, cantidad });
    }
    items = items.slice(0, Config.maxPerfumes);
  }

  function guardar() {
    Almacen.guardar(
      CLAVE,
      items.map((x) => [x.id, x.tam, x.cantidad])
    );
    avisar();
  }

  /**
   * Agrega una pieza.
   * @returns "ok" | "tope" (ya hay el máximo de ese perfume) | "lleno" (ya hay el máximo de perfumes)
   */
  function agregar(p, tam) {
    tam = tam || Catalogo.primerTamano(p);
    const igual = items.find((x) => x.id === p.id && x.tam === tam);
    if (igual ? igual.cantidad >= Config.maxPiezas : items.length >= Config.maxPerfumes) {
      return igual ? "tope" : "lleno";
    }
    igual ? igual.cantidad++ : items.push({ id: p.id, tam, cantidad: 1 });
    guardar();
    return "ok";
  }

  /**
   * Suma o resta una pieza en la línea número `i`.
   * @returns "ok" | "tope" | "quitado" (llegó a cero y se quitó) | null
   */
  function cambiar(i, cambio) {
    const x = items[i];
    if (!x) return null;
    if (cambio > 0 && x.cantidad >= Config.maxPiezas) return "tope";
    x.cantidad = Math.min(Config.maxPiezas, x.cantidad + cambio);
    let resultado = "ok";
    if (x.cantidad < 1) {
      items.splice(i, 1);
      resultado = "quitado";
    }
    guardar();
    return resultado;
  }

  /** Cada línea con su perfume, precio, subtotal y lo que se ahorra. */
  function lineas() {
    return items.map((item) => {
      const perfume = Catalogo.buscar(item.id);
      const precio = perfume.precios[item.tam];
      const antes = Catalogo.precioAntes(perfume, item.tam);
      return {
        item,
        perfume,
        precio,
        subtotal: item.cantidad * precio,
        ahorro: item.cantidad * (antes ? antes - precio : 0),
      };
    });
  }

  const piezas = () => items.reduce((total, x) => total + x.cantidad, 0);

  /** El texto que se manda por WhatsApp, Instagram o Facebook ("" si la lista está vacía). */
  function mensaje() {
    if (!piezas()) return "";
    const M = Formato.dinero;
    const L = lineas();
    const regalo = Regalo.activo();
    const extra = regalo && Config.regaloCosto ? Config.regaloCosto : 0;
    const total = L.reduce((t, l) => t + l.subtotal, 0) + extra;

    const renglones = L.map((l) => {
      const esKitConNombre = +l.item.tam === 1 && /caja|set|kit/i.test(l.perfume.nombre);
      const tam = esKitConNombre ? " (kit)" : " " + Formato.tamano(l.item.tam);
      return `• ${l.item.cantidad}× ${l.perfume.marca} ${l.perfume.nombre}${tam} — ${M(l.subtotal)}`;
    });

    let texto = "Hola valère, me interesan estos perfumes:\n" + renglones.join("\n");
    if (regalo) {
      texto += `\n🎁 Envolver para regalo: sí${Config.regaloCosto ? ` — ${M(Config.regaloCosto)}` : ""}`;
      if (Regalo.nota()) texto += `\nMensaje para la tarjeta: "${Regalo.nota()}"`;
    }
    return texto + `\nTotal estimado: ${M(total)}`;
  }

  return {
    leer,
    agregar,
    cambiar,
    lineas,
    piezas,
    mensaje,
    items: () => items,
    alCambiar: (f) => oyentes.push(f),
  };
})();

/* ── Regalo ─────────────────────────────────────────────────────────────────
   Un interruptor por pedido y un mensaje corto para la tarjeta.
   Solo cuenta si AJUSTES.REGALO_ACTIVO es true. */
const Regalo = (() => {
  const CLAVE = "vg"; // { g: true/false, n: "mensaje" }
  const LARGO_MAXIMO = 120;
  let envolver = false;
  let nota = "";
  const oyentes = [];

  const limpiarNota = (t) =>
    String(t || "")
      .replace(/\s+/g, " ")
      .slice(0, LARGO_MAXIMO);

  function leer() {
    const raw = Almacen.leer(CLAVE, {});
    const ok = raw && typeof raw === "object";
    envolver = ok && raw.g === true;
    nota = ok ? limpiarNota(raw.n).trim() : "";
  }

  function guardar() {
    Almacen.guardar(CLAVE, { g: envolver, n: nota });
    oyentes.forEach((f) => f());
  }

  return {
    leer,
    /** ¿Se pidió envolver? (siempre false si el regalo está apagado en los AJUSTES) */
    activo: () => Config.regaloActivo && envolver,
    nota: () => nota.trim(),
    notaSinRecortar: () => nota,
    poner(valor) {
      envolver = !!valor;
      guardar();
    },
    escribir(texto) {
      nota = limpiarNota(texto);
      guardar();
    },
    alCambiar: (f) => oyentes.push(f),
  };
})();

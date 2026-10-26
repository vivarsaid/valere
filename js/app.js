/* =============================================================================
   APP: CONECTA TODO
   -----------------------------------------------------------------------------
   Es el último archivo que se carga. Al arrancar:
     1. Escucha los clics de toda la página (ver ACCIONES).
     2. Carga el catálogo (data/perfumes.json).
     3. Lee Mi lista, el regalo y la selección del comparador.
     4. Dibuja lo que corresponde a la página actual.
     5. Avisa "valere:listo" (lo usa el tema de temporada) y carga las fotos.

   Los botones dicen qué hacen con data-accion="..." y la tabla ACCIONES dice
   qué función se ejecuta. Para agregar un botón nuevo:
     <button data-accion="mi-accion">  +  "mi-accion": (el, e) => { ... }

   Usa:     todos los módulos
   Expone:  App
   ============================================================================= */

const App = (() => {
  /* ── Lo que se repite en varias acciones ─────────────────────────────────── */

  function agregarALista(id, tam) {
    const p = Catalogo.buscar(id);
    if (!p) return false;
    const r = Lista.agregar(p, tam);
    Avisos.corto(
      r === "ok"
        ? "Guardado en Mi lista"
        : r === "tope"
          ? `Máximo ${Config.maxPiezas} piezas por perfume`
          : `Máximo ${Config.maxPerfumes} perfumes distintos en la lista`
    );
    return r === "ok";
  }

  function cambiarCantidad(linea, cambio) {
    const r = Lista.cambiar(linea, cambio);
    if (r === "tope") Avisos.corto(`Máximo ${Config.maxPiezas} piezas por perfume`);
    if (r === "quitado") Ventanas.pausar();
  }

  /* ── Qué hace cada botón (data-accion) ───────────────────────────────────── */
  const ACCIONES = {
    // Mi lista
    "abrir-lista": () => Ventanas.abrir($("#cd")),
    agregar: (el) => agregarALista(el.dataset.id),
    "cambiar-cantidad": (el) => cambiarCantidad(+el.dataset.linea, +el.dataset.cambio),
    "copiar-lista": () => Avisos.copiarYAvisar(Lista.mensaje(), "Lista copiada"),
    "compartir-lista": () => Avisos.compartir(Lista.mensaje()),
    // Instagram y Facebook: se copia la lista y el enlace abre el chat
    "copiar-y-abrir": (el) =>
      Avisos.copiarYAvisar(
        Lista.mensaje(),
        el.id === "si" && !Config.esMovil
          ? "Lista copiada. En nuestro perfil toca «Enviar mensaje» y pégala"
          : "Lista copiada. Pégala en el chat y envíala"
      ),

    // Catálogo
    filtrar: (el) => VistaCatalogo.filtrar(el.dataset.genero),

    // Carrusel de la portada (flechas)
    "carrusel-mover": (el) => Carrusel.mover(+el.dataset.paso),

    // Nosotros: capas de la pirámide olfativa
    "piramide-capa": (el) => VistaNosotros.capa(el.dataset.capa),

    // Detalle del perfume
    "elegir-tamano": (el) => VistaProducto.elegirTamano(el.dataset.tam),
    "guardar-perfume": () => {
      const p = VistaProducto.actual();
      if (p && agregarALista(p.id, VistaProducto.tamano()) && VistaProducto.esVentana()) $("#pd").close();
    },

    // Comparador
    "alternar-comparar": (el) => Comparador.alternar(el.dataset.id),
    "comparar-con": (el) => Comparador.con(el.dataset.id),
    "limpiar-comparacion": () => Comparador.limpiar(),
    "agregar-a-comparacion": () => Comparador.agregarOtro(),
    "quitar-de-comparacion": (el) => Comparador.quitar(+el.dataset.columna),
    "abrir-selector": (el) => Comparador.abrirSelector(+el.dataset.columna),
    "cerrar-selector": () => Comparador.cerrarSelector(),
    "elegir-perfume": (el) => Comparador.elegir(el.dataset.id),

    // Examen de gustos
    "abrir-examen": () => Examen.abrir(),
    "examen-genero": (el) => Examen.genero(el.dataset.valor),
    "examen-aroma": (el) => Examen.aroma(el.dataset.valor),
    "examen-continuar": () => Examen.continuar(),
    "examen-presupuesto": (el) => Examen.presupuesto(+el.dataset.valor),
    "examen-reiniciar": () => Examen.reiniciar(),

    // Generales
    cerrar: (el) => {
      const d = el.closest("dialog");
      d && d.close();
    },
    "saltar-bienvenida": () => Bienvenida.saltar(),
  };

  function alHacerClic(e) {
    const el = e.target.closest("[data-accion], dialog");
    if (!el) return;
    // Tocar el fondo oscuro de una ventana la cierra (menos el aviso de regalo).
    if (el.tagName === "DIALOG") {
      if (e.target === el && el.id !== "nt") el.close();
      return;
    }
    const accion = ACCIONES[el.dataset.accion];
    if (accion) accion(el, e);
  }

  /* ── Eventos ─────────────────────────────────────────────────────────────── */

  function escucharEventos() {
    // Todos los clics. Si el clic abrió o cerró una ventana, se pausa un instante.
    document.addEventListener("click", (e) => {
      const antes = Ventanas.estado();
      try {
        alHacerClic(e);
      } catch (x) {
        Registro.recuperar(x, "clic");
      }
      if (Ventanas.estado() !== antes) Ventanas.pausar();
    });

    // Un doble toque en WhatsApp, Instagram o Facebook abre un solo chat.
    let ultimoChat = 0;
    document.addEventListener(
      "click",
      (e) => {
        const a = e.target.closest && e.target.closest("#sw,#si,#sf,#fw,#fi,#ff,[data-red]");
        if (!a) return;
        const ahora = Date.now();
        if (ahora - ultimoChat < 1500) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
        ultimoChat = ahora;
      },
      true
    );

    // En la portada, el logo sube al inicio en vez de recargar
    // (así funcionan los 7 toques del tema de temporada).
    document.addEventListener("click", (e) => {
      const logo = e.target.closest && e.target.closest("header .logo");
      if (logo && Pagina.actual === "inicio") {
        e.preventDefault();
        scrollTo({ top: 0, behavior: "smooth" });
      }
    });

    // Buscador (solo en Descubrir)
    const q = $("#q");
    if (q) {
      q.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          try {
            e.target.blur();
          } catch (_) {}
        }
      });
      let cuadro = 0;
      q.addEventListener("input", (e) => {
        const texto = e.target.value;
        cancelAnimationFrame(cuadro);
        cuadro = requestAnimationFrame(Registro.seguro(() => VistaCatalogo.buscar(texto)));
      });
    }

    // Regalo
    $("#gf").addEventListener(
      "click",
      Registro.seguro((e) => {
        // Si el regalo está apagado, tocar el interruptor muestra el aviso #nt.
        if (Config.regaloActivo || !e.target.closest(".gt")) return;
        e.preventDefault();
        $("#gk").checked = false;
        Ventanas.abrir($("#nt"));
      })
    );
    $("#gk").addEventListener(
      "change",
      Registro.seguro((e) => {
        if (!Config.regaloActivo) {
          e.target.checked = false;
          return;
        }
        Regalo.poner(e.target.checked);
        if (Regalo.activo()) {
          const m = $("#gm");
          m &&
            setTimeout(() => {
              try {
                m.focus({ preventScroll: true });
              } catch (_) {}
            }, 60);
        }
      })
    );
    $("#gm").addEventListener(
      "input",
      Registro.seguro((e) => Regalo.escribir(e.target.value))
    );

    // Mantenerse al día: otra pestaña, volver a la página o regresar desde el historial.
    const sincronizar = Registro.seguro(() => {
      Lista.leer();
      Regalo.leer();
      VistaLista.pintar();
    });
    addEventListener("storage", (e) => {
      if (!e.key || e.key === "vc" || e.key === "vg") sincronizar();
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) sincronizar();
    });
    addEventListener("pageshow", (e) => {
      if (e.persisted) sincronizar();
    });
  }

  /* ── Pintar ──────────────────────────────────────────────────────────────── */

  /** Lo que aparece en todas las páginas: catálogo (si lo hay), Mi lista y el comparador. */
  function pintarTodo() {
    [
      () => VistaCatalogo.pintarFiltros(),
      () => VistaCatalogo.pintar(),
      () => VistaLista.pintar(),
      () => Comparador.marcar(),
    ].forEach((f) => {
      try {
        f();
      } catch (e) {}
    });
  }

  /** Links de WhatsApp, Instagram, Facebook y correo del pie, Contacto y páginas legales (salen de los AJUSTES). */
  function pintarRedes() {
    try {
      const W = Config.whatsapp;
      const diezDigitos = W.replace(/^521?(?=\d{10}$)/, "");
      const telefono =
        diezDigitos.length === 10
          ? `${diezDigitos.slice(0, 2)} ${diezDigitos.slice(2, 6)} ${diezDigitos.slice(6)}`
          : "";
      const enlaces = {
        wa: W ? `https://wa.me/${W}` : "#",
        // Contacto: abre el chat con un mensaje ya escrito
        "wa-ayuda": W
          ? `https://wa.me/${W}?text=${encodeURIComponent("Hola valère, quiero ayuda para elegir un perfume.")}`
          : "#",
        ig: `https://www.instagram.com/${encodeURIComponent(Config.instagram)}`,
        fb: `https://www.facebook.com/${encodeURIComponent(Config.facebook)}`,
        correo: Config.correo ? `mailto:${Config.correo}` : "#",
      };
      const textos = { wa: telefono, ig: "@" + Config.instagram, fb: Config.facebook, correo: Config.correo };

      $("#fw").href = enlaces.wa;
      $("#fw").textContent = telefono ? `WhatsApp ${telefono}` : "WhatsApp";
      $("#fi").href = enlaces.ig;
      $("#fi").textContent = `Instagram @${Config.instagram}`;
      $("#ff").href = enlaces.fb;
      $("#ff").textContent = `Facebook ${Config.facebook}`;
      $$("[data-red]").forEach((a) => (a.href = enlaces[a.dataset.red] || "#"));
      $$("[data-txt]").forEach((s) => (s.textContent = textos[s.dataset.txt] || ""));
      // "Compartir" solo existe en celulares y algunos navegadores
      $("#sh").hidden = !navigator.share;
    } catch (e) {
      Registro.recuperar(e, "redes");
    }
  }

  /** Lo propio de cada página: el comparador o el detalle del perfume. */
  function pintarPagina() {
    try {
      if (Pagina.actual === "comparar") Comparador.abrir();
      if (Pagina.actual === "perfume") {
        const p = Catalogo.buscar(Pagina.perfumePedido());
        p ? VistaProducto.abrir(p.id) : VistaProducto.noEncontrado();
      }
    } catch (e) {
      Registro.recuperar(e, "pagina");
    }
  }

  /** Aviso rojo si se abrió con doble clic (file://), donde el navegador no deja leer el JSON. */
  function avisarArchivoLocal() {
    const a = document.createElement("p");
    a.style.cssText = "margin:0;padding:12px 16px;background:#5a1d1d;color:#fff;text-align:center;font-size:14px";
    a.textContent = "Abre la página con Live Server (o súbela a internet) para que cargue el catálogo.";
    document.body.prepend(a);
  }

  /* ── Arranque ────────────────────────────────────────────────────────────── */

  async function iniciar() {
    escucharEventos();

    const carga = await Catalogo.cargar();
    if (!carga.ok && location.protocol === "file:") avisarArchivoLocal();

    Lista.leer();
    Regalo.leer();
    Comparador.leer();
    Lista.alCambiar(VistaLista.pintar);
    Regalo.alCambiar(VistaLista.pintar);

    // Si algo falla dos veces seguidas se limpia lo temporal; si falla mucho, se relee la lista.
    Registro.alRecuperarse((veces) => {
      if (veces >= 2) {
        Comparador.limpiar();
        VistaCatalogo.reiniciar();
        VistaProducto.olvidar();
        Ventanas.cerrarTodas();
      }
      if (veces >= 4) Lista.leer();
      pintarTodo();
    });

    pintarRedes();
    pintarTodo();
    pintarPagina();
    try {
      Carrusel.iniciar(); // solo hace algo en la portada
    } catch (e) {
      Registro.recuperar(e, "carrusel");
    }
    try {
      VistaNosotros.iniciar(); // solo hace algo en Nosotros
    } catch (e) {
      Registro.recuperar(e, "nosotros");
    }

    // Cuando terminan de cargar las fotos se vuelven a dibujar los frascos.
    addEventListener("valere:fotos", () => {
      pintarTodo();
      pintarPagina();
    });

    dispatchEvent(new Event("valere:listo"));
    Frascos.cargarFotos();

    // Vigilante: si el catálogo quedó vacío en pantalla, se vuelve a dibujar.
    setTimeout(() => {
      try {
        const g = $("#g");
        if (Catalogo.todos().length && g && !g.children.length) pintarTodo();
      } catch (_) {}
    }, 1200);
  }

  return { iniciar, agregarALista };
})();

App.iniciar();

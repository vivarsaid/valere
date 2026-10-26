/* =============================================================================
   VENTANAS
   -----------------------------------------------------------------------------
   Abre y cierra las ventanas (<dialog>: Mi lista, examen, aviso de regalo) y:
   · con el botón Atrás del celular se cierra la ventana en vez de salir de la página;
   · justo después de abrir o cerrar algo, se ignora un segundo toque, para que
     un doble toque no caiga en lo que quedó debajo.

   Usa:     $, $$
   Expone:  Ventanas
   ============================================================================= */

const Ventanas = (() => {
  const PAUSA_MS = 320;
  let ultimaPausa = 0;
  let regresando = false; // estamos haciendo history.back() nosotros
  const alIrAtras = [];

  const pausar = () => {
    ultimaPausa = performance.now();
  };

  // Clic real (no de código) muy pegado a una apertura/cierre: se ignora.
  document.addEventListener(
    "click",
    (e) => {
      if (e.detail && performance.now() - ultimaPausa < PAUSA_MS) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true
  );

  /* Al abrir una ventana se agrega un paso al historial; así "Atrás" la cierra. */
  const tienePasoPropio = () => {
    try {
      return !!(history.state && history.state.vdl);
    } catch (e) {
      return false;
    }
  };
  try {
    if (tienePasoPropio()) history.replaceState(null, "");
  } catch (e) {}

  const hayAbierta = () => !!$("dialog[open]");
  const bloquearFondo = () => {
    try {
      document.documentElement.classList.toggle("lock", hayAbierta());
    } catch (_) {}
  };

  function abrir(d) {
    try {
      if (d && !d.open) d.showModal();
    } catch (e) {
      try {
        d.setAttribute("open", "");
      } catch (_) {}
    }
    bloquearFondo();
    pausar();
    try {
      if (!tienePasoPropio() && !regresando) history.pushState({ vdl: 1 }, "");
    } catch (_) {}
  }

  const cerrarTodas = () =>
    $$("dialog[open]").forEach((d) => {
      try {
        d.close();
      } catch (_) {}
    });

  // Al cerrar la última ventana, se quita el paso del historial que agregamos.
  addEventListener(
    "close",
    () => {
      bloquearFondo();
      setTimeout(() => {
        try {
          if (!regresando && !hayAbierta() && tienePasoPropio()) {
            regresando = true;
            history.back();
          }
        } catch (_) {}
      }, 0);
    },
    true
  );

  // Atrás (botón o gesto) con una ventana abierta: se cierra la ventana.
  addEventListener("popstate", () => {
    try {
      if (regresando) {
        regresando = false;
        if (hayAbierta() && !tienePasoPropio()) history.pushState({ vdl: 1 }, "");
        return;
      }
      if (tienePasoPropio()) return;
      alIrAtras.forEach((f) => {
        try {
          f();
        } catch (_) {}
      });
      cerrarTodas();
    } catch (_) {}
  });

  /** Qué está abierto ahora (para saber si un clic abrió o cerró algo). */
  const estado = () =>
    $$("dialog[open]")
      .map((d) => d.id)
      .join() + ($("#pk") && !$("#pk").hidden ? "+pk" : "");

  return { abrir, cerrarTodas, pausar, estado, alIrAtras: (f) => alIrAtras.push(f) };
})();

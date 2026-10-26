/* =============================================================================
   AVISOS
   -----------------------------------------------------------------------------
   Todo lo que se le comunica al visitante: el aviso corto que aparece abajo
   ("Guardado en Mi lista"), copiar la lista y compartirla.

   Usa:     $ (utilidades), Registro
   Expone:  Avisos
   ============================================================================= */

const Avisos = (() => {
  const DURACION = 2300; // ms que se queda el aviso
  let tOcultar = 0;
  let tQuitar = 0;

  /** Muestra un aviso corto abajo de la pantalla (#ts). */
  function corto(texto) {
    const el = $("#ts");
    el.textContent = texto;
    try {
      el.hidePopover();
      el.showPopover();
    } catch (_) {}
    requestAnimationFrame(() => el.classList.add("on"));
    clearTimeout(tOcultar);
    clearTimeout(tQuitar);
    tOcultar = setTimeout(() => {
      el.classList.remove("on");
      tQuitar = setTimeout(() => {
        try {
          el.hidePopover();
        } catch (_) {}
      }, 320);
    }, DURACION);
  }

  /** Copia al portapapeles. Devuelve true si se pudo. */
  async function copiar(texto) {
    if (!texto) return false;
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch (e) {}
    // respaldo para navegadores viejos
    try {
      const area = document.createElement("textarea");
      area.value = texto;
      area.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch (e) {
      return false;
    }
  }

  /** Si el navegador no deja copiar, el texto aparece en Mi lista para seleccionarlo a mano. */
  function mostrarParaCopiarAMano(texto) {
    const area = $("#mn");
    if (!area || !texto) return;
    area.value = texto;
    area.hidden = false;
    try {
      area.focus();
      area.select();
    } catch (_) {}
  }

  async function copiarYAvisar(texto, mensaje) {
    const ok = await copiar(texto);
    if (ok) corto(mensaje);
    else {
      mostrarParaCopiarAMano(texto);
      corto("Copia tu lista desde aquí");
    }
  }

  /** Abre el menú "Compartir" del celular; si falla, copia la lista. */
  let compartiendo = false;
  function compartir(texto) {
    if (!texto || !navigator.share || compartiendo) return;
    compartiendo = true;
    navigator
      .share({ title: "Mi lista · valère", text: texto })
      .catch((e) => {
        const cancelado = e && (e.name === "AbortError" || e.name === "InvalidStateError");
        if (!cancelado) copiarYAvisar(texto, "Lista copiada");
      })
      .finally(() => {
        compartiendo = false;
      });
  }

  return {
    corto: (texto) => {
      try {
        corto(texto);
      } catch (e) {
        Registro.recuperar(e, "aviso");
      }
    },
    copiarYAvisar,
    compartir,
  };
})();

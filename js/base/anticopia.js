/* =============================================================================
   ANTICOPIA
   -----------------------------------------------------------------------------
   Pone trabas para copiar lo que se ve: sin clic derecho, sin arrastrar, sin
   seleccionar ni copiar texto, y bloquea atajos como F12 o Ctrl+S.
   Los campos de texto (buscador, mensaje del regalo) siguen funcionando.

   Ojo: esto solo frena a visitantes comunes; alguien con experiencia lo puede
   saltar. Para quitarlo, borra este archivo de plantillas/comun-arriba.html
   y de css/anticopia.css.
   ============================================================================= */

(() => {
  try {
    /** ¿El evento ocurrió dentro de un campo donde sí se puede escribir? */
    const esCampo = (el) => {
      try {
        return !!(el && el.closest && el.closest("input,textarea,select,[contenteditable=true]"));
      } catch (e) {
        return false;
      }
    };

    ["contextmenu", "dragstart", "selectstart", "copy", "cut"].forEach((tipo) =>
      document.addEventListener(
        tipo,
        (e) => {
          if (!esCampo(e.target)) e.preventDefault();
        },
        true
      )
    );

    // F12, Ctrl+Shift+I/J/C/K (herramientas), Ctrl+S/U/P (guardar, ver código, imprimir)
    document.addEventListener(
      "keydown",
      (e) => {
        const tecla = String(e.key || "").toLowerCase();
        const ctrl = e.ctrlKey || e.metaKey;
        if (
          tecla === "f12" ||
          (ctrl && e.shiftKey && "ijck".includes(tecla)) ||
          (ctrl && !e.shiftKey && "sup".includes(tecla))
        ) {
          e.preventDefault();
        }
      },
      true
    );

    // Los frascos dibujados (canvas.b3) no se pueden exportar como imagen.
    const toDataURL = HTMLCanvasElement.prototype.toDataURL;
    const toBlob = HTMLCanvasElement.prototype.toBlob;
    const esFrasco = (c) => c && c.classList && c.classList.contains("b3");
    HTMLCanvasElement.prototype.toDataURL = function () {
      return esFrasco(this) ? "data:," : toDataURL.apply(this, arguments);
    };
    HTMLCanvasElement.prototype.toBlob = function (listo) {
      if (esFrasco(this)) {
        try {
          listo && listo(null);
        } catch (_) {}
        return;
      }
      return toBlob.apply(this, arguments);
    };
  } catch (e) {}
})();

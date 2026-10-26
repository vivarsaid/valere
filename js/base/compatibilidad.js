/* =============================================================================
   COMPATIBILIDAD CON NAVEGADORES VIEJOS
   -----------------------------------------------------------------------------
   Las ventanas (Mi lista, examen, avisos) usan <dialog>. Los iPhone con iOS
   anterior a 15.4 no lo traen, así que aquí se imita lo básico: abrir, cerrar
   y cerrar con Escape. Marca <html class="nodlg"> para los estilos de respaldo
   (css/dialogos.css). En navegadores actuales este archivo no hace nada.
   ============================================================================= */

(function () {
  try {
    if (window.HTMLDialogElement && HTMLDialogElement.prototype.showModal) return;

    document.documentElement.classList.add("nodlg");

    $$("dialog").forEach((d) => {
      try {
        Object.defineProperty(d, "open", {
          get() {
            return this.hasAttribute("open");
          },
          set(v) {
            v ? this.setAttribute("open", "") : this.removeAttribute("open");
          },
        });
      } catch (e) {}
      d.showModal = function () {
        this.setAttribute("open", "");
      };
      d.close = function () {
        if (!this.hasAttribute("open")) return;
        this.removeAttribute("open");
        this.dispatchEvent(new Event("close"));
      };
    });

    addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      const d = $("dialog[open]");
      if (!d) return;
      const cancelar = new Event("cancel", { cancelable: true });
      d.dispatchEvent(cancelar);
      if (!cancelar.defaultPrevented) d.close();
    });
  } catch (e) {}
})();

/* =============================================================================
   VISTA: BARRITA FLOTANTE (#cb, abajo de la pantalla, en todas las páginas)
   -----------------------------------------------------------------------------
   Muestra lo que esté pasando:
     · comparando y con algo en Mi lista:  Eros vs Scandal [Comparar] [Finalizar compra] ×
     · solo comparando:                    Eros vs Scandal [Comparar] ×
     · solo con algo en Mi lista:          2 en tu lista · $3,298 [Finalizar compra]
   "Finalizar compra" abre Mi lista, donde se manda por WhatsApp, Instagram o Facebook.
   La × solo quita la comparación (Mi lista no se toca).

   La llaman Comparador.marcar() y VistaLista.pintar() cada vez que cambian.

   Usa:     $, Catalogo, Lista, Comparador, Formato, Pagina
   Expone:  Barra
   ============================================================================= */

const Barra = (() => {
  function pintar() {
    const barra = $("#cb");
    if (!barra) return;

    const elegidos = Comparador.seleccion().map(Catalogo.buscar).filter(Boolean);
    const comparando = elegidos.length > 0 && Pagina.actual !== "comparar";
    const piezas = Lista.piezas();

    barra.hidden = !comparando && !piezas;
    $("#cbc").hidden = !comparando;
    $("#cbx").hidden = !comparando;
    $("#cbf").hidden = !piezas;
    barra.classList.toggle("dos", comparando && piezas > 0);

    let texto = "";
    if (comparando) {
      const nombres = elegidos.map((p) => p.nombre);
      texto = nombres.length > 1 ? nombres.join("  vs  ") : nombres[0] + " · elige otro";
    } else if (piezas) {
      const total = Lista.lineas().reduce((t, l) => t + l.subtotal, 0);
      texto = `${piezas} en tu lista · ${Formato.dinero(total)}`;
    }
    $("#cbt").textContent = texto;
  }

  return { pintar };
})();

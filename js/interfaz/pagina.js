/* =============================================================================
   PÁGINA
   -----------------------------------------------------------------------------
   Sabe en qué página estamos (lo dice <body data-pagina="...">) y arma los
   enlaces entre páginas.

   Páginas: inicio · descubrir · kits · comparar · perfume · nosotros · contacto
            · privacidad · terminos

   Usa:     Catalogo
   Expone:  Pagina
   ============================================================================= */

const Pagina = {
  /** El nombre de la página actual (ver la lista de arriba) */
  actual: document.body.dataset.pagina || "inicio",

  /** El link de un perfume: perfume.html?p=versace-eros */
  enlacePerfume: (p) => "perfume.html?p=" + encodeURIComponent(p.id),

  /** El id del perfume que pide el link actual (en perfume.html). */
  perfumePedido: () => new URLSearchParams(location.search).get("p") || "",

  ir: (url) => {
    location.href = url;
  },
};

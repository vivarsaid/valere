/* =============================================================================
   AJUSTES VALIDADOS
   -----------------------------------------------------------------------------
   Lee los AJUSTES de js/config.js y los deja limpios y con valores seguros,
   para que un error al escribirlos no rompa la página.

   Usa:     AJUSTES (js/config.js)
   Expone:  Config
   ============================================================================= */

const Config = (() => {
  const A = typeof AJUSTES === "object" && AJUSTES ? AJUSTES : {};
  /** Número entero de 1 en adelante; si no sirve, usa el de respaldo. */
  const entero = (x, respaldo) => Math.max(1, Math.floor(+x) || respaldo);

  return Object.freeze({
    whatsapp: String(A.WHATSAPP || "").replace(/\D/g, ""),
    instagram: String(A.INSTAGRAM || ""),
    facebook: String(A.FACEBOOK || ""),
    correo: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(A.CORREO || "").trim()) ? String(A.CORREO).trim() : "",

    maxPiezas: entero(A.MAX_PIEZAS_POR_PERFUME, 20),
    maxPerfumes: entero(A.MAX_PERFUMES_DISTINTOS, 20),

    regaloActivo: A.REGALO_ACTIVO === true,
    regaloCosto: Math.max(0, Math.round(+A.REGALO_COSTO) || 0),

    vista3d: A.VISTA_3D !== false,
    carrusel3d: A.CARRUSEL_3D !== false,

    /* En celular, Instagram abre directo el chat con la tienda;
       en computadora se abre el perfil (donde está el botón «Enviar mensaje»). */
    esMovil: (() => {
      try {
        const u = navigator.userAgent || "";
        return /Android|iPhone|iPad|iPod|Mobile/i.test(u) || (/Macintosh/.test(u) && navigator.maxTouchPoints > 1);
      } catch (e) {
        return false;
      }
    })(),
  });
})();

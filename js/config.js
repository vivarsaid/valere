/* =============================================================================
   AJUSTES DE LA TIENDA
   -----------------------------------------------------------------------------
   Es el único archivo de código que normalmente hace falta tocar.
   · Los perfumes NO van aquí: van en data/perfumes.json.
   · Se carga primero en todas las páginas, antes de pintar nada.
   · Después de cambiar algo, guarda y recarga la página.
   ============================================================================= */

const AJUSTES = {
  /* ── Contacto ─────────────────────────────────────────────────────────── */

  // Número de WhatsApp con lada de país (52 para México), solo dígitos.
  WHATSAPP: "525529094378",
  // Lo que va después de instagram.com/
  INSTAGRAM: "perfumeria_valere",
  // Lo que va después de facebook.com/
  FACEBOOK: "perfumeria-valere",

  /* ── Mi lista ─────────────────────────────────────────────────────────── */

  // Máximo de piezas de un mismo perfume.
  MAX_PIEZAS_POR_PERFUME: 20,
  // Máximo de perfumes distintos en la lista.
  MAX_PERFUMES_DISTINTOS: 20,

  /* ── Envolver para regalo ─────────────────────────────────────────────── */

  // false = la opción se ve, pero avisa que el regalo se pide por chat.
  REGALO_ACTIVO: false,
  // Costo por pedido, en pesos. 0 = no se muestra costo.
  REGALO_COSTO: 0,

  /* ── Rendimiento ──────────────────────────────────────────────────────── */

  // "auto" = la página se aligera sola (sin desenfoques y con menos animación)
  //          en equipos modestos, con ahorro de datos o con batería baja.
  // "si"   = siempre ligera · "no" = nunca.
  MODO_LIGERO: "auto",
  // true  = los frascos se dibujan en 3D (si el aparato lo soporta).
  // false = se ve la foto plana o el frasco dibujado.
  VISTA_3D: false,

  /* ── Tema de temporada (Halloween + Día de Muertos) ───────────────────── */

  TEMPORADA: {
    // "auto" = se prende solo entre las dos fechas y se apaga solo después.
    // "on"   = siempre prendido · "off" = siempre apagado.
    modo: "auto",
    // Para el próximo año, solo cambia las fechas (año-mes-día).
    desde: "2026-10-01",
    hasta: "2026-11-02",
  },
  // Truco del dueño: 7 toques rápidos al logo (en la portada) prenden o apagan
  // el tema solo en ese aparato durante 7 días. Los visitantes no lo ven.
};

/* =============================================================================
   ANTES DE PINTAR
   -----------------------------------------------------------------------------
   Se ejecuta dentro de <head>, antes de que se vea la página, para que no haya
   parpadeos. Decide tres cosas y las marca como clases en <html>:

     html.hw    → el tema de temporada está prendido   (css/temporadas/halloween.css)
     html.lite  → modo ligero: menos efectos           (css/modo-ligero.css)
     html.noiv  → no mostrar la bienvenida animada     (css/bienvenida.css)

   Usa:     AJUSTES (js/config.js)
   Expone:  Temporada.activa(), Temporada.guardarEleccionDueno(prendido)
   ============================================================================= */

/* ── Tema de temporada ──────────────────────────────────────────────────────── */
const Temporada = (() => {
  // En este aparato, el dueño lo prendió ("1|fecha") o apagó ("0|fecha").
  const CLAVE_DUENO = "vh";
  const SIETE_DIAS = 7 * 24 * 60 * 60 * 1000;

  /** ¿Debe verse el tema? Primero manda la elección del dueño; si no, los AJUSTES. */
  function activa() {
    try {
      const [valor, fecha] = String(localStorage[CLAVE_DUENO] || "").split("|");
      if (fecha && Date.now() - fecha < SIETE_DIAS && (valor === "1" || valor === "0")) {
        return valor === "1";
      }
    } catch (e) {}

    try {
      const t = AJUSTES.TEMPORADA || {};
      const modo = String(t.modo || "auto");
      if (modo === "on") return true;
      if (modo === "off") return false;
      const desde = new Date(t.desde + "T00:00:00");
      const hasta = new Date(t.hasta + "T23:59:59");
      const hoy = new Date();
      return isFinite(desde) && isFinite(hasta) && hoy >= desde && hoy <= hasta;
    } catch (e) {
      return false;
    }
  }

  /** Guarda en este aparato que el dueño prendió o apagó el tema (dura 7 días). */
  function guardarEleccionDueno(prendido) {
    try {
      localStorage[CLAVE_DUENO] = (prendido ? "1" : "0") + "|" + Date.now();
    } catch (e) {}
  }

  return { activa, guardarEleccionDueno, CLAVE_DUENO };
})();

try {
  if (Temporada.activa()) document.documentElement.classList.add("hw");
} catch (e) {}

/* ── Modo ligero ────────────────────────────────────────────────────────────
   Se prende en equipos con poca memoria o pocos núcleos, con ahorro de datos,
   con conexión 2G o con la batería por debajo de 20 % (y sin cargar). */
(function () {
  try {
    const html = document.documentElement;
    const nav = navigator;
    const conexion = nav.connection || {};
    const modo = String(AJUSTES.MODO_LIGERO || "auto");
    if (modo === "no") return;

    const equipoModesto =
      (nav.deviceMemory && nav.deviceMemory <= 2) ||
      (nav.hardwareConcurrency && nav.hardwareConcurrency <= 3) ||
      conexion.saveData === true ||
      /(^|-)2g$/.test(conexion.effectiveType || "");

    if (modo === "si" || equipoModesto) {
      html.classList.add("lite");
      return;
    }

    if (nav.getBattery) {
      nav
        .getBattery()
        .then((bateria) => {
          const revisar = () => html.classList.toggle("lite", !bateria.charging && bateria.level < 0.2);
          revisar();
          bateria.addEventListener("levelchange", revisar);
          bateria.addEventListener("chargingchange", revisar);
        })
        .catch(() => {});
    }
  } catch (e) {}
})();

/* ── Bienvenida ─────────────────────────────────────────────────────────────
   La animación de entrada solo se ve la primera vez en cada visita, y nunca
   si la persona pidió "reducir movimiento" en su aparato. */
(function () {
  try {
    let yaSeVio = 0;
    try {
      yaSeVio = sessionStorage.vi;
      sessionStorage.vi = 1;
    } catch (e) {}
    if (yaSeVio || matchMedia("(prefers-reduced-motion:reduce)").matches) {
      document.documentElement.classList.add("noiv");
    }
  } catch (e) {}
})();

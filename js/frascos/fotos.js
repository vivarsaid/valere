/* =============================================================================
   FRASCOS: FOTOS Y PINTADO
   -----------------------------------------------------------------------------
   Decide cómo se ve el frasco de cada perfume y lo pinta:

     1. En 3D, si AJUSTES.VISTA_3D es true y el aparato lo soporta (js/frascos/motor3d.js).
     2. Con su foto, si existe images/frascos/<foto>.webp.
     3. Si no, el frasco dibujado con el color del perfume (Formato.frascoDibujado).

   Las fotos se nombran en data/perfumes.json → "modelos" → "foto". Ejemplo:
     "modelos": { "eros": { "foto": "eros", ... } }   →   images/frascos/eros.webp

   Las vistas escriben <canvas class="b3"> vacíos; este archivo los detecta
   solo (con MutationObserver) y los pinta. Cada canvas pintado queda marcado
   con data-d="1".

   Usa:     $$, Catalogo, Formato, Motor3D (opcional)
   Expone:  Frascos
   Avisa:   evento "valere:fotos" cuando terminan de cargar las fotos
   ============================================================================= */

const Frascos = (() => {
  const fotos = {}; // nombre de la foto → <canvas> con la foto y la marca de agua
  let listo = false; // ya se intentó cargar las fotos
  const hayMotor = () => typeof Motor3D !== "undefined";

  /**
   * Cómo es el frasco de un perfume: sus datos de "modelos" en el JSON, con
   * valores por omisión para lo que falte.
   *   c  color del frasco      t  color de la tapa     tp tapa: "cubo" | "cilindro" | "corona"
   *   l  color de la etiqueta  e  texto (| = renglón)   v  1 = vidrio transparente
   *   w, h, d  ancho, alto y fondo                     foto  nombre del .webp
   */
  function modelo(p) {
    const delJSON = Catalogo.modelos()[p.modelo] || {};
    return Object.assign(
      { c: p.color || "#3a3a3f", t: "#c9ced6", tp: "cubo", l: "#f1ede4", e: p.nombre, w: 1, h: 1.25, d: 0.46, v: 0 },
      delJSON
    );
  }

  /** ¿Se dibuja en 3D? */
  const hay3d = () => hayMotor() && Motor3D.ok;

  /** ¿El perfume tiene foto cargada? */
  const tieneFoto = (p) => {
    const m = modelo(p);
    return !!(m.foto && fotos[m.foto]);
  };

  /** Ancho entre alto del frasco (de su foto; 0.75 si no tiene). */
  const proporcion = (p) => {
    const m = modelo(p);
    const foto = m.foto && fotos[m.foto];
    return foto ? foto.width / foto.height : 0.75;
  };

  /* ── Carga de fotos ──────────────────────────────────────────────────────── */

  async function cargarImagen(url) {
    let r;
    try {
      r = await fetch(url);
    } catch (_) {
      // sin fetch (o bloqueado): se intenta con <img>
      return await new Promise((ok, no) => {
        const img = new Image();
        img.onload = () => ok(img);
        img.onerror = no;
        img.src = url;
      });
    }
    if (!r.ok) throw new Error("sin foto: " + url);
    return await createImageBitmap(await r.blob());
  }

  /** Copia la foto a un canvas y le pone la marca de agua "valère". */
  function conMarcaDeAgua(imagen, w, h) {
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    const x = cv.getContext("2d");
    x.imageSmoothingQuality = "high";
    x.drawImage(imagen, 0, 0, w, h);
    x.globalAlpha = 0.16;
    x.fillStyle = "#fff";
    x.font = "italic 400 " + Math.max(11, Math.round(h * 0.036)) + 'px Georgia,"Times New Roman",serif';
    x.textAlign = "right";
    x.fillText("valère", w - 10, h - 10);
    return cv;
  }

  /** Carga todas las fotos nombradas en "modelos". Las que no existan se ignoran. */
  async function cargarFotos() {
    try {
      const nombres = [
        ...new Set(
          Object.values(Catalogo.modelos())
            .map((m) => m && m.foto)
            .filter(Boolean)
        ),
      ];
      await Promise.all(
        nombres.map(async (nombre) => {
          try {
            const imagen = await cargarImagen("images/frascos/" + encodeURIComponent(nombre) + ".webp");
            const w = imagen.width;
            const h = imagen.height;
            if (hay3d()) Motor3D.registrarTextura(nombre, imagen, w, h);
            fotos[nombre] = conMarcaDeAgua(imagen, w, h);
            try {
              imagen.close && imagen.close();
            } catch (_) {}
          } catch (e) {}
        })
      );
    } catch (e) {}

    listo = true;
    if (hayMotor()) Motor3D.olvidarPoses();
    // la página vuelve a dibujar los frascos, ahora con sus fotos
    try {
      dispatchEvent(new Event("valere:fotos"));
    } catch (e) {}
    try {
      pintar();
    } catch (e) {}
  }

  /* ── Pintado ─────────────────────────────────────────────────────────────── */

  function pintarFoto(cv, p) {
    const foto = fotos[modelo(p).foto];
    if (!foto) return fallar(cv);
    // se dibuja al tamaño en que se ve (no a la resolución completa de la foto)
    const h = Math.min(foto.height, Math.round((cv.clientHeight || 240) * Math.min(devicePixelRatio || 1, 2)));
    cv.height = h;
    cv.width = Math.round((h * foto.width) / foto.height);
    const x = cv.getContext("2d");
    x.imageSmoothingQuality = "high";
    x.drawImage(foto, 0, 0, cv.width, h);
  }

  /** Pinta todos los <canvas class="b3"> que aún no están pintados. */
  function pintar() {
    if (!listo) return;
    if (hayMotor()) Motor3D.limpiar();
    $$("canvas.b3:not([data-d])").forEach((cv) => {
      cv.dataset.d = 1;
      const p = Catalogo.buscar(cv.dataset.id);
      if (!p) return;
      try {
        if (cv.classList.contains("flat")) pintarFoto(cv, p);
        else Motor3D.pintar(cv, p);
      } catch (e) {
        fallar(cv);
      }
    });
  }

  /** Si un frasco no se pudo pintar: foto plana → pose 3D fija → frasco dibujado. */
  function fallar(cv) {
    const p = Catalogo.buscar(cv.dataset.id);
    const nuevoCanvas = (clase) => {
      const n = document.createElement("canvas");
      n.className = clase;
      n.dataset.id = cv.dataset.id;
      n.setAttribute("role", "img");
      n.setAttribute("aria-label", cv.getAttribute("aria-label") || "");
      n.dataset.d = 1;
      return n;
    };

    try {
      const foto = p && fotos[modelo(p).foto];
      if (foto) {
        const n = nuevoCanvas("ph b3 flat");
        n.width = foto.width;
        n.height = foto.height;
        n.getContext("2d").drawImage(foto, 0, 0);
        cv.replaceWith(n);
        return;
      }
    } catch (e) {}

    try {
      const n = nuevoCanvas("ph b3");
      n.width = 360;
      n.height = 480;
      n.getContext("2d").drawImage(Motor3D.pose(p), 0, 0);
      cv.replaceWith(n);
    } catch (e) {
      try {
        cv.outerHTML = Formato.frascoDibujado(p ? p.color : "#3a3a3f");
      } catch (_) {}
    }
  }

  /* ── Vigilar dónde aparecen frascos nuevos ───────────────────────────────── */
  let pendiente = 0;
  const programar = () => {
    if (pendiente) return;
    pendiente = requestAnimationFrame(() => {
      pendiente = 0;
      try {
        pintar();
      } catch (e) {}
    });
  };
  ["#g", "#kg", "#pd", "#cm", "#qz", "#ht", "#cd"].forEach((sel) => {
    const el = $(sel);
    if (el) new MutationObserver(programar).observe(el, { childList: true, subtree: true });
  });
  addEventListener("pageshow", programar);

  return { modelo, hay3d, tieneFoto, proporcion, cargarFotos, pintar, fallar };
})();

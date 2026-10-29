/* =============================================================================
   TALLER 3D: CÓMO SE ARMA UN FRASCO EN 3D (Three.js)
   -----------------------------------------------------------------------------
   Lo comparten el carrusel de la portada (js/vistas/carrusel.js) y el frasco
   que gira en el detalle del perfume (js/frascos/vitrina3d.js):
     · cargarThree()      descarga Three.js una sola vez (versión fija)
     · aspecto(p)         forma del frasco, color de tapa y de líquido
     · nuevo(THREE, renderer, escena)
                          pone reflejos y luces en la escena y devuelve
                          { armar(p) }, que arma el frasco de un perfume
   Las formas se arman una vez por tipo de frasco y se comparten; las tapas
   se reusan por color. La etiqueta (marca, nombre, tamaño) se dibuja en un canvas.

   Usa:     Catalogo, Formato
   Expone:  Taller3D
   ============================================================================= */

const Taller3D = (() => {
  // Versión fija de Three.js (la "min" pesa la mitad que la normal).
  const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js";
  let descarga = null;

  /** Descarga Three.js (solo la primera vez; después regresa la misma promesa). */
  function cargarThree() {
    if (descarga) return descarga;
    let importar;
    try {
      // Se arma así para que un navegador viejo que no entiende import() no rompa este archivo.
      importar = new Function("u", "return import(u)");
    } catch (e) {
      return Promise.reject(e);
    }
    descarga = importar(THREE_URL);
    return descarga;
  }

  /* ── Colores y forma de cada frasco ──────────────────────────────────────── */

  /** "#abc" o "#aabbcc" → [r, g, b] */
  function hexARgb(hex) {
    let h = String(hex).replace("#", "");
    if (h.length === 3 || h.length === 4) h = [...h.slice(0, 3)].map((c) => c + c).join("");
    const n = parseInt(h.slice(0, 6), 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgbAHex = (rgb) => "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("");

  /** El tono del perfume, pero luminoso (un perfume casi negro no daría luz ni se vería en un gráfico). */
  function colorVivo(hex) {
    const [r, g, b] = hexARgb(hex).map((v) => v / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    let h = 0;
    let s = 0;
    if (d) {
      s = d / (1 - Math.abs(2 * l - 1));
      h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h = (h * 60 + 360) % 360;
    }
    const L = Math.min(0.62, Math.max(0.42, l));
    return `hsl(${Math.round(h)} ${Math.round(Math.min(s, 0.75) * 100)}% ${Math.round(L * 100)}%)`;
  }

  /** Un número fijo para cada perfume (para que siempre le toque la misma forma). */
  function numeroDe(texto) {
    let h = 0;
    for (const ch of texto) h = (h * 31 + ch.charCodeAt(0)) | 0;
    return Math.abs(h);
  }

  const TAPAS = ["#d9b36c", "#c9ccd2", "#1a1a1a"]; // dorada, plateada, negra
  const FORMAS = ["redondo", "cuadrado", "hexagonal"];

  /** Forma del frasco y color de la tapa: del "modelo" del JSON si lo tiene; si no, uno fijo. */
  function aspecto(p) {
    const m = Catalogo.modelos()[p.modelo] || {};
    const n = numeroDe(p.id);
    const forma = m.tp === "cubo" ? "cuadrado" : m.tp === "corona" ? "hexagonal" : FORMAS[n % 3];
    const tapa = /^#[0-9a-f]{6}$/i.test(m.t) ? m.t : TAPAS[(n >> 3) % 3];
    return { forma, tapa, liquido: rgbAHex(hexARgb(p.color)) };
  }

  /* ── El taller ───────────────────────────────────────────────────────────── */

  /** Pone reflejos y luces en `escena` y devuelve { armar(p) } para armar frascos. */
  function nuevo(THREE, renderer, escena) {
    const anisotropia = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    /* Reflejos: un "cielo" dibujado en un canvas (sin descargar imágenes) */
    (function entorno() {
      const c = document.createElement("canvas");
      c.width = 1024;
      c.height = 512;
      const x = c.getContext("2d");
      const g = x.createLinearGradient(0, 0, 0, 512);
      g.addColorStop(0, "#d8dfef");
      g.addColorStop(0.45, "#4a4f5c");
      g.addColorStop(1, "#0b0b0e");
      x.fillStyle = g;
      x.fillRect(0, 0, 1024, 512);
      x.shadowColor = "#fff";
      x.shadowBlur = 50;
      x.fillStyle = "rgba(255,255,255,.96)";
      [
        [110, 110, 120, 250],
        [470, 70, 230, 60],
        [800, 120, 100, 260],
        [300, 330, 90, 120],
        [640, 300, 150, 50],
      ].forEach((r) => x.fillRect(...r));
      const tex = new THREE.CanvasTexture(c);
      tex.mapping = THREE.EquirectangularReflectionMapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      const pm = new THREE.PMREMGenerator(renderer);
      escena.environment = pm.fromEquirectangular(tex).texture;
      tex.dispose();
      pm.dispose();
    })();

    escena.add(new THREE.AmbientLight(0xffffff, 0.35));
    const luz = new THREE.DirectionalLight(0xffffff, 1.5);
    luz.position.set(3, 5, 6);
    escena.add(luz);
    const contraluz = new THREE.DirectionalLight(0xffffff, 1.1);
    contraluz.position.set(-5, 2, -4);
    escena.add(contraluz);

    /* Materiales: el vidrio es uno solo; las tapas se reusan por color */
    const vidrio = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.03,
      metalness: 0,
      transparent: true,
      opacity: 0.34,
      envMapIntensity: 2.2,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      depthWrite: false,
    });
    const vidrioPlano = vidrio.clone();
    vidrioPlano.flatShading = true;
    const metales = {};
    const metal = (c) =>
      (metales[c] =
        metales[c] ||
        new THREE.MeshStandardMaterial({ color: c, metalness: 1, roughness: 0.26, envMapIntensity: 1.5 }));
    const liquido = (c, plano) =>
      new THREE.MeshPhysicalMaterial({
        color: c,
        emissive: c,
        emissiveIntensity: 0.22,
        roughness: 0.12,
        clearcoat: 1,
        envMapIntensity: 1.1,
        flatShading: !!plano,
      });

    /* Formas (se arman una vez por tipo de frasco y se comparten) */
    const rectRedondo = (w, h, r) => {
      const s = new THREE.Shape();
      const x = -w / 2;
      const y = -h / 2;
      s.moveTo(x + r, y);
      s.lineTo(x + w - r, y);
      s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r);
      s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h);
      s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r);
      s.quadraticCurveTo(x, y, x + r, y);
      return s;
    };
    const bloque = (w, h, d, r, b) => {
      const g = new THREE.ExtrudeGeometry(rectRedondo(w - 2 * b, h - 2 * b, Math.max(r - b, 0.01)), {
        depth: d - 2 * b,
        bevelEnabled: true,
        bevelThickness: b,
        bevelSize: b,
        bevelSegments: 6,
        curveSegments: 10,
      });
      g.translate(0, 0, -(d - 2 * b) / 2);
      return g;
    };
    const torno = (pts) =>
      new THREE.LatheGeometry(
        pts.map(([x, y]) => new THREE.Vector2(x, y)),
        64
      );
    const cilindro = (rt, rb, h, seg = 48) => new THREE.CylinderGeometry(rt, rb, h, seg);
    const hexagono = (r, h) => cilindro(r, r, h, 6).rotateY(Math.PI / 6);

    // Cada pieza: [forma, material, altura, adelante, orden de dibujo]
    // material: "liquido" | "vidrio" | "vidrioPlano" | "etiqueta" | "tapa"
    const moldes = {};
    function molde(forma) {
      if (moldes[forma]) return moldes[forma];
      if (forma === "redondo") {
        moldes[forma] = {
          piezas: [
            [
              torno([
                [0, -1.42],
                [0.55, -1.42],
                [0.68, -1.36],
                [0.72, -1.25],
                [0.72, 0.45],
                [0.69, 0.62],
                [0.58, 0.76],
                [0.3, 0.86],
                [0, 0.88],
              ]),
              "liquido",
              0,
              0,
              0,
            ],
            [
              torno([
                [0, -1.5],
                [0.6, -1.5],
                [0.72, -1.44],
                [0.78, -1.32],
                [0.8, -1.15],
                [0.8, 0.55],
                [0.77, 0.75],
                [0.66, 0.9],
                [0.4, 1],
                [0.3, 1.05],
                [0.28, 1.2],
                [0.28, 1.35],
              ]),
              "vidrio",
              0,
              0,
              2,
            ],
            [new THREE.CylinderGeometry(0.815, 0.815, 0.95, 32, 1, true, -0.55, 1.1), "etiqueta", -0.4, 0, 0],
            [cilindro(0.32, 0.32, 0.14), "tapa", 1.33, 0, 0],
            [cilindro(0.38, 0.38, 0.8), "tapa", 1.8, 0, 0],
          ],
          centro: 0.35,
          etiqueta: [270, 285],
        };
      } else if (forma === "cuadrado") {
        moldes[forma] = {
          piezas: [
            [bloque(1.46, 1.7, 0.62, 0.14, 0.06), "liquido", -0.5, 0, 0],
            [bloque(1.7, 2.2, 0.9, 0.2, 0.1), "vidrio", -0.4, 0, 2],
            [new THREE.PlaneGeometry(0.95, 0.95), "etiqueta", -0.4, 0.454, 0],
            [cilindro(0.2, 0.2, 0.3), "tapa", 0.85, 0, 0],
            [bloque(0.95, 0.85, 0.55, 0.1, 0.05), "tapa", 1.45, 0, 0],
          ],
          centro: 0.19,
          etiqueta: [280, 280],
        };
      } else {
        moldes[forma] = {
          piezas: [
            [hexagono(0.72, 1.8), "liquido", -0.5, 0, 0],
            [hexagono(0.85, 2.2), "vidrioPlano", -0.4, 0, 2],
            [new THREE.PlaneGeometry(0.62, 0.85), "etiqueta", -0.4, 0.85 * Math.cos(Math.PI / 6) + 0.004, 0],
            [cilindro(0.25, 0.25, 0.3), "tapa", 0.85, 0, 0],
            [hexagono(0.42, 0.75), "tapa", 1.375, 0, 0],
          ],
          centro: 0.125,
          etiqueta: [220, 300],
        };
      }
      return moldes[forma];
    }

    /* Etiqueta: marca, nombre y tamaño, dibujados en un canvas */
    const LETRA = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
    function etiqueta(p, color, w, h) {
      const S = 2;
      const c = document.createElement("canvas");
      c.width = w * S;
      c.height = h * S;
      const x = c.getContext("2d");
      x.scale(S, S);
      x.fillStyle = "#f3eee4";
      x.fillRect(0, 0, w, h);
      x.strokeStyle = "rgba(20,20,20,.35)";
      x.lineWidth = 1;
      x.strokeRect(8.5, 8.5, w - 17, h - 17);
      x.fillStyle = "#161616";
      x.textAlign = "center";
      x.textBaseline = "middle";
      const ancho = w * 0.78;
      const espaciar = (px) => {
        if ("letterSpacing" in x) x.letterSpacing = px + "px";
      };

      // Marca, en cursiva (se achica si no cabe)
      let tamMarca = w * 0.12;
      do {
        x.font = `italic 500 ${tamMarca}px Georgia,"Times New Roman",serif`;
        tamMarca -= 1;
      } while (x.measureText(p.marca).width > ancho && tamMarca > 8);
      x.fillText(p.marca, w / 2, h * 0.21);

      // Nombre en mayúsculas, en hasta 3 renglones (sin "Eau de Parfum", que va abajo)
      const nombre = p.nombre.replace(/\s*\(.*?\)|\s+eau de (parfum|toilette)$/gi, "").toUpperCase();
      let tam = w * 0.082;
      let renglones;
      for (;;) {
        x.font = `600 ${tam}px ${LETRA}`;
        espaciar(tam * 0.16);
        renglones = [];
        for (const palabra of nombre.split(/\s+/)) {
          const prueba = renglones.length ? renglones[renglones.length - 1] + " " + palabra : palabra;
          if (renglones.length && x.measureText(prueba).width <= ancho) renglones[renglones.length - 1] = prueba;
          else renglones.push(palabra);
        }
        const masAncho = Math.max(...renglones.map((r) => x.measureText(r).width));
        if ((renglones.length <= 3 && masAncho <= ancho) || tam < 9) break;
        tam -= 1;
      }
      const alto = tam * 1.3;
      const y0 = h * 0.47 - ((renglones.length - 1) * alto) / 2;
      renglones.forEach((r, i) => x.fillText(r, w / 2, y0 + i * alto));
      espaciar(0);

      // Punto del color del perfume y, abajo, concentración y tamaño
      x.fillStyle = color;
      x.beginPath();
      x.arc(w / 2, h * 0.72, 5, 0, 7);
      x.fill();
      const concentracion = /eau de toilette/i.test(p.nombre)
        ? "EAU DE TOILETTE"
        : /eau de parfum/i.test(p.nombre)
          ? "EAU DE PARFUM"
          : /parfum/i.test(p.nombre)
            ? "PARFUM"
            : "";
      const pie = [concentracion, Formato.tamano(Catalogo.primerTamano(p)).toUpperCase()].filter(Boolean).join(" · ");
      x.fillStyle = "rgba(22,22,22,.7)";
      x.font = `500 ${w * 0.046}px ${LETRA}`;
      x.fillText(pie, w / 2, h * 0.85);

      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = anisotropia;
      return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0 });
    }

    /** Un frasco completo del perfume `p` (no se agrega a la escena: eso lo decide quien lo pide). */
    function armar(p) {
      const { forma, tapa, liquido: colorLiquido } = aspecto(p);
      const m = molde(forma);
      const materiales = {
        liquido: liquido(colorLiquido, forma === "hexagonal"),
        vidrio,
        vidrioPlano,
        etiqueta: etiqueta(p, colorLiquido, ...m.etiqueta),
        tapa: metal(tapa),
      };
      const grupo = new THREE.Group();
      const cuerpo = new THREE.Group();
      grupo.add(cuerpo);
      for (const [geo, mat, y, z, orden] of m.piezas) {
        const pieza = new THREE.Mesh(geo, materiales[mat]);
        pieza.position.set(0, y, z);
        pieza.renderOrder = orden;
        cuerpo.add(pieza);
      }
      cuerpo.position.y = -m.centro;
      cuerpo.scale.setScalar(0.82);
      return grupo;
    }

    return { armar };
  }

  return { cargarThree, aspecto, nuevo, hexARgb, rgbAHex, numeroDe, colorVivo };
})();

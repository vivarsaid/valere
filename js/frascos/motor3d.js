/* =============================================================================
   FRASCOS: MOTOR 3D (WebGL, sin librerías)
   -----------------------------------------------------------------------------
   Dibuja cada frasco en 3D a partir de su modelo (Frascos.modelo):
   cuerpo de bordes redondeados (o de vidrio), cuello, tapa y etiqueta.
   Si el perfume tiene foto, la foto se dibuja en capas para dar volumen.

   Dos formas de mostrarlo:
   · Pose fija: en tarjetas, comparador y listas. Se dibuja una vez y se copia.
   · En vivo: en la portada y en el detalle; se puede girar con el dedo o el
     mouse. Se duerme fuera de pantalla, en otra pestaña o tras 9 s sin tocarlo.

   Está APAGADO mientras AJUSTES.VISTA_3D sea false. Se puede reemplazar por
   Three.js más adelante sin tocar las vistas: basta con exponer lo mismo.

   Usa:     Frascos, Halloween (opcional, para el color del contorno)
   Expone:  Motor3D { ok, pintar, pose, registrarTextura, olvidarPoses, limpiar }
   ============================================================================= */

const Motor3D = (() => {
  const html = document.documentElement;
  const ligero = () => html.classList.contains("lite");
  const consulta = (q) => {
    try {
      return matchMedia(q).matches;
    } catch (e) {
      return false;
    }
  };
  const MENOS_MOVIMIENTO = consulta("(prefers-reduced-motion:reduce)");
  const PANTALLA_TACTIL = consulta("(pointer:coarse)");

  /* ── Matemáticas de matrices 4×4 (en columnas, como WebGL) ───────────────── */
  const identidad = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const multiplicar = (a, b) => {
    const o = new Array(16);
    for (let c = 0; c < 4; c++)
      for (let r = 0; r < 4; r++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
        o[c * 4 + r] = s;
      }
    return o;
  };
  const mover = (x, y, z) => {
    const m = identidad();
    m[12] = x;
    m[13] = y;
    m[14] = z;
    return m;
  };
  const girarY = (a) => {
    const c = Math.cos(a),
      s = Math.sin(a),
      m = identidad();
    m[0] = c;
    m[2] = -s;
    m[8] = s;
    m[10] = c;
    return m;
  };
  const girarX = (a) => {
    const c = Math.cos(a),
      s = Math.sin(a),
      m = identidad();
    m[5] = c;
    m[6] = s;
    m[9] = -s;
    m[10] = c;
    return m;
  };
  const perspectiva = (campo, aspecto, cerca, lejos) => {
    const t = 1 / Math.tan(campo / 2),
      m = new Array(16).fill(0);
    m[0] = t / aspecto;
    m[5] = t;
    m[10] = (lejos + cerca) / (cerca - lejos);
    m[11] = -1;
    m[14] = (2 * lejos * cerca) / (cerca - lejos);
    return m;
  };
  const matriz3 = (m) => [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]];

  /** "#0f5c73" → [r, g, b] en luz lineal (0 a 1). */
  const colorLineal = (h) => {
    h = String(h || "#888").replace("#", "");
    if (h.length < 6)
      h = h
        .split("")
        .map((c) => c + c)
        .join("");
    return [0, 2, 4].map((i) => Math.pow((parseInt(h.substr(i, 2), 16) || 0) / 255, 2.2));
  };

  /* ── Mallas ──────────────────────────────────────────────────────────────── */

  /** Cuadrícula de nu×nv a partir de una función (u, v) → [x, y, z], con normales suavizadas. */
  function cuadricula(nu, nv, punto) {
    const P = [],
      T = [],
      I = [];
    for (let j = 0; j <= nv; j++)
      for (let i = 0; i <= nu; i++) {
        P.push(...punto(i / nu, j / nv, j));
        T.push(i / nu, j / nv);
      }
    for (let j = 0; j < nv; j++)
      for (let i = 0; i < nu; i++) {
        const a = j * (nu + 1) + i,
          b = a + 1,
          c = a + nu + 1,
          d = c + 1;
        I.push(a, c, b, b, c, d);
      }
    const N = new Array(P.length).fill(0);
    for (let k = 0; k < I.length; k += 3) {
      const a = I[k] * 3,
        b = I[k + 1] * 3,
        c = I[k + 2] * 3;
      const ux = P[b] - P[a],
        uy = P[b + 1] - P[a + 1],
        uz = P[b + 2] - P[a + 2];
      const vx = P[c] - P[a],
        vy = P[c + 1] - P[a + 1],
        vz = P[c + 2] - P[a + 2];
      const nx = uy * vz - uz * vy,
        ny = uz * vx - ux * vz,
        nz = ux * vy - uy * vx;
      for (const q of [a, b, c]) {
        N[q] += nx;
        N[q + 1] += ny;
        N[q + 2] += nz;
      }
    }
    // la costura (primera y última columna) comparte normal para que no se note
    for (let j = 0; j <= nv; j++) {
      const a = j * (nu + 1) * 3,
        b = (j * (nu + 1) + nu) * 3;
      for (let k = 0; k < 3; k++) {
        const s = N[a + k] + N[b + k];
        N[a + k] = N[b + k] = s;
      }
    }
    for (let k = 0; k < N.length; k += 3) {
      const l = Math.hypot(N[k], N[k + 1], N[k + 2]) || 1;
      N[k] /= l;
      N[k + 1] /= l;
      N[k + 2] /= l;
    }
    return { p: P, n: N, t: T, i: I };
  }

  const potenciaConSigno = (x, e) => Math.sign(x) * Math.pow(Math.abs(x), e);

  /** Caja de bordes redondeados (superelipsoide). */
  const cajaRedonda = (w, h, d, e = 0.2) =>
    cuadricula(56, 40, (u, v) => {
      const la = (v - 0.5) * Math.PI,
        lo = u * 2 * Math.PI - Math.PI;
      return [
        (w / 2) * potenciaConSigno(Math.cos(la), e) * potenciaConSigno(Math.cos(lo), e),
        (h / 2) * potenciaConSigno(Math.sin(la), e),
        (d / 2) * potenciaConSigno(Math.cos(la), e) * potenciaConSigno(Math.sin(lo), e),
      ];
    });

  /** Pieza de revolución a partir de un perfil [[radio, altura], ...]. */
  const torno = (perfil, lados = 40) =>
    cuadricula(lados, perfil.length - 1, (u, v, j) => {
      const a = u * 2 * Math.PI,
        q = perfil[j];
      return [q[0] * Math.cos(a), q[1], q[0] * Math.sin(a)];
    });
  const cilindro = (r, y0, y1, b = 0.025) =>
    torno([
      [0, y0],
      [r - b, y0],
      [r, y0 + b],
      [r, y1 - b],
      [r - b, y1],
      [0, y1],
    ]);
  const cono = (r, h) =>
    torno(
      [
        [r, 0],
        [r * 0.5, h * 0.5],
        [0, h],
      ],
      14
    );
  const rectangulo = (w, h, z) => ({
    p: [-w / 2, -h / 2, z, w / 2, -h / 2, z, w / 2, h / 2, z, -w / 2, h / 2, z],
    n: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
    t: [0, 1, 1, 1, 1, 0, 0, 0],
    i: [0, 1, 2, 0, 2, 3],
  });

  /** La etiqueta del frasco con su texto, dibujada al momento. */
  function etiqueta(texto, fondo) {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const x = c.getContext("2d");
    x.fillStyle = fondo;
    x.beginPath();
    x.roundRect ? x.roundRect(6, 6, 244, 244, 16) : x.rect(6, 6, 244, 244);
    x.fill();
    const b = colorLineal(fondo);
    const fondoClaro = b[0] * 0.3 + b[1] * 0.6 + b[2] * 0.1 > 0.35;
    x.fillStyle = fondoClaro ? "#141416" : "#f2f2f4";
    x.textAlign = "center";
    x.textBaseline = "middle";
    const renglones = String(texto || "")
      .split("|")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 3);
    renglones.forEach((s, k) => {
      let tam = k ? 20 : 34;
      const familia = '"Helvetica Neue",Helvetica,Arial,sans-serif';
      do {
        x.font = `${k ? 500 : 700} ${tam}px ${familia}`;
        tam -= 2;
      } while (x.measureText(s).width > 208 && tam > 10);
      x.fillText(s, 128, renglones.length === 1 ? 128 : 100 + k * 48);
    });
    x.fillRect(64, 170, 128, 2);
    return c;
  }

  /* ── Del modelo a las piezas ─────────────────────────────────────────────── */
  const texturas = {}; // nombre de foto → { cv, w, h }

  /** Guarda una foto como textura (la llama Frascos al cargar fotos). */
  function registrarTextura(nombre, imagen, w, h) {
    const TAM = ligero() ? 512 : 1024;
    const cv = document.createElement("canvas");
    cv.width = cv.height = TAM;
    const x = cv.getContext("2d");
    x.imageSmoothingQuality = "high";
    x.drawImage(imagen, 0, 0, TAM, TAM);
    texturas[nombre] = { cv, w, h };
  }

  /**
   * Las piezas que forman el frasco. Cada pieza: malla (g), posición (loc),
   * color (col), metal (met), brillo (gl), opacidad (al) y textura (tex).
   */
  function piezas(s) {
    const W = s.w,
      H = s.h,
      D = s.d,
      color = colorLineal(s.c),
      tapa = colorLineal(s.t),
      M = [];

    // Con foto: la foto en capas apiladas, para que se vea con volumen.
    if (s.foto && texturas[s.foto]) {
      const t = texturas[s.foto],
        alto = 2.2,
        ancho = alto * (t.w / t.h),
        capas = s.lay || 24,
        grosor = 0.13;
      for (let k = 0; k < capas; k++) {
        const f = k / (capas - 1);
        M.push({
          g: rectangulo(ancho, alto, 0),
          loc: [0, 0, -grosor + f * grosor],
          col: [1, 1, 1],
          met: 0,
          gl: 0.5,
          al: 1,
          tex: t.cv,
          tkey: s.foto,
          ph: 1,
          edge: k === capas - 1 ? 0 : 1 - f * 0.6,
        });
      }
      return M;
    }

    // Cuerpo: de vidrio (con el perfume adentro) o sólido.
    if (s.v) {
      M.push({
        g: cajaRedonda(W * 0.9, H * 0.82, D * 0.6, 0.22),
        loc: [0, -0.02, 0],
        col: color,
        met: 0,
        gl: 0.7,
        al: 1,
      });
      M.push({
        g: cajaRedonda(W, H, D, 0.2),
        loc: [0, 0, 0],
        col: color.map((x) => x * 0.5 + 0.06),
        met: 0,
        gl: 1,
        al: 0.3,
        glass: 1,
      });
    } else {
      M.push({ g: cajaRedonda(W, H, D, 0.2), loc: [0, 0, 0], col: color, met: 0.05, gl: 0.95, al: 1 });
    }
    // Cuello
    M.push({
      g: cilindro(0.13, 0, 0.2, 0.01),
      loc: [0, H / 2 - 0.06, 0],
      col: [0.55, 0.56, 0.6],
      met: 0.9,
      gl: 0.8,
      al: 1,
    });
    // Tapa
    const yTapa = H / 2 + 0.12;
    if (s.tp === "cilindro") {
      M.push({ g: cilindro(0.17, 0, 0.46), loc: [0, yTapa, 0], col: tapa, met: 0.9, gl: 0.85, al: 1 });
    } else if (s.tp === "corona") {
      M.push({ g: cilindro(0.17, 0, 0.22, 0.03), loc: [0, yTapa, 0], col: tapa, met: 0.95, gl: 0.85, al: 1 });
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        M.push({
          g: cono(0.045, 0.2),
          loc: [Math.cos(a) * 0.13, yTapa + 0.21, Math.sin(a) * 0.13],
          col: tapa,
          met: 0.95,
          gl: 0.85,
          al: 1,
        });
      }
      M.push({ g: cilindro(0.14, 0, 0.04, 0.01), loc: [0, yTapa + 0.2, 0], col: tapa, met: 0.95, gl: 0.85, al: 1 });
    } else {
      M.push({
        g: cajaRedonda(0.38, 0.36, 0.34, 0.16),
        loc: [0, yTapa + 0.14, 0],
        col: tapa,
        met: 0.9,
        gl: 0.85,
        al: 1,
      });
    }
    // Etiqueta
    M.push({
      g: rectangulo(0.64, 0.64, D / 2 + 0.004),
      loc: [0, -0.06, 0],
      col: [1, 1, 1],
      met: 0,
      gl: 0.25,
      al: 1,
      tex: etiqueta(s.e, s.l),
    });
    return M;
  }

  /* ── Sombreadores (GLSL) ─────────────────────────────────────────────────── */
  const SOMBREADOR_VERTICES =
    "attribute vec3 p;attribute vec3 n;attribute vec2 t;uniform mat4 uP,uMV;uniform mat3 uN;varying vec3 vN,vV;varying vec2 vT;" +
    "void main(){vec4 m=uMV*vec4(p,1.);gl_Position=uP*m;vN=uN*n;vV=-m.xyz;vT=t;}";

  // Luz de estudio: un reflejo del ambiente (env), luz difusa, brillo de borde (uRim)
  // y, para fotos (uTex=2), un brillo suave encima de la imagen.
  const SOMBREADOR_PIXELES = `precision mediump float;varying vec3 vN,vV;varying vec2 vT;uniform vec3 uC,uRim;uniform float uMet,uGl,uAl,uTex,uEdge;uniform sampler2D uS;
vec3 env(vec3 r){float h=r.y*.5+.5;vec3 c=mix(vec3(.015,.015,.025),vec3(.30,.33,.42),smoothstep(.15,.95,h));
 c+=vec3(1.)*smoothstep(.62,.92,dot(r,normalize(vec3(-.55,.55,.62))))*1.25;
 c+=vec3(.85,.9,1.)*smoothstep(.82,.98,dot(r,normalize(vec3(.85,.15,.5))))*.95;
 c+=uRim*smoothstep(.45,.95,dot(r,normalize(vec3(.1,.35,-1.))))*1.3;
 c+=vec3(.5)*smoothstep(.9,1.,r.y)*.35;return c;}
void main(){vec3 n=normalize(vN),v=normalize(vV);if(dot(n,v)<0.)n=-n;
 vec3 base=uC;float ta=1.;if(uTex>.5){vec4 s=texture2D(uS,vT);base=pow(s.rgb,vec3(2.2));ta=s.a;if(uTex>1.5&&ta<.02)discard;}
 if(uTex>1.5){float lum=dot(base,vec3(.3,.6,.1));vec3 col=base;
  if(uEdge>0.){col=base*.3+uRim*.22*uEdge;}
  else{vec3 nn=normalize(n+vec3((vT.x-.5)*.7,-(vT.y-.5)*.5,0.));vec3 r=reflect(-v,nn);
   float sh=pow(max(dot(r,normalize(vec3(-.4,.6,.7))),0.),12.)*.3+pow(max(dot(r,normalize(vec3(.6,-.2,.6))),0.),18.)*.16;
   col=base*(.92+.12*max(dot(nn,normalize(vec3(-.5,.7,.7))),0.))+vec3(1.,.97,.93)*sh*(1.-lum*.6)*ta+uRim*pow(1.-clamp(dot(nn,v),0.,1.),2.)*.16;}
  col=col/(1.+col*.15);col=pow(col,vec3(1./2.2));gl_FragColor=vec4(col*ta,ta);return;}
 float nv=clamp(dot(n,v),0.,1.);float F=.04+.96*pow(1.-nv,4.);
 vec3 L=normalize(vec3(-.5,.7,.7));float df=max(dot(n,L),0.);
 vec3 e=env(reflect(-v,n));
 vec3 dif=base*(.18+.85*df+.12*max(dot(n,normalize(vec3(.8,.1,.4))),0.));
 vec3 col=mix(dif+e*F*uGl,e*base*1.15,uMet);
 col+=uRim*pow(1.-nv,3.)*.35*uGl;
 float a=uAl*ta;if(uAl<1.)a=clamp(a+F*.9,0.,1.);
 col=col/(1.+col*.4);col=pow(col,vec3(1./2.2));
 gl_FragColor=vec4(col*a,a);}`;

  /* ── Dibujante WebGL ─────────────────────────────────────────────────────── */
  class Dibujante {
    constructor(cv) {
      const opciones = { alpha: true, antialias: true, premultipliedAlpha: true };
      const gl = cv.getContext("webgl", opciones) || cv.getContext("experimental-webgl", opciones);
      if (!gl) throw new Error("sin webgl");
      this.gl = gl;
      this.cv = cv;
      this.cache = new Map();
      this.cacheTexturas = new Map();

      const compilar = (tipo, codigo) => {
        const s = gl.createShader(tipo);
        gl.shaderSource(s, codigo);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      const pg = (this.programa = gl.createProgram());
      gl.attachShader(pg, compilar(gl.VERTEX_SHADER, SOMBREADOR_VERTICES));
      gl.attachShader(pg, compilar(gl.FRAGMENT_SHADER, SOMBREADOR_PIXELES));
      gl.linkProgram(pg);
      if (!gl.getProgramParameter(pg, gl.LINK_STATUS)) throw new Error("enlace");
      gl.useProgram(pg);
      this.a = { p: gl.getAttribLocation(pg, "p"), n: gl.getAttribLocation(pg, "n"), t: gl.getAttribLocation(pg, "t") };
      this.u = {};
      ["uP", "uMV", "uN", "uC", "uRim", "uMet", "uGl", "uAl", "uTex", "uEdge", "uS"].forEach(
        (k) => (this.u[k] = gl.getUniformLocation(pg, k))
      );
    }

    bufer(arr, tipo, Clase) {
      const gl = this.gl,
        b = gl.createBuffer();
      gl.bindBuffer(tipo, b);
      gl.bufferData(tipo, new Clase(arr), gl.STATIC_DRAW);
      return b;
    }

    /** Sube las piezas del modelo a la tarjeta de video (una sola vez por modelo). */
    preparar(s) {
      const clave = JSON.stringify(s);
      if (this.cache.has(clave)) return this.cache.get(clave);
      const gl = this.gl;
      const lista = piezas(s).map((m) => {
        const o = Object.assign({}, m);
        o.bp = this.bufer(m.g.p, gl.ARRAY_BUFFER, Float32Array);
        o.bn = this.bufer(m.g.n, gl.ARRAY_BUFFER, Float32Array);
        o.bt = this.bufer(m.g.t, gl.ARRAY_BUFFER, Float32Array);
        o.bi = this.bufer(m.g.i, gl.ELEMENT_ARRAY_BUFFER, Uint16Array);
        o.nI = m.g.i.length;
        if (m.tex) {
          const k = m.tkey || m.tex;
          let t = this.cacheTexturas.get(k);
          if (!t) {
            t = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, t);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, m.tex);
            if (m.tkey) {
              gl.generateMipmap(gl.TEXTURE_2D);
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            } else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            try {
              const ex = gl.getExtension("EXT_texture_filter_anisotropic");
              ex && gl.texParameterf(gl.TEXTURE_2D, ex.TEXTURE_MAX_ANISOTROPY_EXT, 4);
            } catch (_) {}
            this.cacheTexturas.set(k, t);
          }
          o.tx = t;
        }
        return o;
      });
      this.cache.set(clave, lista);
      return lista;
    }

    /** Dibuja las piezas giradas `ry` (vertical) y `rx` (horizontal) en un lienzo de w×h. */
    dibujar(lista, ry, rx, w, h, contorno) {
      const gl = this.gl,
        u = this.u,
        a = this.a;
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(this.programa);
      const giro = multiplicar(girarX(rx), girarY(ry));
      const base = multiplicar(mover(0, 0, -7), multiplicar(giro, mover(0, -0.22, 0)));
      gl.uniformMatrix4fv(u.uP, false, new Float32Array(perspectiva((26 * Math.PI) / 180, w / h, 1, 20)));
      gl.uniformMatrix3fv(u.uN, false, new Float32Array(matriz3(giro)));
      gl.uniform3fv(u.uRim, contorno || [0.8, 0.8, 0.85]);
      gl.uniform1i(u.uS, 0);
      // primero lo sólido, luego el vidrio (transparente) encima
      [0, 1].forEach((pasada) => {
        gl.depthMask(!pasada);
        lista
          .filter((m) => (pasada ? m.glass : !m.glass))
          .forEach((m) => {
            gl.uniformMatrix4fv(u.uMV, false, new Float32Array(multiplicar(base, mover(m.loc[0], m.loc[1], m.loc[2]))));
            gl.uniform3fv(u.uC, m.col);
            gl.uniform1f(u.uMet, m.met);
            gl.uniform1f(u.uGl, m.gl);
            gl.uniform1f(u.uAl, m.al);
            gl.uniform1f(u.uTex, m.ph ? 2 : m.tx ? 1 : 0);
            gl.uniform1f(u.uEdge, m.edge || 0);
            if (m.tx) {
              gl.activeTexture(gl.TEXTURE0);
              gl.bindTexture(gl.TEXTURE_2D, m.tx);
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, m.bp);
            gl.enableVertexAttribArray(a.p);
            gl.vertexAttribPointer(a.p, 3, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, m.bn);
            gl.enableVertexAttribArray(a.n);
            gl.vertexAttribPointer(a.n, 3, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, m.bt);
            gl.enableVertexAttribArray(a.t);
            gl.vertexAttribPointer(a.t, 2, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.bi);
            gl.drawElements(gl.TRIANGLES, m.nI, gl.UNSIGNED_SHORT, 0);
          });
      });
      gl.depthMask(true);
    }
  }

  /** Color del contorno de luz: con el tema de temporada toma el ambiente del perfume. */
  function colorContorno(p) {
    try {
      if (html.classList.contains("hw") && typeof Halloween !== "undefined") {
        return Halloween.aura(p)
          .gl.split(",")
          .map((x) => Math.pow(+x / 255, 2.2));
      }
    } catch (e) {}
    return [0.8, 0.8, 0.85];
  }

  /* ── Poses fijas ─────────────────────────────────────────────────────────── */
  let compartido = null; // un solo WebGL para todas las poses fijas
  const poses = new Map();

  function crearCompartido() {
    const c = document.createElement("canvas");
    c.width = 720;
    c.height = 960;
    compartido = new Dibujante(c);
    c.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      compartido = null;
      poses.clear();
    });
  }

  /** Imagen fija del frasco (se guarda para no volver a dibujarla). */
  function pose(p) {
    const s = Object.assign(Frascos.modelo(p), { lay: ligero() ? 6 : 10 });
    const contorno = colorContorno(p);
    const prop = Frascos.proporcion(p);
    const clave = JSON.stringify([s, contorno, prop]);
    if (poses.has(clave)) return poses.get(clave);
    if (!compartido) crearCompartido();

    const conFoto = !!(s.foto && texturas[s.foto]);
    const ancho = Math.round(480 * prop);
    compartido.cv.width = ancho;
    compartido.cv.height = 480;
    compartido.dibujar(compartido.preparar(s), conFoto ? -0.34 : -0.55, conFoto ? 0.06 : 0.07, ancho, 480, contorno);

    const o = document.createElement("canvas");
    o.width = ancho;
    o.height = 480;
    const x = o.getContext("2d");
    x.imageSmoothingQuality = "high";
    x.drawImage(compartido.cv, 0, 0, o.width, 480);
    // marca de agua discreta
    x.globalAlpha = 0.16;
    x.fillStyle = "#fff";
    x.font = 'italic 400 17px Georgia,"Times New Roman",serif';
    x.textAlign = "center";
    x.fillText("valère", o.width / 2, 462);
    x.globalAlpha = 1;
    poses.set(clave, o);
    return o;
  }

  /* ── En vivo (portada y detalle): se puede girar ─────────────────────────── */
  const enVivo = new Map(); // canvas → FrascoVivo

  class FrascoVivo {
    constructor(cv, p) {
      const s = Frascos.modelo(p);
      this.cv = cv;
      this.p = p;
      this.dibujante = new Dibujante(cv);
      this.lista = this.dibujante.preparar(Object.assign({}, s, { lay: ligero() ? 10 : 20 }));
      this.conFoto = !!(s.foto && texturas[s.foto]);
      this.ry = this.conFoto ? -0.34 : -0.55; // giro actual
      this.rx = 0.06;
      this.metaY = this.ry; // giro al que se va acercando (fotos)
      this.metaX = this.rx;
      this.velocidad = MENOS_MOVIMIENTO || this.conFoto ? 0 : 0.006;
      this.arrastrando = false;
      this.encima = false;
      this.visible = true;
      this.cambio = true;
      this.cuadro = 0;
      this.ultimo = 0;
      this.hasta = performance.now() + 9000; // se duerme tras 9 s sin tocarlo
      this.esPortada = !!cv.closest("#ht");

      cv.style.touchAction = "pan-y";
      cv.style.cursor = "grab";
      const limitar = (x, a) => Math.max(-a, Math.min(a, x));
      const despertar = () => {
        this.hasta = performance.now() + 9000;
        this.pedirCuadro();
      };

      cv.addEventListener("pointerdown", (e) => {
        this.arrastrando = true;
        this.lx = e.clientX;
        this.ly = e.clientY;
        this.velocidad = 0;
        try {
          cv.setPointerCapture(e.pointerId);
        } catch (_) {}
        cv.style.cursor = "grabbing";
        despertar();
      });
      cv.addEventListener("pointermove", (e) => {
        if (this.arrastrando) {
          const dx = (e.clientX - this.lx) * 0.012,
            dy = (e.clientY - this.ly) * 0.004;
          this.lx = e.clientX;
          this.ly = e.clientY;
          if (this.conFoto) {
            this.metaY = limitar(this.metaY + dx, 0.95);
            this.metaX = limitar(this.metaX + dy, 0.4);
          } else {
            this.ry += dx;
            this.rx = limitar(this.rx + dy, 0.5);
          }
          this.cambio = true;
          despertar();
        } else if (this.conFoto && e.pointerType === "mouse") {
          // con foto y mouse: el frasco sigue al cursor
          const b = cv.getBoundingClientRect();
          this.encima = true;
          this.metaY = limitar(((e.clientX - b.left - b.width / 2) / (b.width / 2)) * 0.7, 0.7);
          this.metaX = limitar((-(e.clientY - b.top - b.height / 2) / (b.height / 2)) * 0.22, 0.3);
          this.cambio = true;
          despertar();
        }
      });
      cv.addEventListener("pointerleave", () => {
        this.encima = false;
        despertar();
      });
      const soltar = () => {
        this.arrastrando = false;
        cv.style.cursor = "grab";
        if (!MENOS_MOVIMIENTO && !this.conFoto) this.velocidad = 0.006;
        despertar();
      };
      cv.addEventListener("pointerup", soltar);
      cv.addEventListener("pointercancel", soltar);
      cv.addEventListener("webglcontextlost", (e) => {
        e.preventDefault();
        this.desechar();
        Frascos.fallar(cv);
      });
      try {
        this.observador = new IntersectionObserver((es) => {
          this.visible = es[0].isIntersecting;
          if (this.visible) {
            this.cambio = true;
            despertar();
          }
        });
        this.observador.observe(cv);
      } catch (_) {}
      this.ciclo = this.ciclo.bind(this);
      this.pedirCuadro();
    }

    pedirCuadro() {
      if (!this.cuadro && !this.muerto) this.cuadro = requestAnimationFrame(this.ciclo);
    }

    ciclo(ahora) {
      this.cuadro = 0;
      if (this.muerto) return;
      if (!this.cv.isConnected) return this.desechar();
      // dormido: no pide más cuadros hasta que algo lo despierte
      if (!this.visible || document.hidden || (this.esPortada && $("dialog[open]"))) return;

      const quieto = ahora > this.hasta && !this.arrastrando && !this.encima;
      if (this.conFoto) {
        if (!this.arrastrando && !this.encima) {
          const t = ahora / 1000;
          this.metaY = MENOS_MOVIMIENTO || quieto ? -0.2 : 0.34 * Math.sin(t * 0.8) - 0.12;
          this.metaX = MENOS_MOVIMIENTO || quieto ? 0.05 : 0.06 * Math.sin(t * 0.6) + 0.05;
        }
        const dy = this.metaY - this.ry,
          dx = this.metaX - this.rx;
        if (Math.abs(dy) > 0.0004 || Math.abs(dx) > 0.0004) {
          this.ry += dy * 0.1;
          this.rx += dx * 0.1;
          this.cambio = true;
        }
      } else if (!quieto) this.ry += this.velocidad;

      const meciendose = this.conFoto ? !MENOS_MOVIMIENTO && !quieto && !this.encima : !!this.velocidad && !quieto;
      if (this.cambio || meciendose) {
        // a ~30 cuadros por segundo en celular o modo ligero, ~60 en compu
        const espera = this.arrastrando ? 0 : PANTALLA_TACTIL || ligero() ? 33 : 16;
        if (ahora - this.ultimo >= espera) {
          this.ultimo = ahora;
          this.cambio = false;
          const dpr = Math.min(devicePixelRatio || 1, ligero() ? 1.25 : 1.75);
          const altoVisible = this.cv.clientHeight;
          if (altoVisible) {
            const h = Math.min(ligero() ? 560 : 800, Math.round(altoVisible * dpr));
            const w = Math.round(h * Frascos.proporcion(this.p));
            if (this.cv.width !== w || this.cv.height !== h) {
              this.cv.width = w;
              this.cv.height = h;
            }
            try {
              this.dibujante.dibujar(this.lista, this.ry, this.rx, w, h, colorContorno(this.p));
            } catch (e) {
              this.desechar();
              Frascos.fallar(this.cv);
              return;
            }
          }
        }
        this.pedirCuadro();
      }
    }

    desechar() {
      this.muerto = true;
      try {
        this.observador && this.observador.disconnect();
      } catch (_) {}
      enVivo.delete(this.cv);
      try {
        const x = this.dibujante.gl.getExtension("WEBGL_lose_context");
        x && x.loseContext();
      } catch (_) {}
    }
  }

  // Despertar los frascos en vivo al volver a la pestaña o al cerrar una ventana.
  const despertarTodos = () =>
    enVivo.forEach((v) => {
      v.hasta = performance.now() + 9000;
      v.cambio = true;
      v.pedirCuadro();
    });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) despertarTodos();
  });
  addEventListener("close", despertarTodos, true);

  /* ── Lo que usa Frascos ──────────────────────────────────────────────────── */

  /** Pinta un <canvas class="b3">: en vivo en portada/detalle, pose fija en lo demás. */
  function pintar(cv, p) {
    const zonaEnVivo = ligero() ? "#pd .im" : "#pd .im,#ht";
    if (cv.closest(zonaEnVivo)) {
      enVivo.set(cv, new FrascoVivo(cv, p));
    } else {
      const x = cv.getContext("2d");
      x.clearRect(0, 0, cv.width, cv.height);
      x.drawImage(pose(p), 0, 0, cv.width, cv.height);
    }
  }

  /** Suelta los frascos en vivo que ya no están en la página. */
  const limpiar = () =>
    enVivo.forEach((v, cv) => {
      if (!cv.isConnected) v.desechar();
    });

  // ¿Se puede usar 3D? Solo si está prendido en los AJUSTES y el aparato tiene WebGL.
  let ok = false;
  if (Config.vista3d) {
    try {
      crearCompartido();
      ok = true;
    } catch (e) {
      ok = false;
    }
  }

  return { ok, pintar, pose, registrarTextura, olvidarPoses: () => poses.clear(), limpiar };
})();

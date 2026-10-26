/* =============================================================================
   FORMATO
   -----------------------------------------------------------------------------
   Convierte datos en texto y HTML listos para mostrar: precios en pesos,
   tamaños, la etiqueta de descuento y el frasco de cada perfume.

   Usa:     Catalogo, Frascos (js/frascos/fotos.js)
   Expone:  Formato
   ============================================================================= */

const Formato = {
  /** 2299 → "$2,299" */
  dinero: (n) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }),

  /** Evita que un texto del catálogo se interprete como HTML. Úsalo siempre al pintar datos. */
  escapar: (s) => String(s).replace(/[&<>"']/g, (c) => "&#" + c.charCodeAt(0) + ";"),

  /** "100" → "100 ml"; "1" → "Kit" */
  tamano: (tam) => (+tam === 1 ? "Kit" : tam + " ml"),

  GENERO: { h: "Hombre", m: "Mujer", u: "Unisex" },
  PARA: { h: "Para hombre", m: "Para mujer", u: "Unisex" },

  /** Precio con el precio anterior tachado si hay descuento. */
  precio(p, tam) {
    const M = Formato.dinero;
    const antes = Catalogo.precioAntes(p, tam);
    const ahora = `<strong>${M(p.precios[tam])}</strong>`;
    return antes ? `<s>${M(antes)}</s> ${ahora}` : ahora;
  },

  /** La etiqueta naranja "−33%" (vacía si no hay descuento). */
  etiqueta(p, tam) {
    const d = Catalogo.descuento(p, tam);
    return d ? `<i class="dc">−${d}%</i>` : "";
  },

  /** Frasco dibujado con SVG; el dibujo está en plantillas/comun-arriba.html (#bo). */
  frascoDibujado: (color) =>
    `<svg class="b" viewBox="0 0 100 140" style="--c:${Formato.escapar(color)}" aria-hidden="true"><use href="#bo"/></svg>`,

  /**
   * El frasco de un perfume: en 3D, con foto o dibujado, según lo que haya y
   * lo que soporte el aparato. Los <canvas> los pinta después js/frascos/.
   */
  frasco(p) {
    const E = Formato.escapar;
    const datos = `data-id="${E(p.id)}" data-col="${E(p.color)}" role="img" aria-label="${E(p.nombre)}"`;
    if (Frascos.hay3d()) {
      return `<canvas class="ph b3" width="${Math.round(480 * Frascos.proporcion(p))}" height="480" ${datos}></canvas>`;
    }
    if (Frascos.tieneFoto(p)) {
      return `<canvas class="ph b3 flat" width="${Math.round(400 * Frascos.proporcion(p))}" height="400" ${datos}></canvas>`;
    }
    return Formato.frascoDibujado(p.color);
  },
};

/* =============================================================================
   VISTA: DETALLE DEL PERFUME (perfume.html?p=…)
   -----------------------------------------------------------------------------
   Dibuja en #pd la foto, notas, tamaños y precio de un perfume, con los botones
   "Guardar en mi lista" y "Comparar con otro".
   Si #pd fuera un <dialog>, funcionaría como ventana flotante.

   El recuadro del frasco toma el color del perfume y, en la página, el frasco
   gira en 3D (js/frascos/vitrina3d.js).

   Usa:     $, $$, Catalogo, Formato, Pagina, Ventanas, Vitrina3D
   Expone:  VistaProducto
   ============================================================================= */

const VistaProducto = (() => {
  let actual = null; // el perfume que se está viendo
  let tam = null; // el tamaño elegido
  const E = Formato.escapar;
  const CAPAS = [
    ["Salida", "salida"],
    ["Corazón", "corazon"],
    ["Fondo", "fondo"],
  ];

  // Íconos de cada capa de notas (gota, corazón, capas)
  const ICONO_CAPA = {
    salida: '<path d="M12 3C8 8.5 6 12 6 15a6 6 0 0 0 12 0c0-3-2-6.5-6-12z"/>',
    corazon: '<path d="M12 20s-8-5-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15 12 20 12 20z"/>',
    fondo: '<path d="M12 4L3 9l9 5 9-5z"/><path d="M3 13l9 5 9-5"/>',
  };
  const icono = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONO_CAPA[k]}</svg>`;

  /** Precio del tamaño elegido, su descuento y cuánto se ahorra. */
  const precioHTML = () => {
    const antes = Catalogo.precioAntes(actual, tam);
    return (
      `${Formato.precio(actual, tam)} ${Formato.etiqueta(actual, tam)}` +
      (antes ? `<span class="ah">Ahorras ${Formato.dinero(antes - actual.precios[tam])}</span>` : "")
    );
  };
  const esVentana = () => {
    const d = $("#pd");
    return !!d && d.tagName === "DIALOG";
  };

  /** Muestra el perfume con ese id. Si no estamos en perfume.html, lleva ahí. */
  function abrir(id) {
    const p = Catalogo.buscar(id);
    const el = $("#pd");
    if (!p) return;
    if (!el) return Pagina.ir(Pagina.enlacePerfume(p));

    actual = p;
    tam = Catalogo.primerTamano(p);
    const ventana = esVentana();
    const H = ventana ? "h3" : "h1";

    const incluye = p.esKit
      ? `<dl><dt>Incluye</dt><dd>${
          p.incluye
            ? E(p.incluye)
            : "Perfume más un complemento con el mismo aroma (crema corporal o frasco pequeño). Te confirmamos el contenido exacto por chat."
        }</dd></dl>`
      : "";
    const capas = CAPAS.filter(([, k]) => p.notas[k].length);
    // Notas: un renglón por capa, con su ícono y cada nota en una pastilla
    const notas = capas.length
      ? `<div class="nts">` +
        capas
          .map(
            ([titulo, k]) =>
              `<div class="nt-f"><span class="nt-i">${icono(k)}</span><div><small>${titulo}</small>` +
              `<p>${p.notas[k].map((n) => `<i>${E(n)}</i>`).join("")}</p></div></div>`
          )
          .join("") +
        `</div>`
      : "";
    const tamanos = Object.keys(p.precios)
      .map(
        (t) =>
          `<button data-accion="elegir-tamano" data-tam="${t}" aria-pressed="${t === tam}">${Formato.tamano(t)}</button>`
      )
      .join("");

    el.classList.remove("vacio");
    el.style.setProperty("--pc", p.color); // el color del perfume para los brillos
    el.innerHTML =
      (ventana ? `<button class="x" data-accion="cerrar" aria-label="Cerrar">×</button>` : "") +
      `<div class="im" style="--pc:${E(p.color)}">${Formato.frasco(p)}</div>` +
      `<div class="tx">` +
      `<small class="mk">${E(p.marca)}</small><${H}>${E(p.nombre)}</${H}>` +
      `<p class="fam">${E(Formato.GENERO[p.genero] || "Perfume")} · ${E(p.familia)}</p>` +
      incluye +
      notas +
      `<div class="sz">${tamanos}</div>` +
      `<div id="pp">${precioHTML()}</div>` +
      `<button class="btn gd" data-accion="guardar-perfume">Guardar en mi lista</button>` +
      `<button class="btn o" data-accion="comparar-con" data-id="${E(p.id)}">Comparar con otro ›</button>` +
      `</div>`;

    if (ventana) Ventanas.abrir(el);
    else {
      document.title = `${p.nombre} · ${p.marca} · valère`;
      Vitrina3D.montar($(".im", el), p); // el frasco gira en 3D (si el aparato puede)
    }
  }

  /** Cuando el link pide un perfume que no existe. */
  function noEncontrado() {
    const el = $("#pd");
    if (!el) return;
    el.classList.add("vacio");
    el.innerHTML =
      `<div class="tx"><h1>No encontramos ese perfume</h1>` +
      `<p class="fam">Puede que ya no esté en el catálogo o que el link esté incompleto.</p>` +
      `<a class="btn" href="descubrir.html">Ver el catálogo</a></div>`;
  }

  function elegirTamano(t) {
    tam = t;
    $$(".sz button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.tam === tam));
    $("#pp").innerHTML = precioHTML();
  }

  return {
    abrir,
    noEncontrado,
    esVentana,
    elegirTamano,
    actual: () => actual,
    tamano: () => tam,
    olvidar() {
      actual = null;
    },
  };
})();

# valère · catálogo de perfumes

Sitio para descubrir, comparar y guardar perfumes, y mandar la lista por WhatsApp, Instagram o Facebook.

**Cómo está hecho todo (archivos, orden de carga, recetas):** [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)
**Cómo colaborar (ramas y pull requests):** [CONTRIBUTING.md](CONTRIBUTING.md)

## Lo que se toca seguido

| Quiero… | Archivo |
|---|---|
| Agregar, quitar o cambiar perfumes | `data/perfumes.json` |
| Cambiar WhatsApp, redes, correo, regalo, 3D del carrusel, fechas del tema | `js/config.js` → luego *Generar páginas* |
| Cambiar el Aviso de privacidad o los Términos (y su fecha) | `plantillas/paginas/privacidad.html`, `terminos.html` |
| Cambiar colores | `css/base.css` (`:root`) → luego *Generar páginas* |
| Cambiar menú, pie o algo de todas las páginas | `plantillas/` → luego *Generar páginas* |

> Los `.html` de la raíz se generan solos desde `plantillas/`. Edita las plantillas y corre
> **Terminal → Ejecutar tarea… → Generar páginas** en VS Code.
> Córrelo también después de cambiar cualquier archivo de `css/` o `js/`: así cada uno lleva su huella
> (`?v=…`) y los navegadores descargan la versión nueva en vez de usar una vieja guardada.

## Probarla en tu compu

Con doble clic **no carga el catálogo** (el navegador bloquea leer el JSON).
Abre la carpeta en VS Code, instala **Live Server** y da clic derecho en `index.html` → *Open with Live Server*.

## Extensiones recomendadas de VS Code

Al abrir la carpeta, VS Code sugiere instalarlas:
- **Live Server**: para ver la página mientras la editas.
- **Prettier**: acomoda el código solo al guardar.

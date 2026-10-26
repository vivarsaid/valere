# Cómo colaborar en valère

¡Gracias por ayudar! Antes de empezar, lee [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md): explica qué hace cada archivo.

## Ramas

| Rama | Para qué | ¿Se trabaja directo? |
|---|---|---|
| `main` | Lo que está publicado en internet | **No.** Solo recibe cambios desde `desarrollo` |
| `desarrollo` | Donde se juntan y prueban los cambios | **No.** Solo recibe pull requests |
| `tipo/descripcion` | Tu trabajo (una rama por cambio) | Sí |

Tipos de rama:

- `perfumes/…` agregar o editar perfumes (ej. `perfumes/agregar-sauvage`)
- `diseno/…` cambios visuales (ej. `diseno/barra-inferior-celular`)
- `funcion/…` algo nuevo (ej. `funcion/visor-3d`)
- `arreglo/…` corregir un error (ej. `arreglo/tache-mi-lista`)
- `temporada/…` temas de temporada (ej. `temporada/navidad`)
- `docs/…` documentación

## Paso a paso

```bash
# 1. Trae lo último y crea tu rama desde desarrollo
git checkout desarrollo
git pull
git checkout -b diseno/mi-cambio

# 2. Haz tus cambios y guárdalos
git add .
git commit -m "Agrega barra inferior en celular"

# 3. Súbela y abre el pull request hacia desarrollo
git push -u origin diseno/mi-cambio
```

En GitHub, abre el pull request **hacia `desarrollo`** (no hacia `main`) y llena la plantilla.

Si no tienes permiso de escritura en el repositorio, primero haz un *fork* (botón **Fork** en GitHub), trabaja en tu copia y abre el pull request desde ahí.

## Antes de abrir el pull request

- [ ] Probé la página con **Live Server** y no hay errores en la consola (F12 → Consola).
- [ ] La revisé en tamaño celular (F12 → ícono de celular).
- [ ] Si cambié algo en `plantillas/`, corrí **Generar páginas** y subí los `.html` que cambiaron.
- [ ] Si cambié `data/perfumes.json`, sigue siendo JSON válido (sin comas de más).
- [ ] Si agregué un archivo, lo documenté en `docs/ARQUITECTURA.md`.
- [ ] El código está formateado con Prettier (se hace solo al guardar con la extensión).

## Mensajes de commit

En español, en presente y diciendo qué cambia:

- ✅ `Agrega Sauvage al catálogo`
- ✅ `Corrige el tache de Mi lista con el tema de Halloween`
- ❌ `cambios`, `fix`, `asdf`

## Publicar

Cuando `desarrollo` esté probado, el dueño abre un pull request de `desarrollo` → `main`. Al juntarlo, se publica.

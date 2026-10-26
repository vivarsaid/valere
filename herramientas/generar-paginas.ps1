# =============================================================================
# GENERAR PAGINAS
# -----------------------------------------------------------------------------
# Arma los archivos .html de la raiz juntando:
#   plantillas/comun-arriba.html   <head>, estilos, scripts y cabecera
#   plantillas/paginas/<pagina>.html  el contenido propio de cada pagina
#   plantillas/comun-abajo.html    pie, Mi lista y avisos
# La lista de paginas, con su titulo y descripcion, esta en plantillas/paginas.txt
#
# Como correrlo:
#   En VS Code: Terminal > Ejecutar tarea... > "Generar paginas"
#   O en la terminal:  powershell -ExecutionPolicy Bypass -File herramientas\generar-paginas.ps1
#
# (Este archivo no lleva acentos a proposito: PowerShell 5 los lee mal.)
# =============================================================================

$raiz = Split-Path -Parent $PSScriptRoot
$plantillas = Join-Path $raiz "plantillas"
$utf8 = New-Object System.Text.UTF8Encoding $false

function Leer($ruta) { [IO.File]::ReadAllText((Join-Path $plantillas $ruta), [Text.Encoding]::UTF8) }

$arriba = Leer "comun-arriba.html"
$abajo = Leer "comun-abajo.html"
$bienvenida = Leer "bienvenida.html"
$secciones = "descubrir", "kits", "comparar", "nosotros", "contacto"   # las que aparecen en el menu

$lineas = (Leer "paginas.txt") -split "`r?`n" | Where-Object { $_ -match '\|' -and $_ -notmatch '^\s*#' }
foreach ($linea in $lineas) {
  $c = $linea -split '\|'
  $archivo = $c[0].Trim(); $pagina = $c[1].Trim(); $titulo = $c[2].Trim(); $descripcion = $c[3].Trim()

  $html = $arriba.Replace("{{TITULO}}", $titulo).Replace("{{DESC}}", $descripcion).Replace("{{PAGINA}}", $pagina)

  # La bienvenida animada solo va en la portada
  if ($pagina -eq "inicio") { $html = $html.Replace("{{BIENVENIDA}}", $bienvenida) }
  else { $html = $html.Replace("{{BIENVENIDA}}", "") }

  # En el menu se marca la pagina actual
  foreach ($s in $secciones) {
    $marca = ""
    if ($s -eq $pagina) { $marca = ' aria-current="page"' }
    $html = $html.Replace("{{ACTUAL_$s}}", $marca)
  }

  $html = $html + (Leer "paginas\$pagina.html") + $abajo
  [IO.File]::WriteAllText((Join-Path $raiz $archivo), $html, $utf8)
  Write-Host "listo: $archivo"
}

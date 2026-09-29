# Mini-servidor local para previsualizar la web (sin instalar nada).
# Copiar a tools\ del proyecto. Uso:
#   powershell -ExecutionPolicy Bypass -File tools\servidor.ps1 -Puerto 8765
# Sirve la carpeta del proyecto (la carpeta padre de tools\) en http://localhost:<Puerto>/
param([int]$Puerto = 8765)

$raiz = Split-Path -Parent $PSScriptRoot   # tools\ -> raiz del proyecto
$mime = @{
  ".html"  = "text/html; charset=utf-8"
  ".css"   = "text/css; charset=utf-8"
  ".js"    = "application/javascript; charset=utf-8"
  ".mjs"   = "application/javascript; charset=utf-8"
  ".json"  = "application/json; charset=utf-8"
  ".xml"   = "application/xml; charset=utf-8"
  ".txt"   = "text/plain; charset=utf-8"
  ".png"   = "image/png"
  ".jpg"   = "image/jpeg"
  ".jpeg"  = "image/jpeg"
  ".webp"  = "image/webp"
  ".avif"  = "image/avif"
  ".svg"   = "image/svg+xml"
  ".ico"   = "image/x-icon"
  ".mp4"   = "video/mp4"
  ".woff2" = "font/woff2"
  ".woff"  = "font/woff"
  ".webmanifest" = "application/manifest+json"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Puerto/")
$listener.Start()
Write-Host "Servidor en marcha: http://localhost:$Puerto/  (Ctrl+C para parar)"

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $ruta = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
    if ($ruta.EndsWith("/")) { $ruta = $ruta + "index.html" }
    $archivo = Join-Path $raiz ($ruta.TrimStart("/") -replace "/", "\")
    $completo = ""
    try { $completo = [IO.Path]::GetFullPath($archivo) } catch { $completo = "" }

    if ($completo -and $completo.StartsWith($raiz, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $completo -PathType Leaf)) {
      $ext = [IO.Path]::GetExtension($completo).ToLower()
      $tipo = $mime[$ext]
      if (-not $tipo) { $tipo = "application/octet-stream" }
      $bytes = [IO.File]::ReadAllBytes($completo)
      $ctx.Response.ContentType = $tipo
      $ctx.Response.Headers.Add("Cache-Control", "no-store")
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
      $pagina404 = Join-Path $raiz "404.html"
      if (Test-Path -LiteralPath $pagina404 -PathType Leaf) {
        $msg = [IO.File]::ReadAllBytes($pagina404)
        $ctx.Response.ContentType = "text/html; charset=utf-8"
      } else {
        $msg = [Text.Encoding]::UTF8.GetBytes("404 - no existe")
        $ctx.Response.ContentType = "text/plain; charset=utf-8"
      }
      $ctx.Response.ContentLength64 = $msg.Length
      $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
    }
    $ctx.Response.Close()
  } catch {
    # Peticion abortada o error puntual: seguimos sirviendo.
  }
}

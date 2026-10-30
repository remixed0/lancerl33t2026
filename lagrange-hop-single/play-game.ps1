# Lagrange Hop 3D: starts a small local web server for this folder and opens the game in the browser.
# Run it with "Play Lagrange Hop.bat" (double-click). Close the window to stop the game server.
# A server is needed because browsers block Bob's voice when the page is opened straight from a file.

$root = $PSScriptRoot
$types = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8'
  '.json' = 'application/json'; '.mp3' = 'audio/mpeg'; '.png' = 'image/png'; '.jpg' = 'image/jpeg'
  '.svg' = 'image/svg+xml'; '.ico' = 'image/x-icon'; '.glb' = 'model/gltf-binary'
}

# Use the first free port from 8080 up
$listener = $null
foreach ($port in 8080..8099) {
  try {
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$port/")
    $listener.Start()
    break
  } catch { $listener = $null }
}
if (-not $listener) { Write-Host 'Could not start the game server (ports 8080-8099 are busy).'; Read-Host 'Press Enter to close'; exit 1 }

$url = "http://localhost:$port/"
$Host.UI.RawUI.WindowTitle = 'Lagrange Hop - game server'
Write-Host ''
Write-Host '  LAGRANGE HOP 3D is running.' -ForegroundColor Green
Write-Host "  Open: $url"
Write-Host '  Keep this window open while you play. Close it to stop the game.'
Write-Host ''
Start-Process $url

$rootFull = [IO.Path]::GetFullPath($root)
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
    if ($path -eq '' -or $path.EndsWith('/')) { $path += 'index.html' }
    $file = [IO.Path]::GetFullPath((Join-Path $rootFull $path))
    if ($file.StartsWith($rootFull) -and (Test-Path $file -PathType Leaf)) {
      $bytes = [IO.File]::ReadAllBytes($file)
      $type = $types[[IO.Path]::GetExtension($file).ToLower()]
      if ($type) { $ctx.Response.ContentType = $type }
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
    }
  } catch {
    $ctx.Response.StatusCode = 500
  } finally {
    $ctx.Response.Close()
  }
}

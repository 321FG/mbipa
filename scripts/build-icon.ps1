$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Julius\mbipa-app\assets\images\MbipaUpdated.png"
$src = New-Object System.Drawing.Bitmap $srcPath
$w = $src.Width
$h = $src.Height
$minX = $w; $minY = $h; $maxX = 0; $maxY = 0
for ($y = 0; $y -lt $h; $y++) {
  for ($x = 0; $x -lt $w; $x++) {
    $p = $src.GetPixel($x, $y)
    $isBg = ($p.A -lt 10) -or ($p.R -gt 240 -and $p.G -gt 240 -and $p.B -gt 240)
    if (-not $isBg) {
      if ($x -lt $minX) { $minX = $x }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
}
"Bounds: $minX,$minY -> $maxX,$maxY (size ${w}x${h})"
$cropW = $maxX - $minX + 1
$cropH = $maxY - $minY + 1

$trim = New-Object System.Drawing.Bitmap $cropW, $cropH
$gT = [System.Drawing.Graphics]::FromImage($trim)
$gT.SmoothingMode = "AntiAlias"
$gT.InterpolationMode = "HighQualityBicubic"
$destRect = New-Object System.Drawing.Rectangle 0, 0, $cropW, $cropH
$gT.DrawImage($src, $destRect, $minX, $minY, $cropW, $cropH, [System.Drawing.GraphicsUnit]::Pixel)
$trim.Save("C:\Users\Julius\mbipa-app\assets\images\MbipaUpdatedTrim.png", [System.Drawing.Imaging.ImageFormat]::Png)
$gT.Dispose()
$trim.Dispose()

$icon = 1024
$bmp = New-Object System.Drawing.Bitmap $icon, $icon
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = "AntiAlias"
$g.InterpolationMode = "HighQualityBicubic"
$g.Clear([System.Drawing.Color]::White)
$target = [int]($icon * 0.70)
$ratio = [Math]::Min($target / $cropW, $target / $cropH)
$dw = [int]($cropW * $ratio)
$dh = [int]($cropH * $ratio)
$dx = [int](($icon - $dw) / 2)
$dy = [int](($icon - $dh) / 2)
$srcCrop = New-Object System.Drawing.Bitmap "C:\Users\Julius\mbipa-app\assets\images\MbipaUpdatedTrim.png"
$g.DrawImage($srcCrop, $dx, $dy, $dw, $dh)
$bmp.Save("C:\Users\Julius\mbipa-app\assets\images\app-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
$srcCrop.Dispose()
$src.Dispose()
"OK: trim ${cropW}x${cropH}, drawn ${dw}x${dh} at ${dx},${dy}"

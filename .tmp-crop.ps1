param(
  [string]$Src,
  [int]$X, [int]$Y, [int]$W, [int]$H,
  [double]$Scale = 2.0,
  [string]$Out
)
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile((Resolve-Path $Src))
$rect = New-Object System.Drawing.Rectangle($X, $Y, $W, $H)
$crop = New-Object System.Drawing.Bitmap($W, $H)
$g = [System.Drawing.Graphics]::FromImage($crop)
$g.DrawImage($img, (New-Object System.Drawing.Rectangle(0,0,$W,$H)), $rect, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()
$nw = [int]($W * $Scale); $nh = [int]($H * $Scale)
$big = New-Object System.Drawing.Bitmap($nw, $nh)
$g2 = [System.Drawing.Graphics]::FromImage($big)
$g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g2.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g2.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g2.DrawImage($crop, 0, 0, $nw, $nh)
$g2.Dispose()
$big.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$big.Dispose(); $crop.Dispose(); $img.Dispose()
Write-Output "$Out ($nw x $nh)"

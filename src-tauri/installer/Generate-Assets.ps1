$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$OutputDir = Split-Path -Parent $MyInvocation.MyCommand.Path
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

function New-Canvas([int]$Width, [int]$Height) {
  $bitmap = New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  return @{ Bitmap = $bitmap; Graphics = $graphics }
}

function Draw-JayverMark($Graphics, [single]$X, [single]$Y, [single]$Width, [single]$Height) {
  # Polygon contours are traced from public/brand/jayver-mark.svg, preserving the real J.
  $polygons = @(
    [System.Drawing.PointF[]]@(
      [System.Drawing.PointF]::new(820.8,313.1), [System.Drawing.PointF]::new(786.6,327.8),
      [System.Drawing.PointF]::new(735.8,353.7), [System.Drawing.PointF]::new(725.7,357.4),
      [System.Drawing.PointF]::new(623.2,407.2), [System.Drawing.PointF]::new(576.2,652.8),
      [System.Drawing.PointF]::new(570.6,687.8), [System.Drawing.PointF]::new(560.5,737.7),
      [System.Drawing.PointF]::new(553.1,765.4), [System.Drawing.PointF]::new(542.0,795.8),
      [System.Drawing.PointF]::new(529.1,820.8), [System.Drawing.PointF]::new(511.5,844.8),
      [System.Drawing.PointF]::new(489.4,866.0), [System.Drawing.PointF]::new(470.0,878.9),
      [System.Drawing.PointF]::new(456.2,885.4), [System.Drawing.PointF]::new(434.0,890.9),
      [System.Drawing.PointF]::new(418.3,890.0), [System.Drawing.PointF]::new(405.4,881.7),
      [System.Drawing.PointF]::new(397.1,872.5), [System.Drawing.PointF]::new(390.6,860.5),
      [System.Drawing.PointF]::new(386.9,847.5), [System.Drawing.PointF]::new(386.0,832.8),
      [System.Drawing.PointF]::new(389.7,810.6), [System.Drawing.PointF]::new(439.5,657.4),
      [System.Drawing.PointF]::new(446.0,634.3), [System.Drawing.PointF]::new(445.1,632.5),
      [System.Drawing.PointF]::new(265.1,754.3), [System.Drawing.PointF]::new(50.0,904.8),
      [System.Drawing.PointF]::new(457.1,904.8), [System.Drawing.PointF]::new(494.0,902.9),
      [System.Drawing.PointF]::new(529.1,895.5), [System.Drawing.PointF]::new(566.9,880.8),
      [System.Drawing.PointF]::new(602.0,862.3), [System.Drawing.PointF]::new(661.1,821.7),
      [System.Drawing.PointF]::new(689.7,797.7), [System.Drawing.PointF]::new(713.7,773.7),
      [System.Drawing.PointF]::new(730.3,749.7), [System.Drawing.PointF]::new(740.5,724.8),
      [System.Drawing.PointF]::new(749.7,686.0), [System.Drawing.PointF]::new(780.2,532.8)
    ),
    [System.Drawing.PointF[]]@(
      [System.Drawing.PointF]::new(949.1,50.0), [System.Drawing.PointF]::new(918.6,65.7),
      [System.Drawing.PointF]::new(765.4,154.3), [System.Drawing.PointF]::new(497.7,304.8),
      [System.Drawing.PointF]::new(400.8,402.6), [System.Drawing.PointF]::new(278.0,530.9),
      [System.Drawing.PointF]::new(458.9,444.2), [System.Drawing.PointF]::new(503.2,421.1),
      [System.Drawing.PointF]::new(831.8,259.5)
    )
  )
  $sx = $Width / 1000.0
  $sy = $Height / 1000.0
  $matrix = New-Object System.Drawing.Drawing2D.Matrix([single]$sx, 0, 0, [single]$sy, $X, $Y)
  $bounds = [System.Drawing.RectangleF]::new($X, $Y, $Width, $Height)
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($bounds, [System.Drawing.Color]::FromArgb(255,250,252,254), [System.Drawing.Color]::FromArgb(255,116,130,143), 35.0)
  foreach ($points in $polygons) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddPolygon($points)
    $path.Transform($matrix)
    $Graphics.FillPath($brush, $path)
    $path.Dispose()
  }
  $brush.Dispose()
  $matrix.Dispose()
}

# 150 x 57 header bitmap used by the NSIS page header.
$header = New-Canvas 150 57
$g = $header.Graphics
$bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  [System.Drawing.Rectangle]::new(0,0,150,57),
  [System.Drawing.Color]::FromArgb(255,20,25,29),
  [System.Drawing.Color]::FromArgb(255,11,14,17), 90.0)
$g.FillRectangle($bg,0,0,150,57)
$bg.Dispose()
$line = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(65,169,200,216),1)
$g.DrawLine($line,0,56,150,56)
$line.Dispose()
Draw-JayverMark $g 12 9 29 39
$font = New-Object System.Drawing.Font("Segoe UI Semibold",8.0,[System.Drawing.FontStyle]::Bold,[System.Drawing.GraphicsUnit]::Pixel)
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(245,232,237,240))
$g.DrawString("JAYVER",$font,$brush,49,21)
$brush.Dispose(); $font.Dispose()
$header.Bitmap.Save((Join-Path $OutputDir "header.bmp"),[System.Drawing.Imaging.ImageFormat]::Bmp)
$g.Dispose(); $header.Bitmap.Dispose()

# 164 x 314 welcome/finish sidebar. The actual J is surrounded by flowing chrome ribbons.
$side = New-Canvas 164 314
$g = $side.Graphics
$rect = [System.Drawing.Rectangle]::new(0,0,164,314)
$bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect,[System.Drawing.Color]::FromArgb(255,20,26,31),[System.Drawing.Color]::FromArgb(255,5,8,11),35.0)
$g.FillRectangle($bg,$rect); $bg.Dispose()

$glow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(22,169,200,216))
$g.FillEllipse($glow,17,67,130,130); $glow.Dispose()

# Liquid metal flow lines, intentionally subdued behind the mark.
$flowA = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(115,205,218,228),2.0)
$flowB = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(48,116,151,170),1.0)
$g.DrawBezier($flowA,-35,145,25,102,71,184,199,132)
$g.DrawBezier($flowB,-35,159,35,125,88,205,199,149)
$g.DrawBezier($flowA,-35,211,36,165,106,245,199,195)
$flowA.Dispose(); $flowB.Dispose()

Draw-JayverMark $g 40 77 84 104

$rule = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(62,169,200,216),1)
$g.DrawLine($rule,18,254,146,254)
$rule.Dispose()
$font = New-Object System.Drawing.Font("Segoe UI Semibold",10.0,[System.Drawing.FontStyle]::Bold,[System.Drawing.GraphicsUnit]::Pixel)
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(242,232,237,240))
$measure = $g.MeasureString("JAYVER",$font)
$g.DrawString("JAYVER",$font,$brush,(164-$measure.Width)/2,268)
$brush.Dispose(); $font.Dispose()

$side.Bitmap.Save((Join-Path $OutputDir "sidebar.bmp"),[System.Drawing.Imaging.ImageFormat]::Bmp)
$g.Dispose(); $side.Bitmap.Dispose()

Write-Host "Generated Jayver NSIS artwork: header.bmp (150x57), sidebar.bmp (164x314)"

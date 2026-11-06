$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$root=Split-Path $PSScriptRoot -Parent
$source=[Drawing.Image]::FromFile((Join-Path $root 'src/img/FinBot.png'))
$frames=[Collections.Generic.List[byte[]]]::new()
$sizes=@(16,24,32,48,64,128,256)
try {
 foreach($size in $sizes){
  $bitmap=[Drawing.Bitmap]::new($size,$size)
  $graphics=[Drawing.Graphics]::FromImage($bitmap)
  $stream=[IO.MemoryStream]::new()
  try{
   $graphics.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
   $graphics.DrawImage($source,0,0,$size,$size)
   $bitmap.Save($stream,[Drawing.Imaging.ImageFormat]::Png)
   $frames.Add($stream.ToArray())
  }finally{$stream.Dispose();$graphics.Dispose();$bitmap.Dispose()}
 }
 $target=Join-Path $root 'src/FinBot.Desktop/Assets/FinBot.ico'
 New-Item -ItemType Directory -Force (Split-Path $target -Parent)|Out-Null
 $file=[IO.File]::Create($target);$writer=[IO.BinaryWriter]::new($file)
 try{
  $writer.Write([uint16]0);$writer.Write([uint16]1);$writer.Write([uint16]$sizes.Count)
  $offset=6+16*$sizes.Count
  for($i=0;$i -lt $sizes.Count;$i++){
   $dimension=if($sizes[$i] -eq 256){0}else{$sizes[$i]}
   $writer.Write([byte]$dimension);$writer.Write([byte]$dimension)
   $writer.Write([byte]0);$writer.Write([byte]0);$writer.Write([uint16]1);$writer.Write([uint16]32)
   $writer.Write([uint32]$frames[$i].Length);$writer.Write([uint32]$offset)
   $offset+=$frames[$i].Length
  }
  foreach($frame in $frames){$writer.Write($frame)}
 }finally{$writer.Dispose();$file.Dispose()}
 Write-Host 'Ícone Windows gerado em sete tamanhos.'
}finally{$source.Dispose()}

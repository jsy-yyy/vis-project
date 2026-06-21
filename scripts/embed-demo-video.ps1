param(
  [string]$BasePptx = "presentation\dist\BattleMap-defense-base.pptx",
  [string]$Video = "presentation\assets\demo-short.mp4",
  [string]$OutputPptx = "presentation\dist\BattleMap-defense.pptx"
)

$ErrorActionPreference = "Stop"

$basePath = (Resolve-Path $BasePptx).Path
$videoPath = (Resolve-Path $Video).Path
$outputPath = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPptx))

$powerPoint = New-Object -ComObject PowerPoint.Application
$powerPoint.Visible = -1

try {
  $presentation = $powerPoint.Presentations.Open($basePath, 0, 0, 0)
  $slide = $presentation.Slides.Item(3)

  # Coordinates correspond to the 900 × 506 px demo frame on a 1280 × 720 Marp slide.
  $media = $slide.Shapes.AddMediaObject2(
    $videoPath,
    0,
    -1,
    142.5,
    118.5,
    675,
    379.5
  )
  $media.Name = "BattleMap Demo Video"

  # Click-to-play; do not start automatically or loop.
  $media.AnimationSettings.PlaySettings.PlayOnEntry = 0
  $media.AnimationSettings.PlaySettings.LoopUntilStopped = 0
  $media.AnimationSettings.PlaySettings.HideWhileNotPlaying = 0

  $presentation.SaveAs($outputPath, 24)
  $presentation.Close()
}
finally {
  $powerPoint.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint) | Out-Null
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}

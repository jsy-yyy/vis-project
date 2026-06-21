param(
  [string]$Output = "presentation\assets\demo-short.mp4"
)

$ErrorActionPreference = "Stop"
$font = "C\:/Windows/Fonts/msyhbd.ttc"
$subtitle = (Resolve-Path "presentation\assets\demo-short.srt").Path.Replace("\", "/").Replace(":", "\:")

$inputs = @(
  "docs\screenshots\wwii-overview.png",
  "doc\figure\timeline-comparison.png",
  "doc\figure\map-ww2.png",
  "doc\figure\network-selected.png",
  "doc\figure\overview.png"
)

$arguments = @("-y")
foreach ($input in $inputs) {
  $arguments += @("-loop", "1", "-t", "12", "-i", $input)
}
$arguments += @("-f", "lavfi", "-t", "58", "-i", "anullsrc=r=48000:cl=stereo")

$filter = @"
[0:v]scale=1408:792:force_original_aspect_ratio=increase,crop=1408:792,zoompan=z='min(zoom+0.00045,1.055)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=360:s=1280x720:fps=30,setsar=1[v0];
[1:v]scale=1408:792:force_original_aspect_ratio=increase,crop=1408:792,zoompan=z='min(zoom+0.0005,1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=360:s=1280x720:fps=30,setsar=1[v1];
[2:v]scale=1408:792:force_original_aspect_ratio=increase,crop=1408:792,zoompan=z='min(zoom+0.00045,1.055)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=360:s=1280x720:fps=30,setsar=1[v2];
[3:v]scale=1408:792:force_original_aspect_ratio=increase,crop=1408:792,zoompan=z='min(zoom+0.00045,1.055)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=360:s=1280x720:fps=30,setsar=1[v3];
[4:v]scale=1408:792:force_original_aspect_ratio=increase,crop=1408:792,zoompan=z='min(zoom+0.0005,1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=360:s=1280x720:fps=30,setsar=1[v4];
[v0][v1]xfade=transition=fade:duration=0.5:offset=11.5[x1];
[x1][v2]xfade=transition=fade:duration=0.5:offset=23[x2];
[x2][v3]xfade=transition=fade:duration=0.5:offset=34.5[x3];
[x3][v4]xfade=transition=fade:duration=0.5:offset=46[base];
[base]drawbox=x=0:y=616:w=1280:h=104:color=0x071013@0.84:t=fill,
subtitles='$subtitle':force_style='FontName=Microsoft YaHei,FontSize=24,PrimaryColour=&H00F2F4EE,OutlineColour=&H00101416,BorderStyle=1,Outline=2,Shadow=0,Alignment=2,MarginV=27'[video]
"@ -replace "`r?`n", ""

$arguments += @(
  "-filter_complex", $filter,
  "-map", "[video]",
  "-map", "5:a",
  "-t", "58",
  "-c:v", "libx264",
  "-profile:v", "high",
  "-level", "4.0",
  "-pix_fmt", "yuv420p",
  "-r", "30",
  "-b:v", "4200k",
  "-maxrate", "5200k",
  "-bufsize", "8400k",
  "-c:a", "aac",
  "-b:a", "128k",
  "-movflags", "+faststart",
  $Output
)

& ffmpeg @arguments
if ($LASTEXITCODE -ne 0) {
  throw "ffmpeg failed with exit code $LASTEXITCODE"
}

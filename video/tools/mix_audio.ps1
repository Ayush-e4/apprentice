# Builds the soundtrack with ffmpeg and muxes it onto the silent render.
#   1. Places each Kokoro voice line at its scene start (adelay).
#   2. Ducks the music under the voice (sidechaincompress).
#   3. Normalises loudness (loudnorm) and muxes with out/explainer-silent.mp4.
# Usage (from the video folder): powershell -File tools\mix_audio.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root
$t = Get-Content src\timeline.json -Raw | ConvertFrom-Json
$fps = $t.fps
$seconds = $t.totalFrames / $fps

$inputs = @('-i', 'public/music.wav')
$filters = @()
$labels = ''
$i = 1
foreach ($s in $t.scenes) {
    $inputs += @('-i', "public/voice/$($s.id).wav")
    $ms = [int](($s.from + $s.voiceDelay) / $fps * 1000)
    $filters += "[$i]aresample=44100,aformat=channel_layouts=stereo,adelay=${ms}|${ms}[v$i]"
    $labels += "[v$i]"
    $i++
}
$n = $t.scenes.Count
$filters += "${labels}amix=inputs=${n}:normalize=0,apad,atrim=0:${seconds}[voice]"
$filters += "[voice]asplit=2[vkey][vout]"
$filters += "[0]volume=0.35,atrim=0:${seconds}[music]"
$filters += "[music][vkey]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[ducked]"
$filters += "[vout][ducked]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[out]"

New-Item -ItemType Directory -Force out | Out-Null
& ffmpeg -y -hide_banner -loglevel error @inputs -filter_complex ($filters -join ';') -map '[out]' -ar 48000 -c:a aac -b:a 192k out/soundtrack.m4a
if ($LASTEXITCODE -ne 0) { throw 'soundtrack mix failed' }
Write-Output "soundtrack: out/soundtrack.m4a"

if (Test-Path out/explainer-silent.mp4) {
    & ffmpeg -y -hide_banner -loglevel error -i out/explainer-silent.mp4 -i out/soundtrack.m4a -map 0:v -map 1:a -c:v copy -c:a copy -shortest -movflags +faststart out/apprentice-explainer.mp4
    if ($LASTEXITCODE -ne 0) { throw 'mux failed' }
    Write-Output "video: out/apprentice-explainer.mp4"
}

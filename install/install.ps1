$TargetDir = Join-Path $HOME ".openclaw/workspace"
$SourceDir = Join-Path (Split-Path $PSScriptRoot -Parent) "workspace"

New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
Copy-Item -Path (Join-Path $SourceDir "*") -Destination $TargetDir -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path (Join-Path $SourceDir ".agents") -Destination $TargetDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "OpenClaw Life Coach 模板已复制到: $TargetDir"
Write-Host "请手动参考 config/openclaw.json.template 合并到 ~/.openclaw/openclaw.json"

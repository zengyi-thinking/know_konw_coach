$RootDir = Split-Path $PSScriptRoot -Parent
$TargetDir = Join-Path $HOME ".openclaw/workspace"
$SourceDir = Join-Path $RootDir "workspace"
$SelftestPath = Join-Path $RootDir "runtime/tests/run-selftest.js"

New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
Copy-Item -Path (Join-Path $SourceDir "*") -Destination $TargetDir -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path (Join-Path $SourceDir ".agents") -Destination $TargetDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "OpenClaw Life Coach workspace 已复制到: $TargetDir"
Write-Host "runtime 自测入口保留在仓库内: $SelftestPath"
Write-Host "请手动参考 config/openclaw.json.template 合并到 ~/.openclaw/openclaw.json"
Write-Host "真实 CREATION_AI_* 环境变量请只在本地 shell 或私有配置中注入，不要写回仓库。"

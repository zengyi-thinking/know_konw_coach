$RootDir = Split-Path $PSScriptRoot -Parent
node (Join-Path $RootDir "scripts/install-openclaw.js")

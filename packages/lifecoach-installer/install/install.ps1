$RootDir = Split-Path $PSScriptRoot -Parent
node (Join-Path $RootDir "install-openclaw.js")

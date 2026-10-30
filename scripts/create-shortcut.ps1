$ErrorActionPreference = 'Stop'
$exe = Join-Path (Split-Path $PSScriptRoot -Parent) 'artifacts/FinBot/FinBot.exe'
if (!(Test-Path -LiteralPath $exe)) { throw 'Gere a versão executável com scripts/publish.ps1 primeiro.' }
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Desktop')) 'FinBot.lnk'))
$shortcut.TargetPath = $exe
$shortcut.IconLocation = (Join-Path (Split-Path $exe -Parent) 'Assets/FinBot.ico') + ',0'
$shortcut.WorkingDirectory = Split-Path $exe -Parent
$shortcut.Description = 'FinBot - Finanças pessoais'
$shortcut.Save()
Write-Host 'Atalho FinBot criado na Área de Trabalho.'

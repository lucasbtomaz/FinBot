$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
function Invoke-Checked {
    param([scriptblock]$Command)
    & $Command
    if ($LASTEXITCODE -ne 0) { throw "Comando falhou com código $LASTEXITCODE." }
}
Push-Location $projectRoot
try {
    Push-Location src/finbot-ui
    try {
        Invoke-Checked { npm.cmd ci }
        Invoke-Checked { npm.cmd run build }
    } finally { Pop-Location }
    Invoke-Checked { dotnet test FinBot.slnx --configuration Release }
    Invoke-Checked { dotnet build tests/FinBot.Driver/FinBot.Driver.csproj --configuration Release }
    Push-Location src/finbot-ui
    try { Invoke-Checked { npm.cmd run test:e2e } } finally { Pop-Location }
    Invoke-Checked { dotnet publish src/FinBot.Desktop/FinBot.Desktop.csproj --configuration Release --runtime win-x64 --self-contained true --output artifacts/FinBot }
    Write-Host 'Pronto. Abra artifacts/FinBot/FinBot.exe. Mantenha os arquivos dessa pasta juntos.'
} finally { Pop-Location }

$ErrorActionPreference='Stop'
$version='8.30.1'
$expected='d29144deff3a68aa93ced33dddf84b7fdc26070add4aa0f4513094c8332afc4e'
$toolRoot=Join-Path ([IO.Path]::GetTempPath()) ('finbot-gitleaks-'+$version)
New-Item -ItemType Directory -Force -Path $toolRoot | Out-Null
$archive=Join-Path $toolRoot 'gitleaks.zip'
Invoke-WebRequest "https://github.com/gitleaks/gitleaks/releases/download/v$version/gitleaks_${version}_windows_x64.zip" -OutFile $archive
if((Get-FileHash $archive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected){throw 'Checksum Gitleaks inválido.'}
Expand-Archive -LiteralPath $archive -DestinationPath $toolRoot -Force
Push-Location (Split-Path $PSScriptRoot -Parent)
try{
 & (Join-Path $toolRoot 'gitleaks.exe') git . --redact --no-banner --log-opts='--all'
 if($LASTEXITCODE){throw 'Verificação do histórico bloqueada pelo Gitleaks.'}
 & (Join-Path $toolRoot 'gitleaks.exe') dir . --redact --no-banner
 if($LASTEXITCODE){throw 'Verificação dos arquivos bloqueada pelo Gitleaks.'}
}finally{Pop-Location}

$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
Push-Location $root
try{
 & ./scripts/check-publication.ps1
 $output=Join-Path $root ('artifacts/release-'+[Guid]::NewGuid().ToString('N'))
 New-Item -ItemType Directory -Path $output | Out-Null
 $app=Join-Path $output 'FinBot'
 & npm.cmd --prefix src/finbot-ui run build
 if($LASTEXITCODE){throw 'Falha ao compilar interface'}
 & dotnet publish src/FinBot.Desktop -c Release -r win-x64 --self-contained true -o $app -p:DebugType=None -p:DebugSymbols=false
 if($LASTEXITCODE){throw 'Falha ao publicar'}
 $forbidden=Get-ChildItem $app -Recurse -File | Where-Object {$_.Name -match '\.(db|sqlite|sqlite3|pdb|pdf|log|pem|key|pfx)$|^\.env' -or $_.FullName -match '[\\/](data|backups|credentials|comprovantes)[\\/]'}
 if($forbidden){throw 'Pacote contém arquivos não autorizados'}
 Copy-Item LICENSE $app
 $zip=Join-Path $output 'FinBot-v0.0.1-win-x64.zip'
 Compress-Archive -LiteralPath $app -DestinationPath $zip
 $hash=(Get-FileHash $zip -Algorithm SHA256).Hash.ToLowerInvariant()
 [IO.File]::WriteAllText((Join-Path $output 'SHA256SUMS.txt'),"$hash  FinBot-v0.0.1-win-x64.zip"+[Environment]::NewLine)
 Write-Output "Pacote preparado em $output"
}finally{Pop-Location}

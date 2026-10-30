$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
Push-Location $root
try{
 & npm.cmd --prefix src/finbot-ui audit --audit-level=high
 if($LASTEXITCODE){throw 'Auditoria npm falhou'}
 $raw=& dotnet list FinBot.slnx package --vulnerable --include-transitive --format json
 if($LASTEXITCODE){throw 'Auditoria NuGet falhou'}
 $report=($raw -join [Environment]::NewLine)|ConvertFrom-Json
 if($report.logs | Where-Object {$_.level -eq 'error'}){throw 'Consulta NuGet incompleta'}
 foreach($project in $report.projects){foreach($framework in $project.frameworks){
  foreach($package in @($framework.topLevelPackages)+@($framework.transitivePackages)){
   if($package.vulnerabilities){throw "Dependência vulnerável: $($package.id)"}
  }
 }}
 Write-Output 'Auditorias de dependências aprovadas.'
}finally{Pop-Location}

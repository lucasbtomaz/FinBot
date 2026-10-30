param([string]$Path=(Split-Path $PSScriptRoot -Parent))
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath($Path)
$bad=@()
$files=Get-ChildItem -LiteralPath $root -Recurse -File -Force | Where-Object {
 $_.FullName -notmatch '[\\/](\.git|node_modules|bin|obj|dist|artifacts|test-results|playwright-report)[\\/]'
}
foreach($file in $files){
 $relative=[IO.Path]::GetRelativePath($root,$file.FullName).Replace('\','/')
 if($relative -match '(^|/)(credentials|backups|referencias)/|(^|/)\.env($|\.)|\.(db|sqlite|sqlite3|pdf|pfx|pem|key|log|zip|bundle)$' -or
   ($file.Extension -match '^\.(png|jpg|jpeg)$') -or ($file.Extension -eq '.ico' -and $relative -ne 'src/FinBot.Desktop/Assets/FinBot.ico')){
   if($relative -notlike 'UX/capturas/*'){$bad+="$relative : arquivo privado ou não autorizado"}
   continue
 }
 if($file.Extension -eq '.ico'){continue}
 $text=[IO.File]::ReadAllText($file.FullName)
 $rules=@{
  Credencial='(?i)(gh[pousr]_[a-z0-9]{20,}|github_pat_[a-z0-9_]{30,}|AIza[a-z0-9_-]{30,}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----)'
  CaminhoPessoal='(?i)[A-Z]:[\\/]+Users[\\/]+[a-z0-9_~.-]+'
  LinkPessoal='(?i)https?://1drv\.ms/'
  EmailPessoal='(?i)[a-z0-9._%+-]+@(hotmail|gmail|outlook|live)\.[a-z.]+'
 }
 foreach($rule in $rules.Keys){if($text -match $rules[$rule]){$bad+="$relative : $rule"}}
}
if($bad.Count){$bad | ForEach-Object {Write-Output $_};throw 'Publicação bloqueada por conteúdo potencialmente privado.'}
Write-Output 'Verificação de arquivos publicáveis aprovada. Não substitui revisão humana ou Gitleaks.'

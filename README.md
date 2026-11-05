# FinBot 0.0.1
Aplicativo local de finanças pessoais para Windows, com .NET, React e SQLite. A instalação nova começa vazia: nenhum banco, comprovante, credencial ou dado financeiro do autor acompanha o código ou a distribuição.

## Usar
Extraia toda a pasta do pacote e abra FinBot.exe. Requer Windows x64 e Microsoft Edge WebView2 Runtime. Não é necessário iniciar backend, Node ou Visual Studio. A distribuição inclui o runtime .NET. A versão inicial não possui assinatura digital nem instalador automático.

Permite contas, cartões, parcelamentos, recorrências, contas a receber, projeção de caixa, investimentos e organização de informações para IR. Comprovantes são opcionais.

## Dados locais
O banco fica em %LOCALAPPDATA%/FinBot/data. Os dados pertencem ao usuário do Windows e nunca são enviados ao GitHub pelo aplicativo. Atualizações de esquema fazem backup antes da migração. Ainda não há criptografia própria nem backup periódico.
Os comprovantes novos ficam em Documentos/FinBot/Comprovantes/ANO/MÊS. Para escolher outra pasta, defina a variável de ambiente FINBOT_RECEIPTS_DIRECTORY com um caminho absoluto e reinicie o aplicativo.
Feche o FinBot antes de copiar o banco. Faça backup também da pasta de comprovantes. O banco e os arquivos devem ser guardados separadamente do código.

## Desenvolver e validar
Requisitos: .NET SDK 10, Node.js 24, Windows e Edge.
```powershell
npm.cmd --prefix src/finbot-ui ci
npm.cmd --prefix src/finbot-ui run build
dotnet test FinBot.slnx --configuration Release
dotnet build tests/FinBot.Driver --configuration Release
npm.cmd --prefix src/finbot-ui run test:e2e
```
Os testes usam bancos temporários e exemplos fictícios. Não executam contra a base pessoal.
Para preparar o ZIP local: scripts/package-release.ps1. A geração de pacote não publica no GitHub.

## Contribuições e segurança
Consulte [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md) e [a auditoria da versão](docs/auditoria-v0.0.1.md).
A licença MIT permite cópias e alterações em forks. Ela não concede acesso de escrita a este repositório.

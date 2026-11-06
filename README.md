# FinBot — Finanças pessoais no Windows

Aplicação pessoal local em **.NET + React + SQLite**, no mesmo repositório. A versão atual permite cadastrar contas/reservas, valores a pagar/receber, compras parceladas e pagamentos de faturas sem duplicar despesas. Consulte o [guia de lançamentos](docs/como-usar-lancamentos.md) e o [roteiro](TASKS.md).

## Como usar
Depois de gerar a distribuição, dê dois cliques em `artifacts/FinBot/FinBot.exe`.
Não é necessário iniciar backend, Node ou Visual Studio para usar.
Mantenha toda a pasta da distribuição junta; o executável depende dos arquivos ao lado dele.
O aplicativo não abre servidor HTTP e encerra ao fechar a janela.

## Preparação para desenvolvimento
Windows 10/11 compatível com .NET 10, SDK .NET 10, Node.js 24 LTS e Microsoft Edge WebView2 Runtime.
A primeira instalação de dependências requer internet. O painel publicado funciona offline.
No PowerShell, na raiz:

```powershell
.\scripts\publish.ps1
# Opcional: criar atalho para o executável publicado
.\scripts\create-shortcut.ps1
```

A publicação inclui o runtime .NET para Windows x64; o WebView2 Runtime deve estar instalado.
Se faltar, utilize a [distribuição oficial da Microsoft](https://developer.microsoft.com/microsoft-edge/webview2/).
Um instalador que prepare esse requisito automaticamente é uma etapa futura.

## Estrutura
- `src/FinBot.Desktop`: janela WPF/WebView2 e ponte restrita de mensagens.
- `src/FinBot.Core`: contratos financeiros.
- `src/FinBot.Infrastructure`: SQLite local.
- `src/finbot-ui`: interface React/TypeScript.
- `tests/FinBot.Tests`: testes com bancos temporários.
- `UX`: histórico visual.
- `docs/superpowers`: escopo e plano de execução.

## Dados pessoais
Banco em `%LOCALAPPDATA%/FinBot/data/finbot-desktop.db`; cache visual em `%LOCALAPPDATA%/FinBot/webview`.
O banco fica fora do repositório e da distribuição. A atualização da base antiga gera backup antes de adicionar as tabelas financeiras. Ainda não há backup periódico nem criptografia própria.
Para copiar seus dados manualmente, feche o aplicativo e copie o arquivo do banco; não o envie ao GitHub.
Valores financeiros são representados em centavos inteiros.

## Validar
```powershell
dotnet test FinBot.slnx
cd src/finbot-ui
npm ci
npm run build
```

## Código anterior
`src/bot`, `src/ai`, `src/sheets` e `src/alerts` preservam o protótipo Python.
O desktop não executa esses módulos e não usa as credenciais de Telegram, Google Sheets ou Gemini.
O arquivo requirements.txt preexistente permanece preservado.

O script de publicação também executa o teste de interface no Edge usando banco temporário. O teste não acessa seus dados pessoais.

A aba Parcelamentos reúne contratos no cartão, Pix ou boleto, baixas individuais e previsão mensal. Cobranças semanais permitem valor fixo e adicional por ocorrência; consulte o guia para cadastrar a assinatura da moto.

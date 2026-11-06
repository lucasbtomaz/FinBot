# Plano de implementação da base desktop
> Execução direta com a skill superpowers:executing-plans; seguir as tarefas em ordem.
**Objetivo:** preparar aplicação Windows local com React e SQLite.
**Arquitetura:** WPF/WebView2 carrega assets React e consulta Infrastructure por mensagens. Core contém contratos.
**Stack:** .NET 10, React, TypeScript, SQLite, WebView2.
**Especificação:** ../specs/2026-10-23-desktop-design.md

## Restrições
Português; preservar Python e credenciais; não versionar banco; nenhum servidor ou serviço pago.
## Foco da revisão
Banco novo deve abrir vazio; reinicialização não pode apagar dados; centavos devem manter precisão; navegação externa deve ser bloqueada; publicação deve incluir interface.
## Tarefas
- [x] Criar Core e Infrastructure com LocalDatabase.Initialize e ReadSummary; testes NewDatabaseStartsEmpty e ReinitializePreservesExactCents em tests/FinBot.Tests.
- [x] Criar Desktop e React; verificar build e assets em wwwroot; restringir mensagens e navegação à origem local.
- [x] Adicionar scripts de publicação e atalho, README, TASKS e referência UX; executar dotnet test, build React e publicação win-x64.
- [x] Registrar evidências e limitações de homologação.

## Evidências
- dotnet test: 2 testes passaram (banco vazio e reabertura preservando centavos).
- npm run build: interface compilada com sucesso.
- dotnet publish: distribuição Windows x64 autocontida gerada em artifacts/FinBot.
- npm audit durante instalação: 0 vulnerabilidades reportadas.
- A abertura visual da janela e a interação WebView2 ainda exigem homologação manual. Compilação não comprova renderização.
- Não há instalador formal nem funcionalidades financeiras completas nesta etapa.

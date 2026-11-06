# Responsabilidades das Abas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplificar o FinBot para que cada aba apresente somente suas próprias ações e informações, sem alterar dados financeiros.

**Architecture:** Extrair a Visão Geral e seus blocos para componentes próprios, condicionar ações por aba e classificar contratos quitados na camada de apresentação. Separar estilos globais, de tela e de componente sem mudar a paleta atual.

**Tech Stack:** React 19, TypeScript, CSS, Playwright, .NET 10, SQLite, WebView2.

**Spec:** `docs/superpowers/specs/2026-10-30-responsabilidades-das-abas-design.md`

## Global Constraints

- Preservar cores e identidade visual atuais.
- Não alterar banco, esquema, migrações ou regras financeiras.
- Não excluir contratos quitados; apenas reorganizar a apresentação.
- Fazer backup do banco real antes de publicar.

## Review Focus

- Contrato com parcelas pagas e canceladas deve aparecer em “Contratos Quitados”.
- Contrato sem cobranças ativas não pode ser tratado como quitado.
- Ações globais não podem permanecer acessíveis em abas sem relação com elas.
- A Visão Geral não pode renderizar lançamentos ou listas de contas.
- O executável publicado deve continuar usando o banco existente em `%LOCALAPPDATA%\FinBot\data`.

---

### Task 1: Fixar responsabilidades das abas com testes

**Files:**
- Create: `src/finbot-ui/e2e/tab-responsibilities.spec.ts`
- Modify: `src/finbot-ui/e2e/finance.spec.ts`
- Modify: `src/finbot-ui/e2e/monthly-recurring.spec.ts`

**Interfaces:**
- Consumes: snapshot mockado pela ponte WebView existente.
- Produces: testes de visibilidade por aba e classificação de contratos.

- [ ] Escrever testes que exijam quatro indicadores e mês apenas na Visão Geral, ausência de lançamentos nessa tela, ações específicas nas abas corretas, previsão anual na Visão Geral e contratos quitados em seção própria.
- [ ] Executar `npm.cmd run test:e2e -- tab-responsibilities.spec.ts` e confirmar falhas causadas pela estrutura atual.
- [ ] Ajustar seletores dos testes existentes para abrir ações em suas abas responsáveis.

### Task 2: Separar composição e responsabilidades da Visão Geral

**Files:**
- Create: `src/finbot-ui/src/Overview.tsx`
- Create: `src/finbot-ui/src/Overview.css`
- Create: `src/finbot-ui/src/components/FinancialMetrics.tsx`
- Create: `src/finbot-ui/src/components/FinancialMetrics.css`
- Create: `src/finbot-ui/src/components/MonthlyForecast.tsx`
- Create: `src/finbot-ui/src/components/MonthlyForecast.css`
- Modify: `src/finbot-ui/src/main.tsx`
- Modify: `src/finbot-ui/src/CashProjection.tsx`

**Interfaces:**
- Consumes: `Snapshot`, mês selecionado e callbacks de navegação.
- Produces: `Overview` com resultado `toReceiveCents - expenseCents` e previsão dos próximos meses.

- [ ] Implementar o mínimo para os testes: remover toolbar e indicadores globais, renderizar mês e indicadores apenas na Visão Geral e retirar listas de lançamentos, contas e faturas da tela.
- [ ] Simplificar “Como vou fechar o mês?” para mostrar somente receitas totais, despesas totais e o resultado da subtração.
- [ ] Mover a grade de próximos meses para `MonthlyForecast` na Visão Geral, preservando o cálculo existente.
- [ ] Executar o teste focado e confirmar aprovação.

### Task 3: Organizar ações específicas nas demais abas

**Files:**
- Create: `src/finbot-ui/src/components/ViewActions.tsx`
- Create: `src/finbot-ui/src/components/ViewActions.css`
- Modify: `src/finbot-ui/src/main.tsx`

**Interfaces:**
- Consumes: aba atual e callback `open`.
- Produces: ações permitidas somente para a aba correspondente.

- [ ] Disponibilizar cadastro de conta e cartão em “Contas e cartões”, compra no cartão onde o fluxo de cartões pertence e transferência somente onde movimentações de contas são gerenciadas.
- [ ] Confirmar por teste que Parcelamentos, Imposto de Renda e demais abas não exibem ações alheias.
- [ ] Executar o teste focado e confirmar aprovação.

### Task 4: Separar contratos ativos e quitados

**Files:**
- Modify: `src/finbot-ui/src/Installments.tsx`
- Create: `src/finbot-ui/src/Installments.css`

**Interfaces:**
- Consumes: compras, planos e itens do `Snapshot`.
- Produces: seções ativas por cadência e seção “Contratos Quitados”.

- [ ] Classificar como quitado somente o contrato com cobranças ativas e todas sem saldo restante.
- [ ] Remover quitados das três listas ativas e renderizá-los em “Contratos Quitados”, mantendo detalhes acessíveis.
- [ ] Remover a previsão mensal da aba Parcelamentos.
- [ ] Executar testes focados de parcelamentos e recorrências.

### Task 5: Modularizar o CSS sem alterar a paleta

**Files:**
- Modify: `src/finbot-ui/src/styles.css`
- Create/Modify: arquivos CSS dos componentes e telas alterados nas tarefas anteriores.

**Interfaces:**
- Consumes: classes existentes e novas classes locais por tela.
- Produces: estilos globais mínimos e estilos próximos de cada responsabilidade.

- [ ] Mover regras específicas de Visão Geral, projeção, parcelamentos e ações para seus arquivos CSS.
- [ ] Preservar os valores atuais de cores, foco, estados e responsividade.
- [ ] Executar `npm.cmd run build` e revisar visualmente as larguras desktop e compacta.

### Task 6: Verificar, proteger dados e publicar

**Files:**
- Modify: nenhum arquivo de persistência.

**Interfaces:**
- Consumes: banco real em `%LOCALAPPDATA%\FinBot\data` e script `scripts/publish.ps1`.
- Produces: backup verificável e executável atualizado em `artifacts/FinBot`.

- [ ] Encerrar o FinBot, localizar o banco real e criar cópia com data e hora em sua pasta de backups.
- [ ] Registrar tamanho e hash do banco antes da publicação.
- [ ] Executar `npm.cmd run build`, `dotnet test FinBot.slnx --configuration Release` e a suíte E2E completa.
- [ ] Executar `scripts/publish.ps1` e confirmar código de saída zero.
- [ ] Abrir o executável pelo atalho, validar as telas principais e confirmar que os dados existentes continuam visíveis.
- [ ] Conferir que o banco permanece no mesmo caminho e que o backup pode ser localizado.

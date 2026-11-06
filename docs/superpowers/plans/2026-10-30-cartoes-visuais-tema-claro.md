# Cartões Visuais e Tema Claro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar cartões de crédito visuais, aplicar tema claro e reduzir textos em todas as abas sem perder dados existentes.

**Architecture:** Evoluir o modelo de cartão com limite e fechamento opcionais por valores zero, migrar o SQLite de forma idempotente e criar um componente `CreditCardPanel`. Centralizar somente tokens claros no CSS global e manter estilos de telas/componentes separados.

**Tech Stack:** .NET 10, SQLite, React 19, TypeScript, CSS, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-30-cartoes-visuais-tema-claro-design.md`

## Global Constraints

- Preservar todos os dados e cálculos financeiros existentes.
- Cartões antigos usam zero para limite e fechamento não informados.
- Não inventar limite disponível quando o limite não foi cadastrado.
- Tema claro em todas as abas; paleta final permanece ajustável.
- CSS específico deve ficar com a tela ou componente responsável.

## Review Focus

- Migração repetida não pode falhar nem duplicar backup.
- Cartão antigo deve continuar abrindo compras e faturas sem limite informado.
- Valor em aberto deve excluir itens cancelados e considerar pagamentos parciais.
- Limite excedido deve ser visível sem produzir percentual acima de 100% na barra.
- Redução de textos não pode remover avisos que evitam despesa duplicada ou perda de dados.

---

### Task 1: Migrar cartões preservando dados

**Files:**
- Modify: `src/FinBot.Core/FinanceModels.cs`
- Modify: `src/FinBot.Infrastructure/FinanceSchema.cs`
- Modify: `src/FinBot.Infrastructure/LocalDatabase.cs`
- Modify: `src/FinBot.Infrastructure/FinanceReports.cs`
- Modify: `src/FinBot.Infrastructure/FinanceService.cs`
- Test: `tests/FinBot.Tests/CardVisualMigrationTests.cs`

**Interfaces:**
- Produces: `CardView(Id, Name, DueDay, ClosingDay, LimitCents)` e comandos `addCard`/`editCard` com os novos campos.
- Consumes: banco existente na versão 7.

- [ ] Escrever teste de migração que cria cartão, compra e pagamento na versão anterior, atualiza o banco e confirma dados preservados com limite/fechamento zero.
- [ ] Executar o teste e confirmar falha por ausência das novas colunas.
- [ ] Implementar migração idempotente para versão 8 e backup antes da alteração.
- [ ] Validar limite entre zero e R$ 1 bilhão, fechamento entre zero e 31 e vencimento entre 1 e 31.
- [ ] Executar testes focados e toda a suíte .NET.

### Task 2: Cadastrar e editar informações do cartão

**Files:**
- Modify: `src/finbot-ui/src/api.ts`
- Modify: `src/finbot-ui/src/FinanceForm.tsx`
- Modify: `src/finbot-ui/src/main.tsx`
- Test: `src/finbot-ui/e2e/card-panels.spec.ts`

**Interfaces:**
- Consumes: novos campos de `Card` e comandos da Task 1.
- Produces: formulários de cadastro e edição com limite, fechamento e vencimento.

- [ ] Escrever teste E2E de cadastro e edição de cartão.
- [ ] Executar e confirmar falha pela ausência dos campos e da ação de edição.
- [ ] Implementar formulário e comando mínimo.
- [ ] Confirmar que cartão antigo mostra campos não informados sem bloquear compras.

### Task 3: Criar cartões visuais

**Files:**
- Create: `src/finbot-ui/src/CreditCards.tsx`
- Create: `src/finbot-ui/src/CreditCards.css`
- Modify: `src/finbot-ui/src/main.tsx`
- Test: `src/finbot-ui/e2e/card-panels.spec.ts`

**Interfaces:**
- Consumes: cartões, faturas, mês e callbacks de formulário.
- Produces: grade visual com limite, aberto, disponível, barra, fechamento, vencimento, edição e pagamento.

- [ ] Acrescentar expectativas visuais e de cálculo ao teste E2E e confirmar falha.
- [ ] Implementar `CreditCards` com dados reais e estados de limite não informado/excedido.
- [ ] Executar teste focado e build.

### Task 4: Aplicar tema claro modular

**Files:**
- Modify: `src/finbot-ui/src/styles.css`
- Modify: arquivos CSS das telas e componentes existentes.

**Interfaces:**
- Consumes: classes atuais.
- Produces: tokens claros compartilhados e componentes legíveis em todas as abas.

- [ ] Definir variáveis globais para fundo, superfície, texto, borda e estados.
- [ ] Substituir cores escuras fixas nos CSS específicos por variáveis.
- [ ] Verificar foco, contraste, tabelas, formulários, modais e responsividade.
- [ ] Executar build e testes E2E.

### Task 5: Reduzir textos em todas as abas

**Files:**
- Modify: componentes `.tsx` de cada aba e formulários relevantes.
- Test: `src/finbot-ui/e2e/tab-responsibilities.spec.ts`

**Interfaces:**
- Produces: títulos e rótulos curtos; avisos financeiros essenciais preservados.

- [ ] Remover textos redundantes nas telas e encurtar microcópias sem mudar ações.
- [ ] Manter avisos de duplicidade, baixa, cancelamento, histórico e armazenamento local onde necessários.
- [ ] Executar testes focados e suíte E2E completa.

### Task 6: Backup, verificação e publicação

**Files:**
- Modify: nenhum arquivo de dados manualmente.

**Interfaces:**
- Consumes: banco real e `scripts/publish.ps1`.
- Produces: backups verificados e executável atualizado.

- [ ] Encerrar o FinBot e copiar os bancos reais para `backups` com data e hora.
- [ ] Comparar SHA-256 das cópias com as origens.
- [ ] Executar build,  suíte .NET e E2E completa.
- [ ] Publicar e abrir o executável do atalho.
- [ ] Confirmar que os dados existentes aparecem e o hash do banco só muda pela migração esperada.

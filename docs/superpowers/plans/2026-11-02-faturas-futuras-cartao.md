# Faturas Futuras do Cartão Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cadastrar totais mensais oficiais de faturas futuras, refletindo-os no limite comprometido, nas contas a pagar e na previsão anual sem duplicar lançamentos automáticos.

**Architecture:** Uma tabela aditiva guarda o total oficial informado por cartão e vencimento. O relatório mescla faturas automáticas e manuais, dando precedência à manual no mesmo cartão/mês; pagamentos e estornos de faturas manuais usam alocações próprias. A interface cadastra, edita e remove esses totais e continua calculando limite disponível e percentual a partir das faturas pendentes consolidadas.

**Tech Stack:** .NET 10, C#, SQLite, React 19, TypeScript, Playwright, xUnit.

**Spec:** `docs/superpowers/specs/2026-11-02-faturas-futuras-cartao-design.md`

## Global Constraints

- Não alterar o limite já cadastrado no cartão.
- Valor utilizado, disponível e percentual permanecem sempre calculados.
- Fatura manual substitui o total automático do mesmo cartão e mês.
- Migração somente aditiva, com backup antes de abrir o banco real.
- Preservar compras, parcelas, assinaturas, pagamentos e comprovantes existentes.
- Não criar commits enquanto o repositório continuar majoritariamente não rastreado, salvo autorização explícita do usuário.

## Review Focus

- Fatura manual menor que parcelas automáticas do mês ainda deve prevalecer sem gerar valor negativo ou duplicado.
- Edição não pode reduzir o total abaixo do que já foi pago.
- Exclusão deve ser bloqueada após qualquer pagamento da fatura manual.
- Pagamento parcial e estorno devem restaurar exatamente o saldo pendente e a conta usada.
- Meses com fatura automática, manual e contas fora do cartão devem somar cada obrigação uma única vez.

---

### Task 1: Persistência e migração das faturas oficiais

**Files:**
- Modify: `src/FinBot.Core/FinanceModels.cs`
- Modify: `src/FinBot.Infrastructure/FinanceSchema.cs`
- Modify: `src/FinBot.Infrastructure/LocalDatabase.cs`
- Create: `tests/FinBot.Tests/CardInvoiceOverrideMigrationTests.cs`

**Interfaces:**
- Produces: `InvoiceView(..., bool Manual = false)` e tabelas `card_invoice_overrides` e `card_invoice_allocations` na migração 9.

- [ ] **Step 1: Write the failing migration test**

Criar `UpgradeV8PreservesExistingDataAndAddsCardInvoiceOverrides`, que rebaixa uma base para a versão 8, reinicializa duas vezes e confirma contas, cartões, compras, pagamentos e as duas novas tabelas.

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test tests/FinBot.Tests/FinBot.Tests.csproj --filter CardInvoiceOverrideMigrationTests`
Expected: FAIL porque a migração 9 e as tabelas ainda não existem.

- [ ] **Step 3: Implement the additive schema**

Adicionar `card_invoice_overrides(id,card_id,due_date,amount_cents,paid_cents)` com unicidade por cartão/vencimento, `card_invoice_allocations(payment_id,invoice_id,amount_cents)`, migração 9 e limiar de backup `< 9`.

- [ ] **Step 4: Run focused test**

Run: `dotnet test tests/FinBot.Tests/FinBot.Tests.csproj --filter CardInvoiceOverrideMigrationTests`
Expected: PASS.

### Task 2: Consolidação, pagamento e estorno no domínio

**Files:**
- Modify: `src/FinBot.Infrastructure/FinanceReports.cs`
- Modify: `src/FinBot.Infrastructure/FinanceService.cs`
- Create: `tests/FinBot.Tests/CardInvoiceOverrideTests.cs`

**Interfaces:**
- Consumes: tabelas e `InvoiceView.Manual` da Task 1.
- Produces: ações `addCardInvoice`, `editCardInvoice`, `deleteCardInvoice`; `Snapshot()` com fatura manual prevalecendo; `payInvoice` e `reversePayment` compatíveis com fatura manual.

- [ ] **Step 1: Write failing domain tests**

Cobrir: total manual substitui automático; Inter de R$ 6.350,00 com R$ 4.008,89 pendentes deixa R$ 2.341,11; pagamento de novembro mantém dezembro; edição abaixo do pago e exclusão após pagamento falham; estorno restaura saldo.

- [ ] **Step 2: Run tests to verify they fail**

Run: `dotnet test tests/FinBot.Tests/FinBot.Tests.csproj --filter CardInvoiceOverrideTests`
Expected: FAIL por ações desconhecidas e consolidação ausente.

- [ ] **Step 3: Implement commands and consolidated reporting**

Validar cartão, mês, valor e unicidade. Mesclar faturas pelo par cartão/vencimento, preferir a manual e calcular `ExpenseCents`/`ToPayCents` com contas fora do cartão mais faturas consolidadas.

- [ ] **Step 4: Implement payment and reversal allocations**

Quando `payInvoice` apontar para fatura manual, atualizar `paid_cents`, registrar alocação própria, movimentar a conta e permitir estorno atômico. Bloquear edição abaixo do pago e remoção após pagamento.

- [ ] **Step 5: Run domain suite**

Run: `dotnet test tests/FinBot.Tests/FinBot.Tests.csproj`
Expected: todos os testes aprovados.

### Task 3: Cadastro e manutenção pela interface

**Files:**
- Modify: `src/finbot-ui/src/api.ts`
- Modify: `src/finbot-ui/src/FinanceForm.tsx`
- Modify: `src/finbot-ui/src/CreditCards.tsx`
- Modify: `src/finbot-ui/src/main.tsx`
- Modify: `src/finbot-ui/src/CreditCards.css`
- Modify: `src/finbot-ui/e2e/card-panels.spec.ts`

**Interfaces:**
- Consumes: ações e campo `manual` da Task 2.
- Produces: botão `+ Fatura futura`, formulário mês/valor, ações Editar/Excluir para faturas manuais e cartões com limite global calculado.

- [ ] **Step 1: Extend the E2E test and observe failure**

No teste do cartão, cadastrar novembro R$ 1.775,39 e dezembro R$ 2.233,50, confirmar em aberto R$ 4.008,89, disponível R$ 2.341,11 e barra em 63%; pagar novembro e confirmar que dezembro continua comprometendo o limite.

- [ ] **Step 2: Run focused E2E test**

Run: `npm.cmd run build; npx.cmd playwright test e2e/card-panels.spec.ts`
Expected: FAIL porque a ação de fatura futura ainda não existe.

- [ ] **Step 3: Implement form and card actions**

Adicionar formulário de mês/valor sem pedir novamente limite, utilizado, disponível ou percentual. Exibir ação em cada cartão e manter “Fatura do mês” dependente do mês selecionado.

- [ ] **Step 4: Add edit/delete controls to the monthly invoice panel**

Faturas com `manual=true` recebem Editar e Excluir; exclusão usa confirmação e o backend aplica as restrições de pagamento.

- [ ] **Step 5: Run focused frontend checks**

Run: `npm.cmd run build; npx.cmd playwright test e2e/card-panels.spec.ts e2e/cash-projection.spec.ts e2e/tab-responsibilities.spec.ts`
Expected: todos aprovados.

### Task 4: Previsão anual, proteção dos dados e publicação

**Files:**
- Modify: `src/finbot-ui/src/components/MonthlyForecast.tsx`
- Modify: `src/finbot-ui/e2e/cash-projection.spec.ts`
- Modify: `.superpowers/sdd/2026-11-02-faturas-futuras-cartao/progress.md`

**Interfaces:**
- Consumes: `Snapshot.invoices` consolidado.
- Produces: previsão mensal que soma faturas consolidadas e contas não vinculadas a cartão uma única vez.

- [ ] **Step 1: Write failing annual forecast assertions**

Confirmar que a fatura manual aparece no mês futuro, substitui parcelas automáticas e convive com conta fora do cartão sem duplicação.

- [ ] **Step 2: Run test and observe failure**

Run: `npm.cmd run build; npx.cmd playwright test e2e/cash-projection.spec.ts`
Expected: FAIL porque a previsão ainda lê parcelas de cartão diretamente.

- [ ] **Step 3: Consolidate the annual forecast**

Somar `data.invoices` para obrigações de cartão e somente itens não vinculados a cartão para as demais obrigações; manter recebíveis recorrentes pela lista de itens.

- [ ] **Step 4: Run full verification**

Run: `scripts/publish.ps1`
Expected: testes .NET, build, todos os E2E e publicação aprovados.

- [ ] **Step 5: Back up and validate real data**

Fechar o FinBot, copiar os dois bancos locais com hash SHA-256, abrir o executável publicado, confirmar migração 9 e comparar contagens das tabelas preexistentes antes/depois.

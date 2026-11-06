# FinBot desktop local
Escopo aprovado na conversa: um repositório com .NET, React e SQLite; aplicação Windows aberta pelo ícone sem terminal ou hospedagem.
Decisão: WPF hospeda React compilado no WebView2. Comunicação por mensagens locais restritas à origem finbot.local; não há servidor HTTP.
Alternativas: Python empacotado preservaria a linguagem antiga; Electron adicionaria outro runtime. .NET foi escolhido conforme preferência do usuário e foco Windows.
Dados: %LOCALAPPDATA%/FinBot/data/finbot.db, fora do Git; valores monetários em centavos inteiros.
Entrega desta reorganização: estrutura compilável, banco inicial, painel vazio conectado ao banco, publicação autocontida e atalho opcional.
O código Python permanece em src/bot, src/ai, src/sheets e src/alerts como legado sem execução pelo desktop.
Fora desta entrega: CRUD financeiro completo, migração de dados de Sheets, bot, IA, nuvem, instalador formal e lojas.

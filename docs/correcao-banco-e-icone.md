# Correção de cadastro e ícone — 23/10/2026
Causa: o arquivo finbot.db existente possuía esquema Python (accounts, cards e allocations incompatíveis), mas a versão .NET tentava reutilizá-lo. Os testes anteriores cobriam apenas bancos novos e versões .NET anteriores.
Correção: selecionar finbot-desktop.db quando existe banco Python, preservar instalações .NET anteriores compatíveis e recusar inicialização direta sobre esquema Python.
O arquivo Python original não foi apagado ou migrado. Seus registros antigos continuam nele e não são importados automaticamente no banco desktop separado.
Validação: 20 testes aprovados, incluindo cadastro em arquivo separado com preservação byte a byte do banco legado e continuidade de dados .NET antigos.
Ícone: os arquivos .ico e FinBot.png fornecidos continham JPEG. Originais preservados; generate-icon.ps1 converte a imagem para ICO em sete tamanhos, sem redesenhar. Configurados ícone do executável, janela WPF e atalho.
Publicação Windows x64 atualizada; atalho aponta para o ICO distribuído em Assets/FinBot.ico.
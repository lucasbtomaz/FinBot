# Auditoria de publicação v0.0.1
Data: 30/10/2026.

## Separação
O trabalho de distribuição foi feito em cópia separada. Nenhum teste usa o banco pessoal, e nenhum pacote inclui a pasta de dados, comprovantes, cache WebView2 ou referências visuais do autor. Não foram substituídos os arquivos da instalação pessoal.

## Achados e tratamento
- Alta, confiança 10/10: referências visuais locais continham informações financeiras. Foram excluídas integralmente da cópia pública, preservadas na instalação de trabalho.
- Média, confiança 10/10: o caminho fixo de comprovantes dependia de uma unidade específica. Na distribuição passou a usar Documentos/FinBot/Comprovantes, configurável por FINBOT_RECEIPTS_DIRECTORY.
- Baixa, confiança 10/10: um teste reproduzia nome pessoal usado durante desenvolvimento. Substituído por pessoa e valores fictícios.
- Metadados: o histórico principal usa identidade de autoria do mantenedor, incluindo seu e-mail de GitHub. Não é uma credencial. Esse histórico não foi reescrito; a licença mantém a atribuição pública do autor. Os novos commits usam noreply.
- Proteções remotas: somente o proprietário possui acesso de escrita/administração. Consultas de regras retornaram HTTP 403 no repositório privado; a interface do GitHub informou que regras não são aplicadas no plano privado atual.

## Revisão técnica
SQL parametrizado, valores em centavos, transações e pedidos idempotentes. Baixas com arquivo só são confirmadas se a cópia for salva. Testes usam banco temporário e cobrem migrações, preservação, falhas e reversões.
WebView2 restrito à origem local HTTPS, permissões negadas, novas janelas e downloads bloqueados. CSP limita scripts e conexões. Arquivos anexados aceitam apenas PDF/PNG/JPG, com limite de tamanho e nomes gerados pelo sistema.
Abertura de comprovantes usa caminho registrado, extensão permitida e limite à pasta configurada.
A distribuição não inclui PDBs, bancos ou arquivos de referência privados.

## Ferramentas
Gitleaks 8.30.1, obtido da fonte oficial e conferido por SHA-256: sem segredos detectados no histórico examinado.
npm audit e dotnet list package --vulnerable --include-transitive: nenhuma vulnerabilidade conhecida retornada na consulta desta data.
A verificação local de publicação é uma barreira adicional e não substitui Gitleaks nem revisão humana.

## Limitações
Não é garantia de ausência de todas as vulnerabilidades ou segredos desconhecidos. Dados locais não possuem criptografia própria; backups periódicos e proteção da conta Windows continuam necessários. Não foi realizado pentest externo ou teste destrutivo contra a base pessoal. Validar formato de anexos não detecta malware.
A versão não é assinada digitalmente. CI remoto só poderá ser validado após envio ao GitHub.
CODEOWNERS sozinho não impede merge. A proteção precisa estar ativa remotamente; o administrador proprietário mantém controle e pode alterar regras.

## Publicação pendente
Preparar PR da versão, executar CI, revisar arquivos, autorizar a mudança de visibilidade e aplicar .github/branch-protection.json na main. Exigir aprovação do code owner para contribuições de terceiros, invalidar aprovações antigas, resolver conversas e passar o check Validar Windows. Force push e exclusão ficam bloqueados para colaboradores.
enforce_admins=false permite ao único administrador proprietário integrar seus próprios PRs manualmente; não conceder administração a terceiros sem revisar essa política.
Habilitar push protection e alertas de segredos na versão pública e verificar novamente colaboradores. Tags e release somente após aprovação do mantenedor. Não publicar automaticamente de pull requests.

## Resultado da cópia isolada
59 testes .NET e 18 testes Playwright aprovados. Compilação e pacote Windows x64 aprovados. Varreduras Gitleaks do histórico e da árvore pública sem achados. Ícone conferido visualmente: ilustração FinBot, sem fotografia pessoal.
Workflows referenciam commits completos de actions oficiais; Gitleaks usa versão fixa e SHA-256 fixo. O token do CI é somente leitura e não permanece configurado no checkout.
O pacote foi gerado em diretório novo e conferido para ausência de banco, comprovantes, arquivos de credencial e símbolos PDB.

Verificação remota adicional: nenhum deploy key ou webhook cadastrado. GitHub Actions configurado e reconfirmado com token de leitura e sem permissão para aprovar pull requests.

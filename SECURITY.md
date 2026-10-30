# Segurança
Não publique bancos SQLite, comprovantes, capturas com dados reais, chaves, tokens ou logs privados em issues e pull requests.
Para relatar uma vulnerabilidade, use a opção privada Report a vulnerability na aba Security quando habilitada; caso indisponível, solicite um canal privado ao mantenedor sem divulgar detalhes exploráveis.

## Limites
Aplicativo desktop pessoal, sem servidor HTTP, sincronização ou autenticação multiusuário. O banco e os comprovantes dependem das permissões do Windows e não têm criptografia própria. Quem controla a conta do Windows pode acessar esses dados. PDFs e imagens devem vir de fontes confiáveis; validação de formato não substitui antivírus.
Backups são gerados antes de migrações. Ainda é necessário backup externo regular.

## Proteção do projeto
CODEOWNERS solicita revisão do mantenedor, mas só bloqueia merges quando a regra correspondente está ativa no GitHub. A configuração proposta exige PR, revisão do responsável, verificações e conversas resolvidas; impede exclusão e force push na main.
O proprietário continua podendo administrar as regras. Não é possível garantir que ninguém com poderes de administração altere essas proteções.

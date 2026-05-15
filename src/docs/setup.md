# Guia de configuração — FinBot

## 1. Criar o bot no Telegram

1. Abra o Telegram e busque por **@BotFather**
2. Envie `/newbot`
3. Escolha um nome (ex: `Meu FinBot`)
4. Escolha um username (ex: `meu_finbot_bot`)
5. Copie o token gerado → cole em `TELEGRAM_BOT_TOKEN` no `.env`

## 2. Configurar Google Sheets API

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie um novo projeto: `finbot`
3. Ative a API: **Google Sheets API** e **Google Drive API**
4. Vá em **IAM & Admin → Service Accounts → Create**
5. Baixe o JSON de credenciais
6. Salve em `credentials/google-service-account.json`
7. Crie uma planilha no Google Sheets e compartilhe com o e-mail da Service Account

## 3. Obter chave do Gemini AI

1. Acesse [aistudio.google.com](https://aistudio.google.com)
2. Clique em **Get API key**
3. Cole em `GEMINI_API_KEY` no `.env`

## 4. Rodar o projeto

```bash
# Instalar dependências
pip install -r requirements.txt

# Copiar e preencher variáveis de ambiente
cp .env.example .env

# Rodar o bot
python src/bot/main.py
```

## 5. Testar

```bash
pytest tests/
```

Abra o Telegram, encontre seu bot e envie `/start`.

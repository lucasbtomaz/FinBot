"""
FinBot — Entry point do bot Telegram
Fase 1: receber mensagens e responder com confirmação básica
"""

import logging
import os
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters, ContextTypes

load_dotenv()

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO
)
logger = logging.getLogger(__name__)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Mensagem de boas-vindas e instruções iniciais."""
    nome = update.effective_user.first_name
    await update.message.reply_text(
        f"Olá, {nome}! 👋\n\n"
        "Sou o FinBot, seu assistente financeiro pessoal.\n\n"
        "Você pode me mandar mensagens como:\n"
        "• *Gastei 20 reais no VR*\n"
        "• *Compra no crédito Nubank de 170 reais*\n"
        "• *Recebi 500 do freela*\n"
        "• *Guardei 300 na poupança*\n\n"
        "Digite /configurar para cadastrar suas contas e cartões.",
        parse_mode="Markdown"
    )


async def configurar(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Inicia o fluxo de configuração das contas do usuário."""
    await update.message.reply_text(
        "⚙️ *Configuração inicial*\n\n"
        "Me conte sobre seus meios de pagamento. Por exemplo:\n\n"
        "_VR alimentação, limite 1200, recarrega dia 27, sempre guardar 100 de emergência_\n\n"
        "_Cartão Nubank crédito, limite 3000, vencimento dia 1, fechamento dia 25, alertar se fatura passar de 700_\n\n"
        "Pode mandar tudo de uma vez ou um por um 👇",
        parse_mode="Markdown"
    )


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Recebe mensagens de texto do usuário.
    Por enquanto apenas confirma o recebimento.
    Fase 2 vai interpretar a mensagem com IA.
    """
    texto = update.message.text
    logger.info(f"Mensagem recebida de {update.effective_user.id}: {texto}")

    # TODO (Fase 2): enviar para o módulo de IA para interpretar
    await update.message.reply_text(
        f"✅ Recebi sua mensagem!\n\n"
        f"_{texto}_\n\n"
        "Em breve vou interpretar e registrar automaticamente. 🚀",
        parse_mode="Markdown"
    )


def main():
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        raise ValueError("TELEGRAM_BOT_TOKEN não encontrado no .env")

    app = ApplicationBuilder().token(token).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("configurar", configurar))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    logger.info("FinBot iniciado! Aguardando mensagens...")
    app.run_polling()


if __name__ == "__main__":
    main()

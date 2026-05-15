"""
FinBot — Módulo de interpretação de linguagem natural
Fase 2: usa Gemini para extrair dados financeiros das mensagens do usuário
"""

import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

SYSTEM_PROMPT = """
Você é um interpretador financeiro pessoal. Analise a mensagem do usuário e extraia as informações financeiras.

Responda APENAS com um JSON válido no seguinte formato:
{
    "tipo": "gasto | receita | transferencia | configuracao | consulta | desconhecido",
    "valor": 0.00,
    "descricao": "descrição curta",
    "meio_pagamento": "vr | nubank_credito | nubank_debito | itau | inter | dinheiro | outro",
    "parcelamento": null,
    "parcelas": null,
    "destinatario": null,
    "categoria": "alimentacao | transporte | lazer | saude | educacao | moradia | investimento | outro",
    "confianca": 0.0
}

Exemplos:
- "Gastei 20 reais no VR" → tipo: gasto, valor: 20.0, meio_pagamento: vr, categoria: alimentacao
- "Compra no crédito Nubank de 300 em 2x" → tipo: gasto, valor: 300.0, parcelamento: true, parcelas: 2
- "Recebi 500 do freela" → tipo: receita, valor: 500.0
- "Guardei 300 na poupança" → tipo: transferencia, descricao: deposito poupança
"""


def interpretar_mensagem(texto: str) -> dict:
    """
    Interpreta uma mensagem financeira em linguagem natural.
    Retorna um dicionário estruturado com os dados extraídos.
    """
    # TODO (Fase 2): implementar chamada real ao Gemini
    # Por ora retorna estrutura vazia para testes
    return {
        "tipo": "desconhecido",
        "valor": 0.0,
        "descricao": texto,
        "meio_pagamento": "outro",
        "parcelamento": None,
        "parcelas": None,
        "destinatario": None,
        "categoria": "outro",
        "confianca": 0.0,
        "_raw": texto
    }


def interpretar_configuracao(texto: str) -> dict:
    """
    Interpreta uma mensagem de configuração de conta ou cartão.
    Ex: "Nubank crédito, limite 3000, vencimento dia 1, fechar dia 25"
    """
    # TODO (Fase 2): implementar extração de dados de configuração
    return {
        "tipo_conta": "desconhecido",
        "nome": None,
        "limite": None,
        "vencimento": None,
        "fechamento": None,
        "alerta_valor": None,
        "reserva_emergencia": None,
        "_raw": texto
    }

"""
FinBot — Módulo de integração com Google Sheets
Fase 3: criar e atualizar planilha financeira automaticamente
"""

import os
from datetime import datetime
from google.oauth2 import service_account
from googleapiclient.discovery import build
from dotenv import load_dotenv

load_dotenv()

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

# Abas da planilha
ABA_LANCAMENTOS  = "Lançamentos"
ABA_CARTOES      = "Cartões"
ABA_CONTAS       = "Contas"
ABA_RESUMO       = "Resumo"
ABA_INVESTIMENTOS = "Investimentos"


def get_service():
    """Autentica e retorna o serviço do Google Sheets."""
    creds_path = os.getenv("GOOGLE_CREDENTIALS_PATH")
    creds = service_account.Credentials.from_service_account_file(
        creds_path, scopes=SCOPES
    )
    return build("sheets", "v4", credentials=creds)


def criar_planilha_usuario(nome_usuario: str) -> str:
    """
    Cria uma nova planilha com toda a estrutura financeira para o usuário.
    Retorna o ID da planilha criada.
    """
    # TODO (Fase 3): implementar criação de planilha com layout completo
    # Abas: Lançamentos, Cartões, Contas, Resumo, Investimentos
    pass


def registrar_lancamento(sheet_id: str, dados: dict) -> bool:
    """
    Registra um novo lançamento financeiro na planilha.

    dados esperado (saída do interpreter.py):
    {
        "tipo": "gasto",
        "valor": 20.0,
        "descricao": "VR",
        "meio_pagamento": "vr",
        "categoria": "alimentacao",
        ...
    }
    """
    # TODO (Fase 3): implementar gravação na aba Lançamentos
    pass


def atualizar_fatura_cartao(sheet_id: str, cartao: str, valor: float) -> dict:
    """
    Adiciona valor à fatura atual de um cartão.
    Retorna o novo total e percentual do limite.
    """
    # TODO (Fase 3): implementar atualização de fatura
    pass


def get_saldo_conta(sheet_id: str, conta: str) -> float:
    """Retorna o saldo atual de uma conta."""
    # TODO (Fase 3): ler saldo da planilha
    pass


def get_resumo_financeiro(sheet_id: str) -> dict:
    """
    Retorna um resumo financeiro completo:
    saldos, faturas, alertas pendentes, investimentos.
    """
    # TODO (Fase 3): implementar leitura de resumo
    pass

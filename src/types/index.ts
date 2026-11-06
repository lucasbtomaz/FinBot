export type TransactionType = 'gasto' | 'receita' | 'transferencia' | 'configuracao' | 'consulta' | 'desconhecido';

export type PaymentMethod = 
  | 'vr' 
  | 'nubank_credito' 
  | 'nubank_debito' 
  | 'itau' 
  | 'inter' 
  | 'dinheiro' 
  | 'poupanca' 
  | 'outro';

export type Category = 
  | 'alimentacao' 
  | 'transporte' 
  | 'lazer' 
  | 'saude' 
  | 'educacao' 
  | 'moradia' 
  | 'investimento' 
  | 'freela' 
  | 'outro';

export interface InterpretedMessage {
  tipo: TransactionType;
  valor: number;
  descricao: string;
  meio_pagamento: PaymentMethod;
  parcelamento?: boolean | null;
  parcelas?: number | null;
  destinatario?: string | null;
  categoria: Category;
  confianca: number;
  _raw: string;
}

export interface InterpretedConfig {
  tipo_conta: string;
  nome: string | null;
  limite: number | null;
  vencimento: number | null;
  fechamento: number | null;
  alerta_valor: number | null;
  reserva_emergencia: number | null;
  _raw: string;
}

export interface Lancamento {
  id: string;
  data: string;
  hora: string;
  descricao: string;
  categoria: Category;
  meio_pagamento: PaymentMethod;
  tipo: 'gasto' | 'receita' | 'transferencia';
  valor: number;
  parcelas?: string | null;
}

export interface CartaoCredito {
  id: string;
  nome: string;
  meio: PaymentMethod;
  limiteTotal: number;
  alertaTeto: number;
  faturaAtual: number;
  diaFechamento: number;
  diaVencimento: number;
}

export interface ContaBancaria {
  id: string;
  nome: string;
  meio: PaymentMethod;
  tipo: 'corrente' | 'beneficio' | 'poupanca';
  saldo: number;
  diaRecarga?: number;
  limiteMensal?: number;
  reservaEmergencia?: number;
}

export interface Investimento {
  id: string;
  nome: string;
  tipo: 'CDB' | 'Tesouro' | 'Ações' | 'FII' | 'Poupança';
  valor: number;
  rendimentoMensalEst: number;
  dataAporte: string;
}

export interface SheetsData {
  lancamentos: Lancamento[];
  cartoes: CartaoCredito[];
  contas: ContaBancaria[];
  investimentos: Investimento[];
}

export interface AlertNotification {
  id: string;
  tipo: 'info' | 'warning' | 'danger' | 'success';
  titulo: string;
  mensagem: string;
  timestamp: string;
  meioRelacionado?: PaymentMethod;
}

export interface BotMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  parsedData?: InterpretedMessage;
  feedback?: {
    success: boolean;
    summary?: string;
  };
}

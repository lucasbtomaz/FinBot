import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  getSheetsData, 
  setSheetsData, 
  resetSheetsData, 
  registrarLancamento,
  getResumoFinanceiro 
} from './src/sheets/manager.js';
import { processUserMessage } from './src/bot/botService.js';
import { checkAlerts } from './src/alerts/checker.js';
import { interpretarMensagem, SYSTEM_PROMPT } from './src/ai/interpreter.js';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors());
  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'FinBot API',
      timestamp: new Date().toISOString()
    });
  });

  // Get current spreadsheet data
  app.get('/api/sheets', (_req: Request, res: Response) => {
    res.json(getSheetsData());
  });

  // Reset sheets data
  app.post('/api/sheets/reset', (_req: Request, res: Response) => {
    const reset = resetSheetsData();
    res.json({ success: true, data: reset });
  });

  // Manual transaction registration
  app.post('/api/sheets/transaction', (req: Request, res: Response) => {
    const body = req.body;
    const result = registrarLancamento(body);
    res.json({
      result,
      sheets: getSheetsData(),
      alerts: checkAlerts(getSheetsData())
    });
  });

  // Financial summary
  app.get('/api/sheets/summary', (_req: Request, res: Response) => {
    res.json(getResumoFinanceiro());
  });

  // Active alerts
  app.get('/api/alerts', (_req: Request, res: Response) => {
    const alerts = checkAlerts(getSheetsData());
    res.json(alerts);
  });

  // Telegram bot message simulation endpoint
  app.post('/api/bot/message', async (req: Request, res: Response) => {
    const { text, clientState } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Texto da mensagem é obrigatório' });
    }

    if (clientState) {
      setSheetsData(clientState);
    }

    const currentData = getSheetsData();
    const result = await processUserMessage(text, currentData);
    const updatedAlerts = checkAlerts(currentData);

    res.json({
      reply: result.reply,
      parsed: result.parsed,
      success: result.success,
      alertTip: result.alertTip,
      sheets: currentData,
      alerts: updatedAlerts
    });
  });

  // AI Interpretation using Gemini if API key is provided, or fallback
  app.post('/api/ai/interpret', async (req: Request, res: Response) => {
    const { text } = req.body;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey) {
      try {
        const ai = new GoogleGenAI({ 
          apiKey: geminiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            }
          }
        });
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `${SYSTEM_PROMPT}\n\nMensagem do usuário: "${text}"`
        });

        const raw = response.text || '';
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return res.json({
            provider: 'gemini',
            data: { ...parsed, _raw: text }
          });
        }
      } catch (err) {
        console.warn('Gemini API call failed, falling back to local NLP engine:', err);
      }
    }

    // Default fast local NLP interpreter
    const localParsed = interpretarMensagem(text);
    return res.json({
      provider: 'local-nlp',
      data: localParsed
    });
  });

  // Gemini AI Personalized Financial Tip of the Day
  app.post('/api/ai/financial-tip', async (req: Request, res: Response) => {
    const { 
      month = '2026-11', 
      availableCents = 0, 
      toPayCents = 0, 
      expenseCents = 0, 
      toReceiveCents = 0, 
      items = [] 
    } = req.body;

    const geminiKey = process.env.GEMINI_API_KEY;

    const availableFormatted = ((availableCents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const toPayFormatted = ((toPayCents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const expenseFormatted = ((expenseCents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const toReceiveFormatted = ((toReceiveCents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    interface InputItem {
      name: string;
      remainingCents: number;
      amountCents: number;
      dueDate?: string;
      category?: string;
      cancelled?: boolean;
    }

    const pendingItems = (items as InputItem[])
      .filter(i => !i.cancelled && (i.remainingCents ?? i.amountCents ?? 0) > 0)
      .sort((a, b) => (b.remainingCents || b.amountCents || 0) - (a.remainingCents || a.amountCents || 0))
      .slice(0, 12)
      .map(i => {
        const val = ((i.remainingCents || i.amountCents || 0) / 100).toFixed(2);
        const day = i.dueDate ? `vencimento dia ${i.dueDate.split('-')[2]}` : 'sem data';
        return `- ${i.name}: R$ ${val} (${day}, categoria: ${i.category || 'Geral'})`;
      })
      .join('\n');

    const prompt = `Você é o FinBot, um consultor financeiro de elite, prático, encorajador e focado em resultados reais para famílias e indivíduos brasileiros.
Analise com precisão a situação orçamentária do usuário para o mês de referência ${month}:

DADOS DO MÊS:
- Saldo disponível líquido em contas: ${availableFormatted}
- Total de despesas calculadas para o mês: ${expenseFormatted}
- Total que ainda falta pagar: ${toPayFormatted}
- Entradas/recebíveis previstos: ${toReceiveFormatted}

PRINCIPAIS CONTAS E DESPESAS LISTADAS:
${pendingItems || 'Sem despesas pendentes identificadas'}

MISSÃO:
Crie uma "Dica do Dia" personalizada, direta e de alto impacto que faça o usuário entender onde o dinheiro está indo e qual a melhor decisão hoje.
Se houver déficit (contas a pagar > saldo disponível), alerte com tato e ofereça plano de priorização.
Se houver empréstimos caros (como Pan, Super Sim, cartões de crédito), comente sobre o peso deles no orçamento.
Se a situação for equilibrada, recomende amortização inteligente ou reserva de emergência.

RESPONDA ESTRITAMENTE COM UM OBJETO JSON VÁLIDO (sem markdown ou formatação externa):
{
  "title": "Título chamativo e direto da dica (máx 60 caracteres)",
  "category": "Dívidas | Fluxo de Caixa | Economia | Planejamento | Cartões",
  "urgency": "alta" | "media" | "baixa",
  "summary": "1 a 2 parágrafos objetivos explicando o diagnóstico com base nos valores e despesas reais dele.",
  "highlight": "Uma frase marcante com o principal conselho do dia.",
  "actions": [
    "Ação prática e imediata 1",
    "Ação prática e imediata 2",
    "Ação prática e imediata 3"
  ]
}`;

    if (geminiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey: geminiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            }
          }
        });

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.65
          }
        });

        const raw = response.text || '';
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return res.json({
            provider: 'gemini-3.8-flash',
            tip: parsed,
            generatedAt: new Date().toISOString()
          });
        }
      } catch (err) {
        console.warn('Gemini financial tip generation error:', err);
      }
    }

    // Smart localized fallback if Gemini key is not configured or in offline mode
    const deficitCents = (toPayCents || 0) - (availableCents || 0);
    const hasDeficit = deficitCents > 0;
    const largestItem = (items as InputItem[]).filter(i => !i.cancelled && (i.remainingCents || 0) > 0)
      .sort((a, b) => (b.remainingCents || 0) - (a.remainingCents || 0))[0];

    const fallbackTip = {
      title: hasDeficit 
        ? 'Atenção ao Fluxo de Caixa: Contas Superam o Saldo' 
        : 'Equilíbrio Orçamentário: Mantenha o Foco nas Metas',
      category: hasDeficit ? 'Fluxo de Caixa' : 'Planejamento',
      urgency: hasDeficit ? 'alta' : 'baixa',
      summary: hasDeficit 
        ? `Neste mês você possui ${toPayFormatted} pendente para pagamento, enquanto o saldo em conta é de ${availableFormatted}. O déficit projetado é de ${((deficitCents) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. ${largestItem ? `A sua maior obrigação atual é "${largestItem.name}" no valor de ${((largestItem.remainingCents) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.` : ''}`
        : `Seu saldo em conta de ${availableFormatted} cobre com segurança os pagamentos pendentes de ${toPayFormatted}. Este é o momento ideal para direcionar excedentes para reserva de emergência ou amortização antecipada de dívidas com juros.`,
      highlight: hasDeficit 
        ? 'Dê prioridade máxima às contas de serviços essenciais e empréstimos bancários para evitar multas.'
        : 'Registre cada pagamento assim que realizado para manter a visão limpa das finanças.',
      actions: hasDeficit ? [
        'Priorize quitar parcelas de empréstimos com juros altos antes dos acordos negociados.',
        'Evite novas compras parceladas no cartão de crédito até reequilibrar o caixa.',
        'Use o botão "Dar baixa" na planilha assim que pagar cada boleto para ver o saldo recalculado.'
      ] : [
        'Programe o pagamento das faturas antes da data de vencimento.',
        'Considere simular amortização de parcelas futuras para conseguir desconto nos juros.',
        'Mantenha o hábito diário de conferir o FinBot após fazer compras.'
      ]
    };

    return res.json({
      provider: 'smart-fallback',
      tip: fallbackTip,
      generatedAt: new Date().toISOString()
    });
  });

  // Vite middleware in development or static serve in production
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[FinBot] Server listening at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[FinBot] Failed to start server:', err);
  process.exit(1);
});

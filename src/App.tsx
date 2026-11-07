import React, { useState } from 'react';
import FinBotApp from './finbot-ui/src/main';
import { request, money, today } from './finbot-ui/src/api';
import { interpretarMensagem } from './ai/interpreter';
import { analyzeCardsBestDay } from './finbot-ui/src/BestCardWidget';
import { Bot, X, Send, Sparkles, CheckCircle2, MessageSquareText } from 'lucide-react';

export default function App() {
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    {
      sender: 'bot',
      text: 'Olá! Sou o assistente de linguagem natural do FinBot. Digite gastos ou receitas como "Gastei 45 no almoço" ou "Recebi 500 do freela" para lançar direto no seu painel.',
      time: '10:00'
    }
  ]);
  const [busy, setBusy] = useState(false);

  const handleSendChat = async (promptText?: string) => {
    const text = (promptText || chatInput).trim();
    if (!text || busy) return;

    setChatInput('');
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [...prev, { sender: 'user', text, time: nowTime }]);
    setBusy(true);

    try {
      const parsed = interpretarMensagem(text);
      const currentMonth = today().slice(0, 7);

      if (parsed.tipo === 'gasto' && parsed.valor > 0) {
        const cents = Math.round(parsed.valor * 100);
        await request(currentMonth, {
          action: 'addItem',
          name: parsed.descricao || 'Despesa',
          category: parsed.categoria || 'alimentacao',
          amountCents: cents,
          date: today(),
          kind: 'pagar',
          paymentMethod: parsed.meio_pagamento === 'dinheiro' ? 'dinheiro' : 'pix',
          note: `Lançado via Chat: ${text}`
        });

        // Trigger reload in FinBotApp
        window.dispatchEvent(new Event('storage'));

        setChatMessages(prev => [
          ...prev,
          {
            sender: 'bot',
            text: `✅ Despesa lançada com sucesso!\n• Valor: ${money(cents)}\n• Categoria: ${parsed.categoria}\n• Descrição: ${parsed.descricao}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else if (parsed.tipo === 'receita' && parsed.valor > 0) {
        const cents = Math.round(parsed.valor * 100);
        await request(currentMonth, {
          action: 'addReceivable',
          name: parsed.descricao || 'Receita',
          category: parsed.categoria || 'freela',
          payer: 'Cliente / Fonte',
          amountCents: cents,
          confidence: 'confirmado',
          cadence: 'unico',
          date: today(),
          count: 1,
          note: `Lançado via Chat: ${text}`
        });

        window.dispatchEvent(new Event('storage'));

        setChatMessages(prev => [
          ...prev,
          {
            sender: 'bot',
            text: `✅ Receita lançada com sucesso!\n• Valor: ${money(cents)}\n• Categoria: ${parsed.categoria}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else if (text.toLowerCase().includes('posso comprar') || text.toLowerCase().includes('posso gastar') || (text.toLowerCase().includes('comprar') && /\d+/.test(text))) {
        // Pierre-style Purchase Simulator
        const snap = await request(currentMonth);
        const numbers = text.match(/\d+([.,]\d+)?/g);
        const amountFound = numbers ? parseFloat(numbers[0].replace(',', '.')) : 0;
        const purchaseCents = Math.round(amountFound * 100);

        const installmentMatch = text.match(/(\d+)\s*x/i);
        const numInstallments = installmentMatch ? parseInt(installmentMatch[1], 10) : 1;
        const installmentCents = purchaseCents > 0 ? Math.round(purchaseCents / numInstallments) : 0;

        const available = snap.availableCents;
        const toPay = snap.toPayCents;
        const currentMargin = available - toPay;
        const projectedMargin = numInstallments > 1 ? currentMargin - installmentCents : currentMargin - purchaseCents;

        const bestCards = analyzeCardsBestDay(snap.cards);
        const bestCard = bestCards.find(c => c.isBestToday) || bestCards[0];

        let verdict = '';
        if (projectedMargin >= 30000) {
          verdict = `🟢 **Compra Segura & Viável!**\nSeu caixa suporta este gasto com folga. Após pagar as contas pendentes (${money(toPay)}) e esta compra de ${money(purchaseCents)}, ainda sobrarão **${money(projectedMargin)}** livres.`;
        } else if (projectedMargin >= 0) {
          verdict = `🟡 **Atenção:** Você consegue pagar, mas sua margem de segurança ficará estreita (**${money(projectedMargin)}** restantes até o fim do mês).`;
        } else {
          verdict = `🔴 **Não Recomendado Agora:** Suas contas do mês já somam ${money(toPay)} para um saldo em conta de ${money(available)}. Esta compra aumentará seu déficit para **${money(Math.abs(projectedMargin))}**.`;
        }

        const cardTip = bestCard 
          ? `\n\n💳 **Melhor Opção no Cartão:** Dê preferência ao **${bestCard.card.name}** (vence dia ${bestCard.dueDay}) para ganhar até **${bestCard.daysGracePeriod} dias** de prazo!`
          : '';

        setChatMessages(prev => [
          ...prev,
          {
            sender: 'bot',
            text: `🛍️ **Diagnóstico "Posso Comprar?" (Pierre IA):**\n\n${verdict}${cardTip}\n\n💡 Você também pode abrir o simulador completo clicando no botão **"Simular: Posso Comprar?"** no topo!`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else if (text.toLowerCase().includes('melhor cartao') || text.toLowerCase().includes('melhor cartão') || text.toLowerCase().includes('qual cartao') || text.toLowerCase().includes('qual cartão') || text.toLowerCase().includes('usar hoje')) {
        const snap = await request(currentMonth);
        const analyses = analyzeCardsBestDay(snap.cards);
        const best = analyses.find(a => a.isBestToday) || analyses[0];

        const cardsSummary = analyses.map(a => 
          `• **${a.card.name}**: ${a.daysGracePeriod} dias de prazo (vence dia ${a.dueDay}, fecha dia ${a.closingDay})`
        ).join('\n');

        setChatMessages(prev => [
          ...prev,
          {
            sender: 'bot',
            text: `💳 **Melhor Cartão para Comprar Hoje (Mobills):**\n\n⭐ Cartão Recomendado: **${best?.card.name}**\nComprando hoje, você ganha até **${best?.daysGracePeriod} dias** para pagar (fatura vence só em ${best?.nextDueDateStr})!\n\n**Situação de todos os cartões:**\n${cardsSummary}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else if (text.toLowerCase().includes('teto') || text.toLowerCase().includes('limite') || text.toLowerCase().includes('orcamento') || text.toLowerCase().includes('orçamento')) {
        const snap = await request(currentMonth);
        setChatMessages(prev => [
          ...prev,
          {
            sender: 'bot',
            text: `🎯 **Tetos de Gastos por Categoria (Organizze):**\nVocê possui controle visual por termômetros na aba **Visão Geral**.\n• Total de despesas registradas: ${money(snap.expenseCents)}\n• Status: Acompanhamento ativo com alertas ao atingir 80% e 100% do teto configurado.\n\n💡 Clique em **"Ajustar Tetos"** na Visão Geral para personalizar seus limites!`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else if (text.toLowerCase().includes('venc') || text.toLowerCase().includes('alerta') || text.toLowerCase().includes('conta') || text.toLowerCase().includes('pagar')) {
        const snap = await request(currentMonth);
        const pending = snap.items
          .filter(x => !x.cancelled && x.kind === 'pagar' && x.remainingCents > 0)
          .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

        if (pending.length === 0) {
          setChatMessages(prev => [
            ...prev,
            {
              sender: 'bot',
              text: `🎉 Nenhuma conta pendente para pagar no momento!`,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        } else {
          const listText = pending.slice(0, 5).map(x => {
            const diffTime = new Date(x.dueDate + 'T00:00:00').getTime() - new Date(today() + 'T00:00:00').getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const status = diffDays < 0 ? `🚨 Vencida há ${Math.abs(diffDays)}d` : diffDays === 0 ? '⚠️ Vence HOJE' : diffDays === 1 ? '🔔 Vence amanhã' : `📅 Vence em ${diffDays}d (${x.dueDate.slice(8,10)}/${x.dueDate.slice(5,7)})`;
            return `• ${x.name}: ${money(x.remainingCents)} (${status})`;
          }).join('\n');

          setChatMessages(prev => [
            ...prev,
            {
              sender: 'bot',
              text: `🔔 Próximas contas no radar do FinBot:\n\n${listText}\n\n💡 Você pode dar baixa clicando em "Pagar" na planilha ou na Central de Alertas no topo!`,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        }
      } else {
        setChatMessages(prev => [
          ...prev,
          {
            sender: 'bot',
            text: `💡 Entendido! Você pode digitar lançamentos ou perguntas como:\n• "Posso gastar R$ 350?"\n• "Qual o melhor cartão para hoje?"\n• "Quais contas vencem em breve?"\n• "Gastei 45 no almoço"`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: `❌ Não foi possível registrar: ${err?.message || 'Erro desconhecido'}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#090d16] text-[#f1f5f9]">
      {/* Official FinBot Application with Modernized UI */}
      <FinBotApp />

      {/* Floating Action Button for FinBot Natural Language Assistant */}
      <div className="fixed bottom-6 right-8 z-50">
        {!showChat ? (
          <button
            onClick={() => setShowChat(true)}
            aria-label="Abrir Assistente FinBot"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#121927] hover:bg-[#1a2337] text-white font-medium text-xs rounded-full shadow-2xl border border-white/10 hover:border-sky-500/40 transition-all cursor-pointer group"
          >
            <div className="w-5 h-5 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
              <Sparkles className="w-3 h-3" />
            </div>
            <span>Lançamento Inteligente</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          </button>
        ) : (
          <div className="w-[360px] sm:w-[400px] h-[500px] bg-[var(--bg-surface-elevated)] backdrop-blur-xl border border-[var(--border-strong)] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Chat Header */}
            <div className="px-4 py-3 bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500 dark:text-sky-400">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-[var(--text-heading)] flex items-center gap-1.5 m-0">
                    Lançamento em Linguagem Natural
                    <CheckCircle2 className="w-3 h-3 text-sky-500 dark:text-sky-400" />
                  </h3>
                  <p className="text-[10.5px] text-[var(--text-secondary)] m-0">Interpretado e sincronizado com o FinBot</p>
                </div>
              </div>
              <button
                onClick={() => setShowChat(false)}
                className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-heading)] rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--bg-card-inner)] text-xs">
              {chatMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-xl whitespace-pre-wrap leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-xs shadow-sm'
                        : 'bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-tl-xs'
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className="text-[9.5px] text-[var(--text-muted)] mt-1 px-1">{m.time}</span>
                </div>
              ))}
              {busy && (
                <div className="text-[11px] text-[var(--text-secondary)] italic flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
                  Interpretando lançamento...
                </div>
              )}
            </div>

            {/* Quick prompt suggestions */}
            <div className="px-3 py-2 bg-[var(--bg-subtle)] border-t border-[var(--border-subtle)] flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => handleSendChat('Posso comprar algo de R$ 350?')}
                className="text-[11px] px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 rounded-lg whitespace-nowrap border border-purple-500/20 cursor-pointer"
              >
                🛍️ "Posso gastar R$ 350?"
              </button>
              <button
                onClick={() => handleSendChat('Qual o melhor cartão para comprar hoje?')}
                className="text-[11px] px-2.5 py-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-300 rounded-lg whitespace-nowrap border border-sky-500/20 cursor-pointer"
              >
                💳 "Qual melhor cartão hoje?"
              </button>
              <button
                onClick={() => handleSendChat('Como estão meus tetos de gastos?')}
                className="text-[11px] px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 rounded-lg whitespace-nowrap border border-emerald-500/20 cursor-pointer"
              >
                🎯 "Ver tetos de gastos"
              </button>
              <button
                onClick={() => handleSendChat('Quais contas vencem em breve?')}
                className="text-[11px] px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-300 rounded-lg whitespace-nowrap border border-amber-500/20 cursor-pointer"
              >
                🔔 "Contas a vencer"
              </button>
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat();
              }}
              className="p-3 bg-[var(--bg-surface-elevated)] border-t border-[var(--border-subtle)] flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ex: 'Gastei 30 no mercado'..."
                className="flex-1 bg-[var(--bg-input)] border border-[var(--border-input)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || busy}
                className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl disabled:opacity-40 transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

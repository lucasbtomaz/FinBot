import { useState, useEffect, useCallback } from 'react';
import { Sparkles, RefreshCw, AlertTriangle, CheckCircle, Lightbulb, Zap, TrendingDown, ArrowUpRight } from 'lucide-react';
import type { Snapshot } from './api';

export interface FinancialTip {
  title: string;
  category: string;
  urgency: 'alta' | 'media' | 'baixa';
  summary: string;
  highlight: string;
  actions: string[];
}

interface FinancialTipCardProps {
  data: Snapshot;
  month: string;
}

export function FinancialTipCard({ data, month }: FinancialTipCardProps) {
  const [tip, setTip] = useState<FinancialTip | null>(null);
  const [provider, setProvider] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const cacheKey = `finbot_financial_tip_${month}`;

  const fetchTip = useCallback(async (forceRefresh = false) => {
    // Check cached tip if not forcing refresh
    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.tip && parsed.month === month) {
            setTip(parsed.tip);
            setProvider(parsed.provider || 'gemini-3.8-flash');
            setGeneratedAt(parsed.generatedAt || null);
            return;
          }
        }
      } catch {
        // Ignore cache parse error
      }
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        month,
        availableCents: data.availableCents,
        toPayCents: data.toPayCents,
        expenseCents: data.expenseCents,
        toReceiveCents: data.toReceiveCents,
        items: (data.items || []).map(i => ({
          name: i.name,
          remainingCents: i.remainingCents,
          amountCents: i.amountCents,
          dueDate: i.dueDate,
          category: i.category,
          cancelled: i.cancelled
        }))
      };

      const res = await fetch('/api/ai/financial-tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Falha na resposta do servidor (${res.status})`);
      }

      const resData = await res.json();
      if (resData.tip) {
        setTip(resData.tip);
        setProvider(resData.provider || 'gemini-3.8-flash');
        const timestamp = resData.generatedAt || new Date().toISOString();
        setGeneratedAt(timestamp);

        // Save to cache
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            tip: resData.tip,
            provider: resData.provider,
            month,
            generatedAt: timestamp
          }));
        } catch {
          // ignore cache write error
        }
      } else {
        throw new Error('Nenhuma recomendação retornada.');
      }
    } catch (err) {
      console.error('Error fetching financial tip:', err);
      setError('Não foi possível obter a dica no momento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [cacheKey, data.availableCents, data.expenseCents, data.items, data.toPayCents, data.toReceiveCents, month]);

  useEffect(() => {
    fetchTip();
  }, [fetchTip]);

  const urgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'alta':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: '#f87171',
            border: '1px solid rgba(239, 68, 68, 0.25)'
          }}>
            <AlertTriangle size={12} />
            Urgência Alta
          </span>
        );
      case 'media':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            color: '#fbbf24',
            border: '1px solid rgba(245, 158, 11, 0.25)'
          }}>
            <Zap size={12} />
            Atenção Recomendada
          </span>
        );
      default:
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            color: '#34d399',
            border: '1px solid rgba(16, 185, 129, 0.25)'
          }}>
            <CheckCircle size={12} />
            Situação Regular
          </span>
        );
    }
  };

  return (
    <section 
      className="panel" 
      style={{
        background: 'linear-gradient(145deg, var(--bg-surface) 0%, var(--bg-card-inner) 100%)',
        border: '1px solid var(--border-strong)',
        borderRadius: '14px',
        padding: '20px 22px',
        marginBottom: '20px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)'
      }}
      aria-label="Dica do Dia FinBot com Gemini"
    >
      {/* Decorative subtle ambient glow */}
      <div 
        style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '180px',
          height: '180px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
          borderRadius: '50%'
        }} 
      />

      {/* Header bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '14px',
        paddingBottom: '12px',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            color: '#fff',
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)'
          }}>
            <Sparkles size={17} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ 
                margin: 0, 
                fontSize: '15px', 
                fontWeight: 700, 
                letterSpacing: '-0.3px',
                color: 'var(--text-heading)' 
              }}>
                Dica do Dia
              </h2>
              <span style={{
                fontSize: '10.5px',
                fontWeight: 700,
                letterSpacing: '0.4px',
                textTransform: 'uppercase',
                padding: '2px 7px',
                borderRadius: '6px',
                background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))',
                color: '#818cf8',
                border: '1px solid rgba(99, 102, 241, 0.3)'
              }}>
                {provider.includes('gemini') ? 'Gemini 3.8 Flash' : 'FinBot AI'}
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--text-muted)' }}>
              Recomendação personalizada gerada com base nos seus gastos reais de {month}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {tip?.urgency && urgencyBadge(tip.urgency)}
          {tip?.category && (
            <span style={{
              fontSize: '11px',
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-surface-hover)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
              fontWeight: 500
            }}>
              {tip.category}
            </span>
          )}
          <button
            onClick={() => fetchTip(true)}
            disabled={loading}
            title="Gerar uma nova análise atualizada com IA"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              padding: '5px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--btn-secondary-bg)',
              color: 'var(--btn-secondary-color)',
              fontWeight: 500,
              cursor: loading ? 'wait' : 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            <span>{loading ? 'Analisando…' : 'Atualizar'}</span>
          </button>
        </div>
      </div>

      {/* Loading state skeleton */}
      {loading && !tip && (
        <div style={{ padding: '16px 0' }}>
          <div style={{
            height: '18px',
            width: '60%',
            backgroundColor: 'var(--bg-surface-hover)',
            borderRadius: '4px',
            marginBottom: '10px',
            animation: 'pulse 1.5s infinite ease-in-out'
          }} />
          <div style={{
            height: '14px',
            width: '90%',
            backgroundColor: 'var(--bg-surface-hover)',
            borderRadius: '4px',
            marginBottom: '8px',
            animation: 'pulse 1.5s infinite ease-in-out'
          }} />
          <div style={{
            height: '14px',
            width: '80%',
            backgroundColor: 'var(--bg-surface-hover)',
            borderRadius: '4px',
            animation: 'pulse 1.5s infinite ease-in-out'
          }} />
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div style={{
          padding: '12px 14px',
          borderRadius: '8px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: '#f87171',
          fontSize: '12.5px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>{error}</span>
          <button 
            onClick={() => fetchTip(true)}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              backgroundColor: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '4px'
            }}
          >
            Tentar de novo
          </button>
        </div>
      )}

      {/* Content display */}
      {tip && (
        <div>
          <h3 style={{
            margin: '0 0 10px 0',
            fontSize: '15px',
            fontWeight: 700,
            color: 'var(--text-heading)',
            lineHeight: 1.4
          }}>
            {tip.title}
          </h3>

          {/* Highlight callout box */}
          {tip.highlight && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '11px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(99, 102, 241, 0.08)',
              borderLeft: '3px solid #6366f1',
              marginBottom: '14px'
            }}>
              <Lightbulb size={16} style={{ color: '#818cf8', flexShrink: 0, marginTop: '2px' }} />
              <p style={{
                margin: 0,
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                lineHeight: 1.45
              }}>
                {tip.highlight}
              </p>
            </div>
          )}

          {/* Summary */}
          <p style={{
            margin: '0 0 14px 0',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            lineHeight: 1.6
          }}>
            {tip.summary}
          </p>

          {/* Actionable points */}
          {tip.actions && tip.actions.length > 0 && (
            <div style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '12px 14px'
            }}>
              <p style={{
                margin: '0 0 8px 0',
                fontSize: '11.5px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
                color: 'var(--text-muted)'
              }}>
                Ações Recomendadas para Hoje:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tip.actions.map((act, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(99, 102, 241, 0.15)',
                      color: '#818cf8',
                      fontSize: '10.5px',
                      fontWeight: 700,
                      flexShrink: 0,
                      marginTop: '1px'
                    }}>
                      {idx + 1}
                    </div>
                    <span style={{ fontSize: '12.5px', color: 'var(--text-primary)', lineHeight: 1.45 }}>
                      {act}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {generatedAt && (
            <div style={{
              marginTop: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: 'var(--text-muted)'
            }}>
              <span>
                Última análise: {new Date(generatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ({new Date(generatedAt).toLocaleDateString('pt-BR')})
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                FinBot Intelligence <ArrowUpRight size={11} />
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

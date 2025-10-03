'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Brain,
  CreditCard,
  TrendingUp,
  DollarSign,
  MessageSquare,
  Send,
  Play,
  Mic,
  MicOff,
  BarChart3,
  AlertCircle
} from 'lucide-react';

import { Navigation } from '../../components/Navigation';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { ManualStatementUploadCard } from '../../components/authenticated/manual-statement-upload-card';
import { useConversationEngine } from '../../hooks/useConversationEngine';
import { useVoiceGateway } from '../../hooks/useVoiceGateway';
import { useFinancialSummary } from '../../hooks/useFinancialSummary';
import type { FinancialSummary } from '../../hooks/useConversationEngine';
import type { NormalizedStatement } from '../../lib/statements/parser';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0
  }).format(amount);

const suggestedQuestions = [
  '¿Cuánto gasté en alimentación este mes?',
  '¿Puedo ahorrar $200,000 en 3 meses?',
  '¿Cuáles son mis gastos más altos?',
  '¿Cómo van mis metas de ahorro?'
];

export default function DemoPage() {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [draftMessage, setDraftMessage] = useState('');
  const [voiceDraft, setVoiceDraft] = useState('');

  const {
    summary,
    isLoading: summaryLoading,
    error: summaryError,
    updateSummary
  } = useFinancialSummary(sessionId);

  const handleStatementParsed = useCallback(
    (statement: NormalizedStatement) => {
      const mappedSummary: FinancialSummary = {
        total_balance: statement.totals.balance,
        monthly_income: statement.totals.income,
        monthly_expenses: statement.totals.expenses,
        expense_breakdown: statement.expenseByCategory,
        recent_transactions: statement.transactions.slice(-10).map(transaction => ({
          date: transaction.date,
          description: transaction.description,
          amount: transaction.amount,
          category: transaction.category ?? 'Sin categoría'
        })),
        generated_at: new Date().toISOString()
      };

      updateSummary(mappedSummary);
    },
    [updateSummary]
  );

  const {
    messages,
    sendMessage,
    isStreaming,
    lastIntent,
    insights,
    metadata,
    error: chatError
  } = useConversationEngine({ sessionId, onSummary: updateSummary });

  const voiceGateway = useVoiceGateway({
    sessionId,
    onPartialTranscript: setVoiceDraft,
    onFinalTranscript: text => {
      setVoiceDraft('');
      setDraftMessage('');
      void sendMessage(text);
    }
  });

  const { status: voiceStatus, error: voiceError, start: startVoice, stop: stopVoice, speak: speakVoice } = voiceGateway;

  const currentInput = useMemo(() => {
    const voiceActive = voiceStatus === 'listening';
    return voiceActive && voiceDraft.length ? voiceDraft : draftMessage;
  }, [draftMessage, voiceDraft, voiceStatus]);

  useEffect(() => {
    if (!messages.length || isStreaming) return;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'assistant' && lastMessage.id !== 'welcome') {
      void speakVoice(lastMessage.content);
    }
  }, [messages, isStreaming, speakVoice]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement> | null) => {
    event?.preventDefault();
    if (!currentInput.trim()) return;
    await sendMessage(currentInput);
    setDraftMessage('');
    setVoiceDraft('');
  };

  const handleSuggestedQuestion = (question: string) => {
    setDraftMessage('');
    setVoiceDraft('');
    void sendMessage(question);
  };

  const expenseEntries = summary
    ? Object.entries(summary.expense_breakdown).map(([label, value]) => ({ label, value }))
    : [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="min-h-screen px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-gradient-primary rounded-lg">
                <Brain className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            <h1
              className="text-4xl font-bold mb-4"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent'
              }}
            >
              Demo Interactivo de SalomonAI
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Explora cómo funciona nuestro asistente financiero inteligente con datos reales obtenidos del conversation engine
            </p>
            <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20 max-w-2xl mx-auto">
              <p className="text-sm text-primary">
                <strong>Nota:</strong> Esta demo se conecta al backend conversacional y de voz.{' '}
                <Link href="/signup" className="underline ml-1">
                  Crea una cuenta
                </Link>{' '}
                para conectar tus finanzas reales.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <ManualStatementUploadCard
                className="border-primary/20"
                onStatementParsed={handleStatementParsed}
              />
              <Card className="p-6 bg-gradient-card border-primary/20">
                <h2 className="text-xl font-semibold mb-6 flex items-center">
                  <Play className="w-5 h-5 mr-2 text-primary" />
                  Tu Dashboard Financiero
                </h2>
                {summaryLoading && <p className="text-sm text-muted-foreground">Cargando resumen...</p>}
                {summaryError && (
                  <p className="text-sm text-red-500 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {summaryError}
                  </p>
                )}
                {summary && (
                  <div className="space-y-4">
                    <div className="p-4 border border-border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Balance Total</span>
                        <DollarSign className="w-4 h-4 text-primary" />
                      </div>
                      <div className="text-xl font-bold text-primary">{formatCurrency(summary.total_balance)}</div>
                      <p className="text-xs text-green-500">{`Ingresos netos: ${formatCurrency(summary.monthly_income - summary.monthly_expenses)}`}</p>
                    </div>

                    <div className="p-4 border border-border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Ingresos</span>
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      </div>
                      <div className="text-xl font-bold text-green-500">{formatCurrency(summary.monthly_income)}</div>
                      <p className="text-xs text-muted-foreground">Este mes</p>
                    </div>

                    <div className="p-4 border border-border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Gastos</span>
                        <CreditCard className="w-4 h-4 text-red-500" />
                      </div>
                      <div className="text-xl font-bold text-red-500">{formatCurrency(summary.monthly_expenses)}</div>
                      <p className="text-xs text-muted-foreground">Este mes</p>
                    </div>
                  </div>
                )}
              </Card>

              <Card className="p-6 border-primary/20">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-primary" />
                  Insights dinámicos
                </h2>
                <div className="space-y-3">
                  {insights.length === 0 && (
                    <p className="text-sm text-muted-foreground">Haz una pregunta para descubrir información personalizada.</p>
                  )}
                  {insights.map(insight => (
                    <div key={insight.label} className="border border-border rounded-lg p-3 bg-background/60">
                      <p className="text-sm font-medium text-primary">{insight.label}</p>
                      <p className="text-sm">{insight.value}</p>
                      {insight.context && <p className="text-xs text-muted-foreground mt-1">{insight.context}</p>}
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <Card className="p-6 bg-gradient-card border-primary/20 h-full flex flex-col">
                <div className="flex items-center justify-between pb-6 mb-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-semibold">Conversación con SalomonAI</h2>
                  </div>
                  <Button
                    variant={voiceStatus === 'listening' ? 'destructive' : 'outline'}
                    onClick={voiceStatus === 'listening' ? stopVoice : startVoice}
                    className="flex items-center gap-2"
                  >
                    {voiceStatus === 'listening' ? (
                      <>
                        <MicOff className="w-4 h-4" />
                        Detener voz
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4" />
                        Activar voz
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 min-h-[18rem]">
                  <div className="flex flex-col gap-4">
                    {messages.map(message => (
                      <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                        {message.role === 'assistant' && (
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                            <Brain className="w-4 h-4 text-primary-foreground" />
                        </div>
                      )}
                      <div
                        className={`rounded-lg p-3 max-w-[80%] ${
                          message.role === 'user' ? 'bg-primary text-primary-foreground ml-auto' : 'bg-background border border-border'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        {message.intent && message.role === 'assistant' && (
                          <p className="text-[11px] text-muted-foreground mt-1">Intento detectado: {message.intent}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {chatError && (
                    <p className="text-sm text-red-500 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {chatError}
                    </p>
                  )}
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 flex gap-3">
                  <input
                    value={currentInput}
                    onChange={event => {
                      setVoiceDraft('');
                      setDraftMessage(event.target.value);
                    }}
                    placeholder={voiceStatus === 'listening' ? 'Escuchando...' : 'Escribe tu mensaje'}
                    className="flex-1 border border-border rounded-lg px-4 py-2 bg-background"
                  />
                  <Button type="submit" disabled={!currentInput.trim() || isStreaming} className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    {isStreaming ? 'Generando...' : 'Enviar'}
                  </Button>
                </form>
                {voiceError && (
                  <p className="text-xs text-red-500 mt-2 flex items-center gap-2">
                    <AlertCircle className="w-3 h-3" />
                    {voiceError}
                  </p>
                )}
              </Card>

              <Card className="p-6 border-primary/20">
                <h3 className="font-semibold mb-3">Transacciones recientes</h3>
                {summary && summary.recent_transactions.length > 0 ? (
                  <div className="space-y-2">
                    {summary.recent_transactions.map((transaction, index) => (
                      <div key={`${transaction.description}-${index}`} className="flex items-center justify-between p-2 border border-border rounded">
                        <div>
                          <p className="text-sm font-medium">{transaction.description as string}</p>
                          <p className="text-xs text-muted-foreground">{(transaction.category as string) ?? 'Sin categoría'}</p>
                        </div>
                        <span
                          className={`text-sm font-semibold ${
                            Number(transaction.amount) > 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {Number(transaction.amount) > 0 ? '+' : ''}
                          {formatCurrency(Number(transaction.amount))}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay transacciones disponibles para esta sesión.</p>
                )}
              </Card>

              {expenseEntries.length > 0 && (
                <Card className="p-6 border-primary/20">
                  <h3 className="font-semibold mb-3">Gastos por categoría</h3>
                  <div className="space-y-3">
                    {expenseEntries.map(entry => (
                      <div key={entry.label} className="flex items-center justify-between">
                        <span className="text-sm">{entry.label}</span>
                        <span className="text-sm font-semibold text-primary">{formatCurrency(entry.value)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <Card className="p-6 border-primary/20">
                <h3 className="font-semibold mb-3">Preguntas sugeridas</h3>
                <div className="flex flex-wrap gap-2">
                  {suggestedQuestions.map(question => (
                    <Button key={question} variant="outline" size="sm" onClick={() => handleSuggestedQuestion(question)}>
                      {question}
                    </Button>
                  ))}
                </div>
              </Card>

              {lastIntent && (
                <Card className="p-6 border-primary/20">
                  <h3 className="font-semibold mb-3">Intención detectada</h3>
                  <p className="text-sm">
                    <strong>{lastIntent.name}</strong> ({Math.round(lastIntent.confidence * 100)}% confianza)
                  </p>
                  {lastIntent.entities && Object.keys(lastIntent.entities).length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {Object.entries(lastIntent.entities).map(([key, value]) => (
                        <li key={key}>
                          <strong>{key}:</strong> {value}
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              )}

              {metadata && (
                <Card className="p-6 border-primary/20">
                  <h3 className="font-semibold mb-3">Contexto adicional</h3>
                  <pre className="bg-background border border-border rounded p-4 text-xs overflow-x-auto">
                    {JSON.stringify(metadata, null, 2)}
                  </pre>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

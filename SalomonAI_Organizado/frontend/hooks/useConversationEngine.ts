'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import { ENV } from '@/config/env';

type Role = 'assistant' | 'user' | 'system';

export interface ConversationMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
  intent?: string;
  metadata?: Record<string, unknown>;
}

export interface FinancialInsight {
  label: string;
  value: string;
  context?: string | null;
}

export interface FinancialSummary {
  total_balance: number;
  monthly_income: number;
  monthly_expenses: number;
  expense_breakdown: Record<string, number>;
  recent_transactions: Array<Record<string, unknown>>;
  generated_at: string;
}

interface UseConversationOptions {
  sessionId: string;
  onSummary?: (summary: FinancialSummary) => void;
}

interface StreamIntent {
  name: string;
  confidence: number;
  description?: string;
  entities?: Record<string, string>;
}

interface ChatEvent {
  type: string;
  token?: string;
  intent?: {
    name: string;
    confidence: number;
    description?: string;
    entities?: Record<string, string>;
  };
  insight?: FinancialInsight;
  data?: Record<string, unknown>;
  summary?: FinancialSummary;
  message?: string;
}

const decoder = new TextDecoder();

export function useConversationEngine({ sessionId, onSummary }: UseConversationOptions) {
  const [messages, setMessages] = useState<ConversationMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '¡Hola! Soy SalomonAI, tu asistente financiero.',
      createdAt: new Date().toISOString()
    }
  ]);
  const [lastIntent, setLastIntent] = useState<StreamIntent | null>(null);
  const [insights, setInsights] = useState<FinancialInsight[]>([]);
  const [metadata, setMetadata] = useState<Record<string, unknown> | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const assistantMessageId = useRef<string | null>(null);

  const baseUrl = useMemo(() => {
    return ENV.NEXT_PUBLIC_CONVERSATION_ENGINE_URL || 'http://localhost:8002';
  }, []);

  const appendAssistantToken = useCallback((token: string) => {
    if (!assistantMessageId.current) return;
    setMessages(prev =>
      prev.map(message =>
        message.id === assistantMessageId.current
          ? { ...message, content: `${message.content}${token}` }
          : message
      )
    );
  }, []);

  const upsertAssistantMessage = useCallback((id: string) => {
    assistantMessageId.current = id;
    setMessages(prev => {
      const exists = prev.some(message => message.id === id);
      if (exists) {
        return prev;
      }
      return [
        ...prev,
        {
          id,
          role: 'assistant',
          content: '',
          createdAt: new Date().toISOString()
        }
      ];
    });
  }, []);

  const processEvent = useCallback(
    (event: ChatEvent) => {
      switch (event.type) {
        case 'intent':
          if (event.intent) {
            setLastIntent(event.intent);
            if (assistantMessageId.current) {
              setMessages(prev =>
                prev.map(message =>
                  message.id === assistantMessageId.current
                    ? { ...message, intent: event.intent?.name }
                    : message
                )
              );
            }
          }
          break;
        case 'token':
          if (event.token) {
            appendAssistantToken(event.token);
          }
          break;
        case 'insight':
          if (event.insight) {
            const insight = event.insight;
            setInsights(prev => {
              const { label } = insight;
              const exists = prev.find(item => item.label === label);
              if (exists) {
                return prev.map(item => (item.label === label ? insight : item));
              }
              return [...prev, insight];
            });
          }
          break;
        case 'metadata':
          if (event.data) {
            setMetadata(event.data);
          }
          break;
        case 'summary':
          if (event.summary) {
            onSummary?.(event.summary);
          }
          break;
        case 'done':
          setIsStreaming(false);
          controllerRef.current = null;
          assistantMessageId.current = null;
          break;
        case 'error':
          if (event.message) {
            setError(event.message);
          }
          break;
        default:
          break;
      }
    },
    [appendAssistantToken, onSummary]
  );

  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim()) return;
      const id = crypto.randomUUID();
      const assistantId = crypto.randomUUID();
      setMessages(prev => [
        ...prev,
        {
          id,
          role: 'user',
          content: message,
          createdAt: new Date().toISOString()
        }
      ]);
      upsertAssistantMessage(assistantId);
      setIsStreaming(true);
      setError(null);
      setInsights([]);
      setMetadata(null);
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      try {
        const response = await fetch(`${baseUrl}/chat/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: controller.signal,
          body: JSON.stringify({
            session_id: sessionId,
            message
          })
        });
        if (!response.body) {
          throw new Error('Streaming no soportado por el servidor');
        }
        const reader = response.body.getReader();
        let buffer = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n');
          buffer = parts.pop() ?? '';
          for (const part of parts) {
            if (!part.trim()) continue;
            try {
              const parsed: ChatEvent = JSON.parse(part);
              processEvent(parsed);
            } catch (err) {
              console.warn('No se pudo parsear chunk', part, err);
            }
          }
        }
        if (buffer.trim()) {
          try {
            const parsed: ChatEvent = JSON.parse(buffer);
            processEvent(parsed);
          } catch (err) {
            console.warn('No se pudo parsear chunk final', buffer, err);
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          return;
        }
        setError((err as Error).message);
        setIsStreaming(false);
      }
    },
    [baseUrl, processEvent, sessionId, upsertAssistantMessage]
  );

  const cancelStreaming = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setIsStreaming(false);
  }, []);

  return {
    messages,
    sendMessage,
    cancelStreaming,
    isStreaming,
    lastIntent,
    insights,
    metadata,
    error
  };
}

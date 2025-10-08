'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import { sendChatMessage } from '@/lib/adapters/chat';
import type { ChatMessage, SendPayload } from '@/lib/store/chatTypes';
import { useSSEStream } from '@/lib/hooks/useSSEStream';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const { connect, connected, lost } = useSSEStream();
  const assemblingRef = useRef('');
  const currentAssistantIdRef = useRef<string | null>(null);
  const conversationIdRef = useRef<string | undefined>(undefined);

  const userId = useMemo(() => 'user-demo-123', []);

  const send = useCallback(
    async (input: string, mode: 'stream' | 'no-stream' = 'stream') => {
      const trimmed = input.trim();
      if (!trimmed) {
        return;
      }

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmed,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);

      if (mode === 'no-stream') {
        const payload: SendPayload = {
          conversation_id: conversationIdRef.current,
          user_id: userId,
          input: trimmed,
        };
        const response = await sendChatMessage(payload);
        conversationIdRef.current = response.conversation_id;
        setMessages((prev) => [...prev, response.message]);
        return;
      }

      const assistantId = crypto.randomUUID();
      currentAssistantIdRef.current = assistantId;
      assemblingRef.current = '';

      const placeholder: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, placeholder]);
      setTyping(true);

      connect(`/api/chat/stream?q=${encodeURIComponent(trimmed)}`, {
        onToken: (token) => {
          assemblingRef.current = `${assemblingRef.current}${token}`;
          const value = assemblingRef.current;
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantId ? { ...message, content: value } : message
            )
          );
        },
        onEnd: () => {
          setTyping(false);
          currentAssistantIdRef.current = null;
        },
        onError: () => {
          setTyping(false);
        },
      });
    },
    [connect, userId]
  );

  return {
    messages,
    send,
    typing,
    connected,
    lost,
  } as const;
}

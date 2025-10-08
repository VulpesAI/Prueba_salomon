'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { SseEvent } from '@/lib/store/chatTypes';

type StreamHandlers = {
  onToken: (token: string) => void;
  onEnd: (messageId: string) => void;
  onError?: (message: string) => void;
};

export function useSSEStream() {
  const [connected, setConnected] = useState(false);
  const [lost, setLost] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const backoffRef = useRef(500);

  const close = useCallback(() => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    setConnected(false);
  }, []);

  const connect = useCallback(
    (url: string, handlers: StreamHandlers) => {
      if (typeof window === 'undefined') {
        return;
      }

      close();
      setLost(false);

      const source = new EventSource(url);
      eventSourceRef.current = source;

      source.addEventListener('open', () => {
        setConnected(true);
        setLost(false);
        backoffRef.current = 500;
      });

      source.addEventListener('token', (event: MessageEvent<string>) => {
        try {
          const data = JSON.parse(event.data) as SseEvent;
          if (data.type === 'token') {
            handlers.onToken(data.value);
          }
        } catch (error) {
          handlers.onError?.(error instanceof Error ? error.message : 'Error de parseo');
        }
      });

      source.addEventListener('message_end', (event: MessageEvent<string>) => {
        try {
          const data = JSON.parse(event.data) as { message_id: string };
          handlers.onEnd(data.message_id);
          close();
        } catch (error) {
          handlers.onError?.(error instanceof Error ? error.message : 'Error de parseo');
        }
      });

      source.addEventListener('error', () => {
        setConnected(false);
        setLost(true);
        close();
        const delay = backoffRef.current;
        const nextDelay = Math.min(backoffRef.current * 2, 8000);
        backoffRef.current = nextDelay;
        window.setTimeout(() => connect(url, handlers), delay);
      });
    },
    [close]
  );

  useEffect(() => () => close(), [close]);

  return { connect, connected, lost } as const;
}

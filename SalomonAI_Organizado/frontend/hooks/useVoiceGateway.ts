'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type VoiceStatus = 'idle' | 'connecting' | 'listening' | 'stopped' | 'error';

interface VoiceGatewayOptions {
  sessionId: string;
  onPartialTranscript?: (text: string) => void;
  onFinalTranscript?: (text: string) => void;
}

interface VoiceGatewayHook {
  status: VoiceStatus;
  error: string | null;
  start: () => void;
  stop: () => void;
  speak: (text: string) => Promise<void>;
}

export function useVoiceGateway({ sessionId, onPartialTranscript, onFinalTranscript }: VoiceGatewayOptions): VoiceGatewayHook {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  const restUrl = useMemo(() => {
    return process.env.NEXT_PUBLIC_VOICE_GATEWAY_URL ?? 'http://localhost:8100';
  }, []);

  const wsUrl = useMemo(() => {
    const base = restUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    return `${base}/voice/stream?session=${sessionId}`;
  }, [restUrl, sessionId]);

  const cleanup = useCallback(() => {
    reconnectTimeout.current && clearTimeout(reconnectTimeout.current);
    reconnectTimeout.current = null;
    socketRef.current?.close();
    socketRef.current = null;
    setStatus('stopped');
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data as string);
        switch (payload.type) {
          case 'status':
            if (payload.status === 'listening') {
              setStatus('listening');
            } else if (payload.status === 'ready') {
              setStatus('idle');
            } else if (payload.status === 'stopped') {
              setStatus('stopped');
            }
            break;
          case 'transcript':
            if (payload.final) {
              onFinalTranscript?.(payload.text ?? '');
            } else {
              onPartialTranscript?.(payload.text ?? '');
            }
            break;
          case 'error':
            setError(payload.message ?? 'Error en la pasarela de voz');
            setStatus('error');
            break;
          default:
            break;
        }
      } catch (err) {
        console.warn('Mensaje no válido del voice-gateway', err);
      }
    },
    [onFinalTranscript, onPartialTranscript]
  );

  const start = useCallback(() => {
    if (socketRef.current || status === 'connecting') return;
    setError(null);
    setStatus('connecting');
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;
    socket.onopen = () => {
      setStatus('listening');
      socket.send(JSON.stringify({ event: 'start', payload: { sessionId } }));
    };
    socket.onerror = () => {
      setError('No fue posible conectar con el voice-gateway');
      setStatus('error');
    };
    socket.onmessage = handleMessage;
    socket.onclose = () => {
      socketRef.current = null;
      if (status === 'listening') {
        setStatus('stopped');
      }
    };
  }, [handleMessage, sessionId, status, wsUrl]);

  const stop = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.send(JSON.stringify({ event: 'stop' }));
    cleanup();
  }, [cleanup]);

  const speak = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      try {
        const response = await fetch(`${restUrl}/voice/speech`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text, session_id: sessionId })
        });
        if (!response.ok) {
          throw new Error('No se pudo sintetizar la respuesta');
        }
        const data = await response.json();
        if (data.audio_base64) {
          const audio = new Audio(`data:${data.format};base64,${data.audio_base64}`);
          void audio.play();
        }
      } catch (err) {
        setError((err as Error).message);
      }
    },
    [restUrl, sessionId]
  );

  return {
    status,
    error,
    start,
    stop,
    speak
  };
}

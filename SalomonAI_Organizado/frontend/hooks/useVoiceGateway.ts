'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type VoiceStatus = 'idle' | 'connecting' | 'listening' | 'stopped' | 'error';

interface VoiceGatewayOptions {
  sessionId: string;
  userId?: string;
  voiceId?: string;
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

export function useVoiceGateway({
  sessionId,
  userId,
  voiceId,
  onPartialTranscript,
  onFinalTranscript
}: VoiceGatewayOptions): VoiceGatewayHook {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  const restUrl = useMemo(() => {
    return process.env.NEXT_PUBLIC_VOICE_GATEWAY_URL ?? 'http://localhost:8100';
  }, []);

  const wsUrl = useMemo(() => {
    const base = restUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    const params = new URLSearchParams({ session: sessionId });
    if (userId) {
      params.set('user', userId);
    }
    return `${base}/voice/stream?${params.toString()}`;
  }, [restUrl, sessionId, userId]);

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
      if (voiceId) {
        socket.send(JSON.stringify({ type: 'config', voice: voiceId }));
      }
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
            'Content-Type': 'application/json',
            ...(userId ? { 'X-User-Id': userId } : {})
          },
          body: JSON.stringify({ text, session_id: sessionId, voice: voiceId })
        });
        if (!response.ok) {
          throw new Error('No se pudo sintetizar la respuesta');
        }
        const data = await response.json();
        if (data.audio_base64) {
          const mime = typeof data.mime === 'string' ? data.mime : 'audio/mp3';
          const audio = new Audio(`data:${mime};base64,${data.audio_base64}`);
          void audio.play();
        }
      } catch (err) {
        setError((err as Error).message);
      }
    },
    [restUrl, sessionId, userId, voiceId]
  );

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || !voiceId) {
      return;
    }
    socket.send(JSON.stringify({ type: 'config', voice: voiceId }));
  }, [voiceId]);

  return {
    status,
    error,
    start,
    stop,
    speak
  };
}

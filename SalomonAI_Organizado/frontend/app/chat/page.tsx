'use client';

import { useEffect, useMemo, useState } from 'react';

import Composer from '@/app/chat/_components/Composer';
import ConnectionBanner from '@/app/chat/_components/ConnectionBanner';
import MessageList from '@/app/chat/_components/MessageList';
import { useAutoTTS } from '@/lib/hooks/useAutoTTS';
import { useChat } from '@/lib/hooks/useChat';
import { useSTT } from '@/lib/hooks/useSTT';
import { getTtsPreference, setTtsPreference } from '@/lib/store/chatPrefs';

export default function ChatPage() {
  const { messages, send, typing, connected, lost } = useChat();
  const stt = useSTT();
  const [ttsEnabled, setTtsEnabled] = useState(true);

  useEffect(() => {
    const stored = getTtsPreference();
    if (stored !== null) {
      setTtsEnabled(stored);
    }
  }, []);

  useEffect(() => {
    setTtsPreference(ttsEnabled);
  }, [ttsEnabled]);

  const lastAssistant = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const candidate = messages[index];
      if (candidate.role === 'assistant' && candidate.content) {
        return candidate.content;
      }
    }
    return null;
  }, [messages]);

  useAutoTTS(ttsEnabled, lastAssistant);

  return (
    <main className="container space-y-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Chat &amp; Voz</h1>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={ttsEnabled}
            onChange={(event) => setTtsEnabled(event.target.checked)}
            aria-label="Activar lectura automática"
          />
          Reproducir automático (TTS)
        </label>
      </div>

      <ConnectionBanner lost={lost && !connected} />

      <MessageList items={messages} typing={typing} />

      <div className="text-xs text-muted-foreground" aria-live="polite">
        Estado: {connected ? 'Conectado' : lost ? 'Reconectando…' : 'Listo'}
      </div>

      <Composer onSend={(text) => void send(text, 'stream')} stt={stt} />

      {lastAssistant ? (
        <button
          type="button"
          className="h-9 rounded-md border px-3 text-sm"
          aria-label="Reproducir último mensaje"
          onClick={() => {
            if (typeof window === 'undefined') {
              return;
            }
            if ('speechSynthesis' in window && lastAssistant) {
              const utterance = new SpeechSynthesisUtterance(lastAssistant);
              utterance.lang = 'es-CL';
              window.speechSynthesis.cancel();
              window.speechSynthesis.speak(utterance);
            }
          }}
        >
          Reproducir
        </button>
      ) : null}
    </main>
  );
}

'use client';

import { Mic, Send } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';

import '@/styles/chat.css';

type SttControls = {
  recording: boolean;
  partial: string;
  finalText: string;
  start: () => void;
  stop: () => void;
  reset: () => void;
};

export function Composer({ onSend, stt }: { onSend: (text: string) => void; stt: SttControls }) {
  const { recording, partial, finalText, start, stop, reset } = stt;
  const [value, setValue] = useState('');

  useEffect(() => {
    if (finalText) {
      setValue((prev) => {
        const base = prev.trim();
        if (!base) {
          return finalText;
        }
        return `${base} ${finalText}`.trim();
      });
      reset();
    }
  }, [finalText, reset]);

  const placeholder = useMemo(() => (recording ? 'Grabando…' : 'Escribe un mensaje…'), [recording]);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    onSend(trimmed);
    setValue('');
  }, [onSend, value]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="flex items-end gap-2" role="form" aria-label="Composer de mensajes">
      <div className="flex-1">
        <label className="sr-only" htmlFor="composer">
          Escribe tu mensaje
        </label>
        <textarea
          id="composer"
          aria-label="Escribe tu mensaje"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full min-h-[44px] max-h-40 resize-y rounded-md border border-neutral bg-white/80 px-3 py-2 text-sm text-primary placeholder:text-muted focus-brand dark:border-soft dark:bg-[rgba(31,41,55,0.85)]"
        />
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span>Enter envía · Shift+Enter agrega un salto de línea</span>
          {partial ? (
            <span aria-live="polite" className="italic">
              Parcial: {partial}
            </span>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        className="inline-flex h-10 items-center gap-2 rounded-md border border-soft bg-[rgba(8,17,52,0.06)] px-3 text-sm font-medium text-primary transition-colors hover:bg-[rgba(8,17,52,0.1)] focus-brand dark:bg-[rgba(255,255,255,0.06)] dark:hover:bg-[rgba(255,255,255,0.1)]"
        aria-label="Enviar mensaje"
        onClick={handleSubmit}
      >
        <Send className="h-4 w-4" />
        <span>Enviar</span>
      </button>

      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-soft bg-[rgba(8,17,52,0.06)] transition-colors hover:bg-[rgba(8,17,52,0.1)] focus-accent dark:bg-[rgba(255,255,255,0.06)] dark:hover:bg-[rgba(255,255,255,0.1)]"
        aria-label={recording ? 'Detener grabación' : 'Iniciar grabación'}
        onClick={() => (recording ? stop() : start())}
        title={recording ? 'Detener' : 'Grabar'}
      >
        {recording ? <span className="dot-recording" /> : <Mic className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default Composer;

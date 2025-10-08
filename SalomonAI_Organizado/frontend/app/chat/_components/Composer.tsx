'use client';

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
          className="w-full min-h-[44px] max-h-40 resize-y rounded-md border bg-background p-2 text-sm"
        />
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
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
        className="h-10 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
        aria-label="Enviar mensaje"
        onClick={handleSubmit}
      >
        Enviar
      </button>

      <button
        type="button"
        className="relative flex h-10 w-10 items-center justify-center rounded-full border"
        aria-label={recording ? 'Detener grabación' : 'Iniciar grabación'}
        onClick={() => (recording ? stop() : start())}
        title={recording ? 'Detener' : 'Grabar'}
      >
        {recording ? <span className="dot-recording" /> : <span aria-hidden="true">🎤</span>}
      </button>
    </div>
  );
}

export default Composer;

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { SttResponse } from '@/lib/store/chatTypes';

type RecognitionResult = {
  isFinal: boolean;
  0: { transcript: string };
};

type RecognitionResultList = {
  length: number;
  item: (index: number) => RecognitionResult;
  [index: number]: RecognitionResult;
};

type RecognitionEvent = {
  resultIndex: number;
  results: RecognitionResultList;
};

type RecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
};

type RecognitionConstructor = new () => RecognitionInstance;

type ExtendedWindow = typeof window & {
  webkitSpeechRecognition?: RecognitionConstructor;
  SpeechRecognition?: RecognitionConstructor;
};

export function useSTT() {
  const [recording, setRecording] = useState(false);
  const [partial, setPartial] = useState('');
  const [finalText, setFinalText] = useState('');
  const recognitionRef = useRef<RecognitionInstance | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const win = window as ExtendedWindow;
    const Recognition = win.webkitSpeechRecognition ?? win.SpeechRecognition;

    if (!Recognition) {
      return;
    }

    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'es-CL';
    recognition.onresult = (event: RecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript ?? '';
        if (!transcript) {
          continue;
        }
        if (result.isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      if (interim) {
        setPartial(interim.trim());
      }
      if (final) {
        setFinalText((prev) => `${prev} ${final}`.trim());
        setPartial('');
      }
    };
    recognition.onstart = () => setRecording(true);
    recognition.onend = () => {
      setRecording(false);
      setPartial('');
    };

    return () => {
      recognition.onresult = null;
      recognition.onstart = null;
      recognition.onend = null;
      recognition.stop();
    };
  }, []);

  const start = useCallback(async () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
      return;
    }

    setRecording(true);
    setPartial('Escuchando…');
    try {
      const response = await fetch('/api/voice/stt', { method: 'POST' });
      if (!response.ok) {
        throw new Error('No se pudo transcribir el audio');
      }
      const data = (await response.json()) as SttResponse;
      setFinalText(data.transcript);
    } catch (error) {
      console.error(error);
      setPartial('Error al transcribir');
    } finally {
      setRecording(false);
      setTimeout(() => setPartial(''), 800);
    }
  }, []);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }
    setRecording(false);
    setPartial('');
  }, []);

  const reset = useCallback(() => {
    setPartial('');
    setFinalText('');
  }, []);

  return {
    recording,
    partial,
    finalText,
    start,
    stop,
    reset,
  } as const;
}

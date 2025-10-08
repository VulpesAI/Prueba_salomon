'use client';

import { useEffect } from 'react';

export function useAutoTTS(enabled: boolean, text: string | null) {
  useEffect(() => {
    if (!enabled || !text) {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    if (!('speechSynthesis' in window)) {
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-CL';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [enabled, text]);
}

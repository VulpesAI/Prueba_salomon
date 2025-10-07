'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { synthesizeSpeech, voiceTurn, VoiceLoopError, VoiceTurnResult } from '@/utils/voiceLoop';

type RecorderStatus = 'idle' | 'recording' | 'processing';

export function VoiceButton({ userId }: { userId?: string }) {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [assistantText, setAssistantText] = useState<string>('');
  const [metrics, setMetrics] = useState<VoiceTurnResult['metrics'] | null>(null);
  const [ttsFailed, setTtsFailed] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current = null;
    };
  }, []);

  const handleVoiceResult = useCallback((result: VoiceTurnResult) => {
    setAssistantText(result.assistantText);
    setMetrics(result.metrics);
    setTtsFailed(Boolean(result.ttsError));

    if (result.audioBlob) {
      const url = URL.createObjectURL(result.audioBlob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      void audio.play();
    }
  }, []);

  const handleStopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    if (!recorder) return;

    recorder.stream.getTracks().forEach((track) => track.stop());
    recorder.ondataavailable = null;
    recorder.onstop = null;

    setStatus('processing');
    setError(null);

    const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
    chunksRef.current = [];

    try {
      const result = await voiceTurn({
        audioBlob: blob,
        userId,
        onMetrics: setMetrics
      });
      handleVoiceResult(result);
    } catch (err) {
      if (err instanceof VoiceLoopError) {
        setError(err.message);
      } else {
        setError('Ocurrió un error inesperado en el ciclo de voz.');
      }
    } finally {
      setStatus('idle');
    }
  }, [handleVoiceResult, userId]);

  const startRecording = useCallback(async () => {
    setError(null);
    setAssistantText('');
    setMetrics(null);
    setTtsFailed(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        void handleStopRecording();
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setStatus('recording');
    } catch {
      setError('No se pudo acceder al micrófono.');
      setStatus('idle');
    }
  }, [handleStopRecording]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (recorder.state !== 'inactive') {
      recorder.stop();
    }
  }, []);

  const handleButtonClick = useCallback(() => {
    if (status === 'recording') {
      stopRecording();
    } else if (status === 'idle') {
      void startRecording();
    }
  }, [startRecording, status, stopRecording]);

  const retryAudio = useCallback(async () => {
    if (!assistantText.trim()) return;
    try {
      const audioBlob = await synthesizeSpeech({ text: assistantText });
      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      void audio.play();
      setTtsFailed(false);
    } catch (err) {
      const message = err instanceof VoiceLoopError ? err.message : 'No fue posible generar el audio.';
      setError(message);
    }
  }, [assistantText]);

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        className="rounded-full bg-emerald-600 px-6 py-3 text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
        onClick={handleButtonClick}
        disabled={status === 'processing'}
      >
        {status === 'recording' ? 'Detener' : status === 'processing' ? 'Procesando…' : 'Hablar'}
      </button>

      {assistantText && (
        <div className="rounded-md border border-muted-foreground/20 bg-muted p-3 text-sm text-muted-foreground">
          {assistantText}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {ttsFailed && (
        <button
          type="button"
          className="self-start text-sm text-emerald-700 underline"
          onClick={() => {
            setError(null);
            void retryAudio();
          }}
        >
          Reintentar audio
        </button>
      )}

      {metrics && (
        <div className="text-xs text-muted-foreground">
          <p>Latencia STT: {metrics.sttMs.toFixed(0)} ms</p>
          <p>Latencia Chat: {metrics.chatMs.toFixed(0)} ms</p>
          <p>Latencia TTS: {metrics.ttsMs !== null ? metrics.ttsMs.toFixed(0) : '—'} ms</p>
          <p>Latencia total: {metrics.totalMs.toFixed(0)} ms</p>
        </div>
      )}
    </div>
  );
}

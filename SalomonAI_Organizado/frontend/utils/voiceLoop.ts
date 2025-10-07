export class VoiceLoopError extends Error {
  readonly code: string;

  constructor(code: string, message?: string, options?: ErrorOptions) {
    super(message ?? code, options);
    this.name = 'VoiceLoopError';
    this.code = code;
  }
}

export interface VoiceTurnMetrics {
  sttMs: number;
  chatMs: number;
  ttsMs: number | null;
  totalMs: number;
}

export interface VoiceTurnResult {
  userText: string;
  assistantText: string;
  audioBlob: Blob | null;
  metrics: VoiceTurnMetrics;
  ttsError?: VoiceLoopError;
}

interface VoiceTurnOptions {
  audioBlob: Blob;
  sttUrl?: string;
  chatUrl?: string;
  ttsUrl?: string;
  userId?: string;
  timeoutMs?: number;
  onMetrics?: (metrics: VoiceTurnMetrics) => void;
}

const DEFAULT_TIMEOUT = 60_000;

export async function voiceTurn({
  audioBlob,
  sttUrl = '/voice/transcriptions',
  chatUrl = '/conversation/chat',
  ttsUrl = '/voice/speech',
  userId,
  timeoutMs = DEFAULT_TIMEOUT,
  onMetrics
}: VoiceTurnOptions): Promise<VoiceTurnResult> {
  const audioBase64 = await blobToBase64(audioBlob);
  const mimeType = audioBlob.type || 'audio/m4a';

  const totalStarted = performance.now();

  const sttStarted = performance.now();
  const sttResponse = await fetchJson(sttUrl, {
    audio_base64: audioBase64,
    mime: mimeType,
    language: 'es'
  }, timeoutMs).catch((error) => {
    throw wrapError('stt_failed', 'No se pudo transcribir el audio', error);
  });
  const sttMs = performance.now() - sttStarted;

  const text = typeof sttResponse?.text === 'string' ? sttResponse.text.trim() : '';
  if (!text) {
    throw new VoiceLoopError('empty_transcript', 'No se entendió el audio, intenta nuevamente.');
  }

  const chatPayload = {
    user_id: userId ?? null,
    model: 'gpt-4o-mini',
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content:
          'Eres SalomónAI, coach financiero en español de Chile. Responde claro y con pasos accionables.'
      },
      {
        role: 'user',
        content: text
      }
    ]
  };

  const chatStarted = performance.now();
  const chatResponse = await callWithRetry(() => fetchJson(chatUrl, chatPayload, timeoutMs), 2).catch(
    (error) => {
      throw wrapError('chat_failed', 'Ocurrió un problema generando la respuesta.', error);
    }
  );
  const chatMs = performance.now() - chatStarted;

  const reply = typeof chatResponse?.reply === 'string' ? chatResponse.reply.trim() : '';
  if (!reply) {
    throw new VoiceLoopError('empty_reply', 'No se pudo obtener una respuesta del asistente.');
  }

  let audioOut: Blob | null = null;
  let ttsError: VoiceLoopError | undefined;
  let ttsMs: number | null = null;
  try {
    const ttsStarted = performance.now();
    const ttsJson = await fetchJson(
      ttsUrl,
      {
        text: reply,
        voice: 'alloy',
        format: 'mp3',
        language: 'es-CL'
      },
      timeoutMs
    );
    ttsMs = performance.now() - ttsStarted;

    if (!ttsJson?.audio_base64) {
      throw new Error('missing_audio');
    }
    audioOut = base64ToBlob(ttsJson.audio_base64, ttsJson.mime || 'audio/mp3');
  } catch (error) {
    ttsError = wrapError('tts_failed', 'No fue posible reproducir el audio.', error);
    audioOut = null;
  }

  const metrics: VoiceTurnMetrics = {
    sttMs,
    chatMs,
    ttsMs,
    totalMs: performance.now() - totalStarted
  };

  onMetrics?.(metrics);

  return {
    userText: text,
    assistantText: reply,
    audioBlob: audioOut,
    metrics,
    ...(ttsError ? { ttsError } : {})
  };
}

export async function synthesizeSpeech({
  text,
  ttsUrl = '/voice/speech',
  timeoutMs = DEFAULT_TIMEOUT
}: {
  text: string;
  ttsUrl?: string;
  timeoutMs?: number;
}): Promise<Blob> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new VoiceLoopError('empty_text', 'No hay texto para convertir a audio.');
  }
  const response = await fetchJson(
    ttsUrl,
    { text: trimmed, voice: 'alloy', format: 'mp3', language: 'es-CL' },
    timeoutMs
  ).catch((error) => {
    throw wrapError('tts_failed', 'No fue posible sintetizar la respuesta.', error);
  });
  if (!response?.audio_base64) {
    throw new VoiceLoopError('tts_failed', 'La respuesta de audio está vacía.');
  }
  return base64ToBlob(response.audio_base64, response.mime || 'audio/mp3');
}

async function fetchJson(url: string, body: Record<string, unknown>, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`http_${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function callWithRetry<T>(factory: () => Promise<T>, attempts: number): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await factory();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
  }
  throw lastError;
}

function wrapError(code: string, message: string, cause: unknown): VoiceLoopError {
  if (cause instanceof VoiceLoopError) {
    return cause;
  }
  return new VoiceLoopError(code, message, { cause });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error('read_error'));
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(b64: string, mime = 'audio/mp3'): Blob {
  const byteChars = atob(b64);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i += 1) {
    bytes[i] = byteChars.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

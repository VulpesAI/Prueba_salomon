'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { synthesizeSpeech } from '@/utils/voiceLoop';
import { ENV } from '@/config/env';

interface VoiceSupports {
  tts: boolean;
  realtime: boolean;
}

interface VoiceDefinition {
  id: string;
  label: string;
  supports: VoiceSupports;
  latency_ms?: {
    tts?: number | null;
    realtime?: number | null;
  };
  failures?: Record<string, string> | null;
}

interface VoicePickerProps {
  current?: string;
  onChange?: (voiceId: string) => void;
}

const PREVIEW_TEXT =
  'Hola, soy SalomónAI. Estoy aquí para ayudarte a planificar tus finanzas y tomar decisiones inteligentes.';

export function VoicePicker({ current, onChange }: VoicePickerProps) {
  const { user } = useAuth();
  const [voices, setVoices] = useState<VoiceDefinition[]>([]);
  const [selected, setSelected] = useState<string | undefined>(current);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedRef = useRef<string | undefined>(current);

  const restUrl = useMemo(() => {
    return ENV.NEXT_PUBLIC_VOICE_GATEWAY_URL || 'http://localhost:8100';
  }, []);

  useEffect(() => {
    if (current) {
      setSelected(current);
    }
  }, [current]);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    let isMounted = true;
    const loadVoices = async () => {
      setLoading(true);
      setError(null);
      try {
        const headers: HeadersInit = user?.id ? { 'X-User-Id': user.id } : {};
        const response = await fetch(`${restUrl}/voice/voices`, { headers });
        if (!response.ok) {
          throw new Error(`http_${response.status}`);
        }
        const data = await response.json();
        const fetched: VoiceDefinition[] = data.voices ?? [];
        if (!isMounted) return;
        setVoices(fetched);

        let initialVoice = current;
        if (user?.id) {
          try {
            const preference = await fetch(`${restUrl}/user/settings/voice`, { headers });
            if (preference.ok) {
              const payload = await preference.json();
              if (payload?.voice) {
                initialVoice = payload.voice as string;
              }
            }
          } catch (err) {
            console.warn('No fue posible recuperar la voz preferida', err);
          }
        }
        if (!initialVoice && fetched.length) {
          const fallback = fetched.find((voice) => voice.supports.tts);
          initialVoice = fallback?.id;
        }
        if (initialVoice && initialVoice !== selectedRef.current) {
          setSelected(initialVoice);
          onChange?.(initialVoice);
        }
      } catch (err) {
        console.error('No fue posible cargar el catálogo de voces', err);
        if (isMounted) {
          setError('No fue posible cargar el catálogo de voces de OpenAI.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadVoices();

    return () => {
      isMounted = false;
    };
  }, [current, onChange, restUrl, user?.id]);

  const handleSelection = async (voiceId: string) => {
    setSelected(voiceId);
    onChange?.(voiceId);
    if (!user?.id) return;
    try {
      const response = await fetch(`${restUrl}/user/settings/voice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id
        },
        body: JSON.stringify({ voice: voiceId })
      });
      if (!response.ok) {
        throw new Error(`http_${response.status}`);
      }
    } catch (err) {
      console.error('No fue posible guardar la voz preferida', err);
      setError('No fue posible guardar la voz seleccionada.');
    }
  };

  const handlePreview = async () => {
    if (!selected) return;
    setPreviewing(true);
    setError(null);
    try {
      const blob = await synthesizeSpeech({
        text: PREVIEW_TEXT,
        voiceId: selected,
        userId: user?.id ?? undefined,
        ttsUrl: `${restUrl}/voice/speech`
      });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      void audio.play();
    } catch (err) {
      console.error('No se pudo generar la previsualización de voz', err);
      setError('No se pudo generar la previsualización de la voz.');
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="block text-sm font-medium text-muted-foreground">Voz preferida</label>
        <select
          className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          disabled={loading || voices.length === 0}
          value={selected ?? ''}
          onChange={(event) => handleSelection(event.target.value)}
        >
          <option value="" disabled>
            {loading ? 'Cargando voces…' : 'Selecciona una voz'}
          </option>
          {voices.map((voice) => (
            <option key={voice.id} value={voice.id}>
              {voice.label} {voice.supports.realtime ? '· Realtime' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          Las voces disponibles se validan automáticamente para síntesis (gpt-4o-mini-tts) y streaming Realtime.
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!selected || previewing || loading}
          onClick={() => {
            void handlePreview();
          }}
        >
          {previewing ? 'Generando…' : 'Previsualizar voz'}
        </Button>
        {selected && (
          <span className="text-xs text-muted-foreground">
            {(() => {
              const voice = voices.find((item) => item.id === selected);
              if (!voice) return null;
              const supportsRealtime = voice.supports.realtime;
              const supportsTts = voice.supports.tts;
              if (supportsRealtime && supportsTts) {
                return 'Compatible con TTS y Realtime.';
              }
              if (supportsTts) {
                return 'Compatible solo con TTS.';
              }
              return 'Compatible solo con Realtime.';
            })()}
          </span>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

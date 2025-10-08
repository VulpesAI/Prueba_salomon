'use client';

import { useSettings } from '@/lib/settings/context';
import type { VoiceId } from '@/types/settings';

const voices: { id: VoiceId; label: string }[] = [
  { id: 'alloy', label: 'Alloy' },
  { id: 'ash', label: 'Ash' },
  { id: 'nova', label: 'Nova' },
  { id: 'verse', label: 'Verse' },
  { id: 'sonora', label: 'Sonora' },
];

export default function VoiceSelect() {
  const { settings, setVoice } = useSettings();

  return (
    <div className="space-y-2 rounded-card border border-soft bg-gradient-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-primary">Voz preferida</h3>
          <p className="text-sm text-muted">Selecciona la voz para TTS.</p>
        </div>
      </div>
      <label className="sr-only" htmlFor="voice">
        Voz preferida
      </label>
      <select
        id="voice"
        aria-label="Voz preferida"
        className="h-9 w-full rounded-md border border-neutral bg-white px-3 text-sm text-primary focus-brand dark:border-soft dark:bg-[rgba(31,41,55,0.85)]"
        value={settings.voice}
        onChange={(event) => setVoice(event.target.value as VoiceId)}
      >
        {voices.map((voice) => (
          <option key={voice.id} value={voice.id}>
            {voice.label}
          </option>
        ))}
      </select>
    </div>
  );
}

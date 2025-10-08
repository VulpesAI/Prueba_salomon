'use client';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { getSettings, updateSettings } from '@/lib/settings/adapter';
import { SettingsFormState, VoiceOption } from '@/lib/settings/types';

const VOICES: Array<{ id: VoiceOption; name: string; desc: string }> = [
  { id: 'alloy', name: 'Alloy', desc: 'Equilibrada, clara y natural. Ideal para uso general y lectura prolongada.' },
  { id: 'ash', name: 'Ash', desc: 'Más cálida y cercana. Buena para conversación y tono empático.' },
  { id: 'nova', name: 'Nova', desc: 'Enérgica, con presencia marcada. Útil para indicaciones rápidas.' },
];

// Puedes ampliar esta lista o detectarla dinámicamente si tu runtime soporta Intl.supportedValuesOf('timeZone')
const TIMEZONES_FALLBACK = [
  'America/Santiago',
  'America/Argentina/Buenos_Aires',
  'America/Lima',
  'America/Bogota',
  'America/Mexico_City',
  'UTC',
];

type IntlWithSupportedValuesOf = typeof Intl & {
  supportedValuesOf?: (key: 'timeZone') => readonly string[];
};

function supportedTimeZones(): string[] {
  const intl = Intl as IntlWithSupportedValuesOf;
  if (typeof intl.supportedValuesOf === 'function') {
    return [...intl.supportedValuesOf('timeZone')];
  }
  return TIMEZONES_FALLBACK;
}

const LANGS = ['es-CL', 'es-ES', 'es-MX', 'en-US', 'en-GB', 'pt-BR'];

export default function ProfileForm() {
  const [form, setForm] = useState<SettingsFormState>({
    voice: 'alloy',
    theme: 'dark',
    language: 'es-CL',
    timeZone: 'America/Santiago',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const zones = useMemo(() => supportedTimeZones(), []);

  useEffect(() => {
    (async () => {
      try {
        const s = await getSettings();
        setForm({
          voice: s.voice,
          theme: s.theme,
          language: s.language,
          timeZone: s.timeZone,
        });
        setSavedAt(s.updatedAt);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'No se pudo cargar perfil');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const next = await updateSettings(form);
      setSavedAt(next.updatedAt);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-2xl border bg-muted/20" aria-busy="true" />;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="rounded-2xl border p-6 space-y-4">
        <h2 className="text-xl font-semibold">Preferencias regionales</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="block">Idioma</span>
            <select
              className="mt-1 w-full rounded-lg border bg-background p-2"
              value={form.language}
              onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
              aria-label="Idioma"
            >
              {LANGS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Se inicializa con el idioma de tu dispositivo.
            </p>
          </label>

          <label className="block text-sm">
            <span className="block">Zona horaria</span>
            <select
              className="mt-1 w-full rounded-lg border bg-background p-2"
              value={form.timeZone}
              onChange={(e) => setForm((f) => ({ ...f, timeZone: e.target.value }))}
              aria-label="Zona horaria"
            >
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Detectada automáticamente desde tu dispositivo.
            </p>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm">Moneda</p>
            <div className="mt-1 rounded-lg border bg-muted/20 p-2">
              <span className="font-medium">CLP</span>{' '}
              <span className="text-xs text-muted-foreground">(fija)</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              La moneda por defecto es CLP y no puede cambiarse.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border p-6 space-y-4">
        <h2 className="text-xl font-semibold">Voz del asistente</h2>
        <div className="grid gap-3">
          {VOICES.map((v) => (
            <label key={v.id} className="flex items-start gap-3 rounded-lg border p-3">
              <input
                type="radio"
                name="voice"
                className="mt-1"
                checked={form.voice === v.id}
                onChange={() => setForm((f) => ({ ...f, voice: v.id }))}
                aria-label={`Voz ${v.name}`}
              />
              <div>
                <div className="font-medium">{v.name}</div>
                <div className="text-sm text-muted-foreground">{v.desc}</div>
              </div>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Estas voces se reproducen vía API de OpenAI en la app. Elige la que más te acomode.
        </p>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-70"
          disabled={saving}
          aria-busy={saving}
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {savedAt && (
          <span className="text-xs text-muted-foreground">
            Última actualización: {new Date(savedAt).toLocaleString()}
          </span>
        )}
        {error && (
          <span role="alert" className="text-sm text-red-600">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}

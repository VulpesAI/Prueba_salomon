'use client';
import { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '@/lib/settings/adapter';
import { SettingsFormState, VoiceOption } from '@/lib/settings/types';

const VOICES: VoiceOption[] = ['alloy', 'ash', 'nova'];

export default function SettingsForm() {
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

  useEffect(() => {
    (async () => {
      try {
        const dto = await getSettings();
        setForm({
          voice: dto.voice,
          theme: dto.theme,
          language: dto.language,
          timeZone: dto.timeZone,
        });
        setSavedAt(dto.updatedAt);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error cargando preferencias';
        setError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const dto = await updateSettings(form);
      setSavedAt(dto.updatedAt);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error guardando preferencias';
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="animate-pulse p-6 rounded-2xl border bg-muted/30 h-48" aria-busy="true" />;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="rounded-2xl border p-6 space-y-4">
        <h2 className="text-xl font-semibold">Preferencias de voz</h2>
        <label className="block text-sm">
          Voz preferida
          <select
            className="mt-1 w-full rounded-lg border p-2 bg-background"
            value={form.voice}
            onChange={(event) => {
              const voice = event.target.value as VoiceOption;
              setForm((previous) => ({ ...previous, voice }));
            }}
            aria-label="Voz preferida"
          >
            {VOICES.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <p className="text-xs text-muted-foreground">Se usará para TTS en respuestas de voz.</p>
      </section>

      <section className="rounded-2xl border p-6 space-y-4">
        <h2 className="text-xl font-semibold">Apariencia</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Modo oscuro</p>
            <p className="text-sm text-muted-foreground">Aplica a toda la interfaz</p>
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={form.theme === 'dark'}
              onChange={(e) => setForm((f) => ({ ...f, theme: e.target.checked ? 'dark' : 'light' }))}
              aria-checked={form.theme === 'dark'}
              aria-label="Alternar modo oscuro"
            />
            <span className="w-10 h-6 rounded-full bg-muted relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-background peer-checked:after:translate-x-4 transition-all" />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border p-6 space-y-2">
        <h2 className="text-xl font-semibold">Privacidad</h2>
        <p className="text-sm text-muted-foreground">
          Tus datos se procesan según nuestra política. Revisa los detalles.
        </p>
        <a href="/legal/privacidad" className="text-sm underline">Ver política de privacidad</a>
      </section>

      <section className="rounded-2xl border p-6 space-y-2">
        <h2 className="text-xl font-semibold">Cuentas conectadas</h2>
        <p className="text-sm text-muted-foreground">Próximamente podrás vincular tus bancos.</p>
        <button className="rounded-lg border px-3 py-2 opacity-60 cursor-not-allowed" disabled>Conectar cuenta</button>
      </section>

      <section className="rounded-2xl border p-6 space-y-2">
        <h2 className="text-xl font-semibold">Exportación</h2>
        <button className="rounded-lg border px-3 py-2 opacity-60 cursor-not-allowed" disabled title="Próximamente">
          Exportar datos
        </button>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-lg bg-primary text-primary-foreground px-4 py-2 disabled:opacity-70"
          disabled={saving}
          aria-busy={saving}
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {savedAt && <span className="text-xs text-muted-foreground">Última actualización: {new Date(savedAt).toLocaleString()}</span>}
        {error && <span role="alert" className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}

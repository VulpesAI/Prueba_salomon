'use client';

import { useSettings } from '@/lib/settings/context';

export default function ThemeToggle() {
  const { settings, setTheme } = useSettings();
  const isDark = settings.theme === 'dark';

  return (
    <div className="space-y-2 rounded-card border border-soft bg-gradient-card p-4">
      <h3 className="text-base font-semibold text-primary">Modo oscuro</h3>
      <p className="text-sm text-muted">Activa el tema oscuro (recomendado).</p>
      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isDark}
          onChange={(event) => setTheme(event.target.checked ? 'dark' : 'light')}
          aria-label="Activar modo oscuro"
          className="h-4 w-4 rounded border border-neutral bg-white focus-brand dark:border-soft dark:bg-[rgba(31,41,55,0.85)]"
        />
        {isDark ? 'Oscuro' : 'Claro'}
      </label>
    </div>
  );
}

'use client';

import { useSettings } from '@/lib/settings/context';

export default function ThemeToggle() {
  const { settings, setTheme } = useSettings();
  const isDark = settings.theme === 'dark';

  return (
    <div className="space-y-2 rounded-xl border p-4">
      <h3 className="text-base font-semibold">Modo oscuro</h3>
      <p className="text-sm text-muted-foreground">
        Activa el tema oscuro (recomendado).
      </p>
      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isDark}
          onChange={(event) => setTheme(event.target.checked ? 'dark' : 'light')}
          aria-label="Activar modo oscuro"
          className="h-4 w-4 rounded border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
        {isDark ? 'Oscuro' : 'Claro'}
      </label>
    </div>
  );
}

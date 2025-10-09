'use client';

import { useSettings } from '@/lib/settings/context';

export default function ThemeToggle() {
  const { settings, setTheme } = useSettings();
  const isLight = settings.theme === 'light';

  return (
    <div className="space-y-2 rounded-card border border-soft bg-gradient-card p-4 text-surface">
      <h3 className="text-base font-semibold text-surface">Modo claro</h3>
      <p className="text-sm text-muted">
        Activa un fondo luminoso con paneles blancos. Desactívalo para volver al modo oscuro
        predeterminado.
      </p>
      <label className="inline-flex items-center gap-2 text-sm text-surface">
        <input
          type="checkbox"
          checked={isLight}
          onChange={(event) => setTheme(event.target.checked ? 'light' : 'dark')}
          aria-label="Activar modo claro"
          className="h-4 w-4 rounded border border-neutral bg-white focus-brand dark:border-soft dark:bg-[rgba(31,41,55,0.85)]"
        />
        {isLight ? 'Claro' : 'Oscuro'}
      </label>
    </div>
  );
}

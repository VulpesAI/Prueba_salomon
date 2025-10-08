import { ThemeOption } from '../settings/types';

export function applyTheme(theme: ThemeOption) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

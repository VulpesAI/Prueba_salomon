import { ThemeOption } from '../settings/types';

export function applyTheme(theme: ThemeOption) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    root.dataset.theme = 'dark';
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
    root.dataset.theme = 'light';
  }
}

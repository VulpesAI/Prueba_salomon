'use client';

import { SettingsProvider } from '@/lib/settings/context';
import { AuthProvider } from '@/context/AuthContext';

type ProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: ProvidersProps) {
  return (
    <SettingsProvider>
      <AuthProvider>{children}</AuthProvider>
    </SettingsProvider>
  );
}

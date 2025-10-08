'use client';

import ConnectedAccounts from './_components/ConnectedAccounts';
import ExportDataCard from './_components/ExportDataCard';
import PrivacyCard from './_components/PrivacyCard';
import ThemeToggle from './_components/ThemeToggle';
import VoiceSelect from './_components/VoiceSelect';

export default function ConfiguracionPage() {
  return (
    <main className="container space-y-6 py-6">
      <h1 className="text-2xl font-bold">Configuración</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <VoiceSelect />
        <ThemeToggle />
        <PrivacyCard />
        <ConnectedAccounts />
        <ExportDataCard />
      </div>
    </main>
  );
}

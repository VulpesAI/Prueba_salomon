'use client';
import SettingsForm from '@/components/settings/SettingsForm';

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Configuración</h1>
      <SettingsForm />
    </div>
  );
}

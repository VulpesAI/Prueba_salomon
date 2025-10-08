'use client';
import ProfileForm from '@/components/profile/ProfileForm';

export default function SettingsProfilePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Perfil</h1>
      <ProfileForm />
    </div>
  );
}

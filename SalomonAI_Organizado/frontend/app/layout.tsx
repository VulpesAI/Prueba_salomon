import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../components/AuthProvider';

export const metadata: Metadata = {
  title: 'SalomónAI Demo',
  description: 'Onboarding financiero inteligente con conexión bancaria simulada.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <main style={{ display: 'flex', justifyContent: 'center', padding: '48px 24px' }}>
            <div style={{ width: '100%', maxWidth: 960 }}>{children}</div>
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}

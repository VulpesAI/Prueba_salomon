import type { Metadata } from 'next';

import '@/styles/globals.css';

import { AppProviders } from './providers';

export const metadata: Metadata = {
  title: 'SalomonAI - Tu Asistente Financiero Inteligente',
  description:
    'Inteligencia artificial que aprende de tus hábitos financieros y te ayuda a tomar mejores decisiones',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Evita flash de tema leyendo localStorage antes de render */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
  try {
    const s = localStorage.getItem('salomon.settings');
    const t = s ? JSON.parse(s).theme : 'dark';
    if (t === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    document.documentElement.dataset.theme = t;
  } catch {}
`,
          }}
        />
      </head>
      <body className="min-h-screen bg-app text-app font-sans antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

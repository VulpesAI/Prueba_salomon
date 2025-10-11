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
        <AppProviders>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-[hsl(var(--card))] focus:px-4 focus:py-2 focus:text-[hsl(var(--foreground))] focus:shadow focus:outline-none focus:ring-2 focus:ring-[color:color-mix(in_srgb,hsl(var(--accent))_45%,transparent)] focus:ring-offset-2 focus:ring-offset-[hsl(var(--background))]"
          >
            Saltar al contenido
          </a>
          <main id="main">{children}</main>
        </AppProviders>
      </body>
    </html>
  );
}

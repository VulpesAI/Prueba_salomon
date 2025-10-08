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
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  try {
    var raw = localStorage.getItem('salomonai:settings');
    var theme = raw ? JSON.parse(raw).theme : 'dark';
    if (theme === 'dark') { document.documentElement.classList.add('dark'); }
    else { document.documentElement.classList.remove('dark'); }
  } catch(e) { document.documentElement.classList.add('dark'); }
})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-app text-app font-sans antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "@/styles/globals.css";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/context/AuthContext";
import { SyncProvider } from "@/context/SyncContext";

export const metadata: Metadata = {
  title: "SalomonAI - Tu Asistente Financiero Inteligente",
  description: "Inteligencia artificial que aprende de tus hábitos financieros y te ayuda a tomar mejores decisiones",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="font-sans antialiased bg-background text-foreground">
        <AuthProvider>
          <ThemeProvider defaultTheme="system">
            <SyncProvider>{children}</SyncProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
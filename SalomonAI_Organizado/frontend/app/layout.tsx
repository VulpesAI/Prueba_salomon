import type { Metadata } from "next"
import "./globals.css"
import { AppProviders } from "@/components/providers/app-providers"

export const metadata: Metadata = {
  title: "SalomonAI - Tu Asistente Financiero Inteligente",
  description:
    "Inteligencia artificial que aprende de tus hábitos financieros y te ayuda a tomar mejores decisiones",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="dark">
      <body className="font-sans antialiased bg-background text-foreground">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}

"use client"

import '@/styles/globals.css'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { cn } from '@/lib/utils'

export default function RootLayoutClient({
  children,
  fonts
}: {
  children: React.ReactNode
  fonts: { inter: { className: string } }
}) {
  return (
    <html lang="es" suppressHydrationWarning className="dark">
      <body className={cn(fonts.inter.className, 'bg-background')}>
        <ThemeProvider defaultTheme="dark">
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

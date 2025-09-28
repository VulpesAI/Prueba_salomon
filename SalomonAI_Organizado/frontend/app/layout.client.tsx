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
    <html lang="es" suppressHydrationWarning>
      <body className={cn(fonts.inter.className, 'bg-background')}>
        <ThemeProvider defaultTheme="system">
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

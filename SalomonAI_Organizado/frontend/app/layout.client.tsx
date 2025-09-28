"use client"

import '@/styles/globals.css'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { cn } from '@/lib/utils'

export default function RootLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={cn('font-sans', 'bg-background')}>
        <ThemeProvider defaultTheme="system">
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

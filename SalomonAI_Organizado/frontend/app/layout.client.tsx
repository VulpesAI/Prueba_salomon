"use client"

import '@/styles/globals.css'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { SyncProvider } from '@/context/SyncContext'
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
          <SyncProvider>
            {children}
          </SyncProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

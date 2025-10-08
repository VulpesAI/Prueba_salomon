'use client'

import '@/styles/globals.css'

import { AppProviders } from './providers'
import { cn } from '@/lib/utils'

type RootLayoutClientProps = {
  children: React.ReactNode
  fonts: { inter: { className: string } }
}

export default function RootLayoutClient({ children, fonts }: RootLayoutClientProps) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={cn(fonts.inter.className, 'bg-background text-foreground')}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}

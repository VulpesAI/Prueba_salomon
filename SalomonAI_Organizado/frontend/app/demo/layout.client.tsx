'use client';

import { useState } from 'react'
import type { ReactNode } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { DemoFinancialDataProvider } from '@/context/DemoFinancialDataContext'
import { ReactQueryDevtools } from '@/components/react-query-devtools'

type DemoLayoutClientProps = {
  children: ReactNode
}

export default function DemoLayoutClient({ children }: DemoLayoutClientProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <DemoFinancialDataProvider>{children}</DemoFinancialDataProvider>
      {process.env.NODE_ENV === 'development' ? <ReactQueryDevtools /> : null}
    </QueryClientProvider>
  )
}

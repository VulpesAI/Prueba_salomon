"use client"

import { useState } from "react"

import {
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
  type DehydratedState,
} from "@tanstack/react-query"

import { AuthenticatedShell } from "@/components/authenticated/authenticated-shell"
import {
  DemoFinancialDataProvider,
  IS_DEMO_MODE,
} from "@/context/DemoFinancialDataContext"
import { ReactQueryDevtools } from "@/components/react-query-devtools"

type AuthenticatedLayoutClientProps = {
  children: React.ReactNode
  dehydratedState?: DehydratedState
}

export default function AuthenticatedLayoutClient({
  children,
  dehydratedState,
}: AuthenticatedLayoutClientProps) {
  const [queryClient] = useState(() =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60_000,
          retry: (failureCount, error) => {
            const status = (error as { response?: { status?: number } } | undefined)?.response?.status
            if (status === 401) {
              return false
            }
            return failureCount < 3
          },
          refetchOnWindowFocus: false,
          refetchOnReconnect: true,
        },
        mutations: {
          retry: 1,
        },
      },
    })
  )

  const [state] = useState(() => dehydratedState)

  const shell = <AuthenticatedShell>{children}</AuthenticatedShell>

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={state}>
        {IS_DEMO_MODE ? (
          <DemoFinancialDataProvider>{shell}</DemoFinancialDataProvider>
        ) : (
          shell
        )}
      </HydrationBoundary>
      {process.env.NODE_ENV === "development" ? <ReactQueryDevtools /> : null}
    </QueryClientProvider>
  )
}

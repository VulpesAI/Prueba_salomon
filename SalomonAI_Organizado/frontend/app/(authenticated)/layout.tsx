"use client"

import { useMemo, useState, type ReactNode } from "react"
import { HydrationBoundary, QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { AuthenticatedShell } from "@/components/authenticated/authenticated-shell"
import { ReactQueryDevtools } from "@/components/react-query-devtools"

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 1,
      },
    },
  })

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient)
  const devtoolsEnabled = useMemo(
    () => process.env.NODE_ENV !== "production",
    []
  )

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary>
        <AuthenticatedShell>{children}</AuthenticatedShell>
      </HydrationBoundary>
      {devtoolsEnabled ? <ReactQueryDevtools /> : null}
    </QueryClientProvider>
  )
}

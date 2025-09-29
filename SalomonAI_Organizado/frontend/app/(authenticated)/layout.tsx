"use client"

import { useEffect, useState, type ReactNode } from "react"
import {
  Hydrate,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"

import { AuthenticatedShell } from "@/components/authenticated/authenticated-shell"
import { setApiClientQueryClientGetter } from "@/lib/api-client"

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 1,
      },
    },
  })

type AuthenticatedLayoutProps = {
  children: ReactNode
}

export default function AuthenticatedLayout({
  children,
}: AuthenticatedLayoutProps) {
  const [queryClient] = useState(createQueryClient)

  useEffect(() => {
    setApiClientQueryClientGetter(() => queryClient)

    return () => {
      setApiClientQueryClientGetter(null)
    }
  }, [queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      <Hydrate state={undefined}>
        <AuthenticatedShell>{children}</AuthenticatedShell>
      </Hydrate>
    </QueryClientProvider>
  )
}

"use client"

import { useState } from "react"
import { QueryClient, QueryClientProvider, type QueryClientConfig } from "@tanstack/react-query"

const defaultConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60_000,
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
}

type QueryProviderProps = {
  children: React.ReactNode
  config?: QueryClientConfig
}

export function QueryProvider({ children, config }: QueryProviderProps) {
  const [client] = useState(
    () =>
      new QueryClient({
        ...defaultConfig,
        ...config,
        defaultOptions: {
          ...defaultConfig.defaultOptions,
          ...config?.defaultOptions,
          queries: {
            ...defaultConfig.defaultOptions?.queries,
            ...config?.defaultOptions?.queries,
          },
          mutations: {
            ...defaultConfig.defaultOptions?.mutations,
            ...config?.defaultOptions?.mutations,
          },
        },
      })
  )

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

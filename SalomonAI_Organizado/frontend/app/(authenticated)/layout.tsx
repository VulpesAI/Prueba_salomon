import type { ReactNode } from "react"

import { dehydrate, QueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/config/query-keys"
import AuthenticatedLayoutClient from "./layout.client"
import { getDashboardOverview } from "@/services/dashboard"

export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode
}) {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: queryKeys.dashboard.overview(),
    queryFn: ({ signal }) => getDashboardOverview({ signal }),
    staleTime: 60_000,
  })

  const dehydratedState = dehydrate(queryClient)

  return (
    <AuthenticatedLayoutClient dehydratedState={dehydratedState}>
      {children}
    </AuthenticatedLayoutClient>
  )
}

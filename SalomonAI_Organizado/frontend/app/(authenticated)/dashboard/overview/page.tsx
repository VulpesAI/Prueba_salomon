import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query"

import { queryKeys } from "@/config/query-keys"
import { getDashboardOverview } from "@/services/dashboard"

import DashboardOverviewClient from "./dashboard-overview-client"

export default async function DashboardOverviewPage() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: queryKeys.dashboard.overview,
    queryFn: () => getDashboardOverview(),
  })

  const dehydratedState = dehydrate(queryClient)

  return (
    <HydrationBoundary state={dehydratedState}>
      <DashboardOverviewClient />
    </HydrationBoundary>
  )
}

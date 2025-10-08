import { useInfiniteQuery } from "@tanstack/react-query"

import type { MovementsPage } from "@/types/movements"

export interface Filters {
  from?: string
  to?: string
  category?: string
  q?: string
}

const DEFAULT_LIMIT = 30

type FetchArgs = {
  pageParam?: string
  filters: Filters
}

async function fetchPage({ pageParam, filters }: FetchArgs): Promise<MovementsPage> {
  const params = new URLSearchParams()
  if (filters.from) params.set("from", filters.from)
  if (filters.to) params.set("to", filters.to)
  if (filters.category) params.set("category", filters.category)
  if (filters.q) params.set("q", filters.q)
  if (pageParam) params.set("cursor", pageParam)
  params.set("limit", DEFAULT_LIMIT.toString())

  const response = await fetch(`/api/movements?${params.toString()}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("Error al cargar movimientos")
  }

  return response.json()
}

export function useMovementsInfinite(filters: Filters) {
  return useInfiniteQuery({
    queryKey: ["movements", filters],
    queryFn: ({ pageParam }) => fetchPage({ pageParam, filters }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined,
    staleTime: 30_000,
  })
}

export { fetchPage as __privateFetchMovementsPage }

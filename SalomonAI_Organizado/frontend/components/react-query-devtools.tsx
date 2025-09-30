"use client"

import { useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

const formatTimestamp = (timestamp: number) => {
  if (!timestamp) {
    return "nunca"
  }

  return new Date(timestamp).toLocaleTimeString()
}

type QueryLike = {
  queryHash: string
  queryKey: unknown
  state: {
    status: string
    fetchStatus: string
    dataUpdatedAt: number
  }
  getObserversCount?: () => number
}

const summarizeQueries = (queries: QueryLike[]) =>
  queries.map((query) => ({
    queryHash: query.queryHash,
    queryKey: JSON.stringify(query.queryKey),
    status: query.state.status,
    fetchStatus: query.state.fetchStatus,
    observers: query.getObserversCount?.() ?? 0,
    updatedAt: query.state.dataUpdatedAt,
  }))

export function ReactQueryDevtools() {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [summary, setSummary] = useState(() => summarizeQueries([]))

  const toggle = () => setIsOpen((previous) => !previous)

  useEffect(() => {
    const extract = () => {
      const allQueries = queryClient.getQueryCache().findAll()
      setSummary(summarizeQueries(allQueries))
    }

    extract()

    const unsubscribe = queryClient.getQueryCache().subscribe(extract)

    return () => {
      unsubscribe()
    }
  }, [queryClient])

  const pendingCount = useMemo(
    () => summary.filter((query) => query.status === "pending").length,
    [summary]
  )

  if (typeof window === "undefined") {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-[1000] flex flex-col items-end gap-2 text-xs">
      <button
        type="button"
        onClick={toggle}
        className="rounded-md border border-border bg-background px-3 py-1 shadow-sm transition hover:bg-muted"
        aria-expanded={isOpen}
        aria-label="Abrir panel de React Query"
      >
        React Query · {summary.length} consultas
        {pendingCount > 0 ? ` · ${pendingCount} pendientes` : ""}
      </button>
      {isOpen ? (
        <div className="max-h-80 w-80 overflow-y-auto rounded-lg border border-border bg-background p-3 shadow-xl">
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Estado de consultas
          </p>
          {summary.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin consultas registradas.</p>
          ) : (
            <ul className="space-y-2">
              {summary.map((query) => (
                <li key={query.queryHash} className="rounded-md bg-muted/40 p-2">
                  <p className="break-all font-medium">{query.queryKey}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Estado: {query.status} · Fetch: {query.fetchStatus} · Observadores: {query.observers}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Actualizado: {formatTimestamp(query.updatedAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}

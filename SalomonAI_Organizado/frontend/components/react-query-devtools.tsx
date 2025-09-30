"use client"

import { useMemo, useState } from "react"

import { useQueryClient } from "@tanstack/react-query"

const panelStyles =
  "fixed bottom-4 right-4 z-50 w-80 rounded-lg border border-border bg-background/95 shadow-lg backdrop-blur p-4"

const headerStyles = "mb-2 flex items-center justify-between text-sm font-medium"

const listStyles = "max-h-64 overflow-auto space-y-2 text-xs"

export function ReactQueryDevtools() {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)

  const queriesSnapshot = useMemo(() => {
    const queries = queryClient.getQueryCache().findAll()

    return queries.map((query) => ({
      queryHash: query.queryHash,
      queryKey: query.queryKey,
      state: query.state,
    }))
  }, [queryClient])

  if (process.env.NODE_ENV !== "development") {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="rounded-md border border-border bg-background/80 px-3 py-1 text-xs font-medium shadow-sm backdrop-blur transition hover:bg-background"
      >
        React Query Devtools
      </button>
      {isOpen ? (
        <div className={panelStyles}>
          <div className={headerStyles}>
            <span>Queries en caché</span>
            <span className="text-muted-foreground">{queriesSnapshot.length}</span>
          </div>
          <div className={listStyles}>
            {queriesSnapshot.length === 0 ? (
              <p className="text-muted-foreground">No hay consultas registradas</p>
            ) : (
              queriesSnapshot.map((query) => (
                <div key={query.queryHash} className="rounded border border-border/60 p-2">
                  <p className="font-semibold">{JSON.stringify(query.queryKey)}</p>
                  <p className="text-muted-foreground">
                    Estado: {query.state.status} | Fetch: {query.state.fetchStatus}
                  </p>
                  {query.state.error ? (
                    <p className="mt-1 text-destructive">
                      Error: {query.state.error instanceof Error
                        ? query.state.error.message
                        : String(query.state.error)}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

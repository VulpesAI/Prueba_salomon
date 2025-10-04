"use client"

import { useMemo, useState } from "react"

import { useQueryClient } from "@tanstack/react-query"

const panelStyles =
  "fixed bottom-4 right-4 z-50 w-80 rounded-lg border border-neutral-light-border bg-neutral-light-surface/95 text-neutral-light-foreground shadow-lg backdrop-blur p-4 dark:border-neutral-dark-border dark:bg-neutral-dark-surface/95 dark:text-neutral-dark-foreground"

const headerStyles = "mb-2 flex items-center justify-between text-sm font-medium"

const listStyles = "max-h-64 overflow-auto space-y-2 text-xs"

export function ReactQueryDevtools() {
  const isDevelopment = process.env.NODE_ENV === "development"
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()

  const queriesSnapshot = useMemo(() => {
    if (!isDevelopment) {
      return []
    }

    const queries = queryClient.getQueryCache().findAll()

    return queries.map((query) => ({
      queryHash: query.queryHash,
      queryKey: query.queryKey,
      state: query.state,
    }))
  }, [isDevelopment, queryClient])

  if (!isDevelopment) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="rounded-md border border-neutral-light-border bg-neutral-light-surface/80 px-3 py-1 text-xs font-medium text-neutral-light-foreground shadow-sm backdrop-blur transition hover:bg-neutral-light-subtle dark:border-neutral-dark-border dark:bg-neutral-dark-surface/80 dark:text-neutral-dark-foreground dark:hover:bg-neutral-dark-muted"
      >
        React Query Devtools
      </button>
      {isOpen ? (
        <div className={panelStyles}>
          <div className={headerStyles}>
            <span>Queries en caché</span>
            <span className="text-neutral-light-muted-foreground dark:text-neutral-dark-muted-foreground">
              {queriesSnapshot.length}
            </span>
          </div>
          <div className={listStyles}>
            {queriesSnapshot.length === 0 ? (
              <p className="text-neutral-light-muted-foreground dark:text-neutral-dark-muted-foreground">
                No hay consultas registradas
              </p>
            ) : (
              queriesSnapshot.map((query) => (
                <div
                  key={query.queryHash}
                  className="rounded border border-neutral-light-border/60 p-2 dark:border-neutral-dark-border/60"
                >
                  <p className="font-semibold">{JSON.stringify(query.queryKey)}</p>
                  <p className="text-neutral-light-muted-foreground dark:text-neutral-dark-muted-foreground">
                    Estado: {query.state.status} | Fetch: {query.state.fetchStatus}
                  </p>
                  {query.state.error ? (
                    <p className="mt-1 text-error">
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

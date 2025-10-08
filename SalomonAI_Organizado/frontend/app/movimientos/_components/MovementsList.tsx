"use client"

import { useEffect, useRef } from "react"

import EmptyState from "./EmptyState"
import FooterLoader from "./FooterLoader"
import MovementItem from "./MovementItem"
import type { Filters } from "@/lib/hooks/useMovementsInfinite"
import { useMovementsInfinite } from "@/lib/hooks/useMovementsInfinite"

interface Props {
  filters: Filters
}

export default function MovementsList({ filters }: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status, error, refetch } =
    useMovementsInfinite(filters)

  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const element = sentinelRef.current
    if (!element) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
            fetchNextPage()
          }
        })
      },
      { rootMargin: "200px" }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  if (status === "pending") {
    return <div className="py-8 text-center" aria-live="polite">Cargando…</div>
  }

  if (status === "error") {
    return (
      <div className="py-8 text-center space-y-3" role="alert" aria-live="assertive">
        <p className="text-red-600">Error: {(error as Error).message}</p>
        <button type="button" className="btn-secondary" onClick={() => refetch()}>
          Reintentar
        </button>
      </div>
    )
  }

  const items = data?.pages.flatMap((page) => page.items) ?? []

  if (items.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-1" role="list">
      {items.map((movement) => (
        <MovementItem key={movement.id} movement={movement} />
      ))}
      <div ref={sentinelRef} aria-hidden />
      <FooterLoader hasNextPage={Boolean(hasNextPage)} isFetchingNextPage={isFetchingNextPage} />
    </div>
  )
}

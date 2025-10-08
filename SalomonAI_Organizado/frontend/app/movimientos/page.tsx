"use client"

import { useCallback, useState } from "react"

import MovementsList from "./_components/MovementsList"
import MovementsToolbar from "./_components/MovementsToolbar"
import type { Filters } from "@/lib/hooks/useMovementsInfinite"

export default function MovimientosPage() {
  const [filters, setFilters] = useState<Filters>({})

  const handleChange = useCallback((next: Filters) => {
    setFilters(next)
  }, [])

  const handleReset = useCallback(() => {
    setFilters({})
  }, [])

  return (
    <main className="container py-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Movimientos</h1>
        <p className="text-sm text-muted-foreground">
          Filtra tus transacciones por fecha, categoría o palabras clave y navega por tu historial
          completo.
        </p>
      </header>
      <MovementsToolbar value={filters} onChange={handleChange} onReset={handleReset} />
      <section aria-label="Lista de movimientos">
        <MovementsList filters={filters} />
      </section>
    </main>
  )
}

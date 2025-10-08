"use client"

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"

import { MOVEMENT_CATEGORY_OPTIONS } from "@/lib/adapters/movements"
import type { Filters } from "@/lib/hooks/useMovementsInfinite"

interface Props {
  value: Filters
  onChange: (value: Filters) => void
  onReset: () => void
}

export default function MovementsToolbar({ value, onChange, onReset }: Props) {
  const [local, setLocal] = useState<Filters>(value)
  const debounceRef = useRef<number | null>(null)

  useEffect(() => {
    setLocal(value)
  }, [value])

  useEffect(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
    }
    debounceRef.current = window.setTimeout(() => {
      onChange(local)
    }, 300)

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current)
      }
    }
  }, [local, onChange])

  const hasActiveFilters = useMemo(
    () => Boolean(local.from || local.to || local.category || local.q),
    [local.category, local.from, local.q, local.to]
  )

  const handleReset = () => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
    }
    setLocal({})
    onReset()
  }

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current)
      }
      onChange(local)
    }

    if (event.key === "Escape") {
      event.preventDefault()
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current)
      }
      const next = { ...local, q: undefined }
      setLocal(next)
      onChange(next)
    }
  }

  const fromId = "movements-filter-from"
  const toId = "movements-filter-to"
  const categoryId = "movements-filter-category"
  const searchId = "movements-filter-search"

  return (
    <form
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end"
      aria-label="Filtros de movimientos"
      onSubmit={(event) => event.preventDefault()}
      noValidate
    >
      <label htmlFor={fromId} className="flex flex-col gap-1">
        <span className="text-sm font-medium text-muted-foreground">Desde</span>
        <input
          id={fromId}
          name="from"
          type="date"
          value={local.from ?? ""}
          onChange={(event) =>
            setLocal((current) => ({ ...current, from: event.target.value || undefined }))
          }
          className="input"
        />
      </label>
      <label htmlFor={toId} className="flex flex-col gap-1">
        <span className="text-sm font-medium text-muted-foreground">Hasta</span>
        <input
          id={toId}
          name="to"
          type="date"
          value={local.to ?? ""}
          onChange={(event) =>
            setLocal((current) => ({ ...current, to: event.target.value || undefined }))
          }
          className="input"
        />
      </label>
      <label htmlFor={categoryId} className="flex flex-col gap-1">
        <span className="text-sm font-medium text-muted-foreground">Categoría</span>
        <select
          id={categoryId}
          name="category"
          value={local.category ?? ""}
          onChange={(event) =>
            setLocal((current) => ({ ...current, category: event.target.value || undefined }))
          }
          className="input"
        >
          <option value="">Todas</option>
          {MOVEMENT_CATEGORY_OPTIONS.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-col gap-1">
        <label htmlFor={searchId} className="text-sm font-medium text-muted-foreground">
          Buscar
        </label>
        <div className="flex gap-2">
          <input
            id={searchId}
            name="search"
            type="search"
            placeholder="Buscar comercio o nota"
            value={local.q ?? ""}
            onChange={(event) =>
              setLocal((current) => ({ ...current, q: event.target.value || undefined }))
            }
            onKeyDown={handleSearchKeyDown}
            className="input flex-1"
            aria-describedby="movements-filter-help"
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={handleReset}
            disabled={!hasActiveFilters}
            aria-label="Restablecer filtros"
          >
            Restablecer
          </button>
        </div>
        <span id="movements-filter-help" className="text-xs text-muted-foreground">
          Presiona Enter para aplicar búsqueda o Esc para limpiar.
        </span>
      </div>
    </form>
  )
}

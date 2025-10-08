"use client"

import { getCategoryLabel } from "@/lib/adapters/movements"
import { formatCLP } from "@/lib/utils/currency"
import { formatShortDate } from "@/lib/utils/date"
import type { Movement } from "@/types/movements"

interface Props {
  movement: Movement
}

export default function MovementItem({ movement }: Props) {
  const isIncome = movement.type === "INCOME"
  const amountPrefix = isIncome ? "+" : "-"

  return (
    <div
      role="listitem"
      tabIndex={0}
      className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2 odd:bg-muted/30 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-md transition-colors"
    >
      <div className="text-sm text-muted-foreground" aria-label="Fecha del movimiento">
        {formatShortDate(movement.occurred_at)}
      </div>
      <div className="min-w-0">
        <div className="truncate font-medium" aria-label="Comercio">
          {movement.merchant}
        </div>
        <span
          className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
          aria-label={`Categoría ${getCategoryLabel(movement.category)}`}
        >
          {getCategoryLabel(movement.category)}
        </span>
      </div>
      <div
        className={`font-semibold tabular-nums text-right ${
          isIncome ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
        }`}
        aria-label="Monto"
      >
        {amountPrefix}
        {formatCLP(Math.abs(movement.amount))}
      </div>
    </div>
  )
}

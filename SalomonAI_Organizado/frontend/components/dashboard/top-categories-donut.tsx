"use client"

import { motion } from "framer-motion"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { CategoryItem } from "@/hooks/useDashboardOverview"
import { CategoriesDonut } from "@/components/charts/CategoriesDonut"
import { formatCLP } from "@/lib/formatters"
import { getCategoryColor } from "@/lib/ui/palette"

interface TopCategoriesDonutProps {
  data: CategoryItem[]
  range?: "7" | "30" | "90"
}

export function TopCategoriesDonut({ data, range = "30" }: TopCategoriesDonutProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}>
      <Card className="no-glass">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <CardTitle className="h2 text-[hsl(var(--foreground))]">Top categorías</CardTitle>
              <CardDescription className="text-[hsl(var(--muted-foreground))]">
                Distribución de gastos principales.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="shrink-0">
              Últimos {range} días
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="mx-auto w-full max-w-sm">
            <CategoriesDonut data={data} />
          </div>
          <div>
            <h3 className="caption text-[hsl(var(--muted-foreground))]">Mayores gastos</h3>
            <ul className="mt-3 space-y-3" role="list">
              {data.slice(0, 3).map((category) => {
                const color = getCategoryColor(category.name) ?? "hsl(var(--accent))"
                const safePercent = Math.min(100, Math.max(0, category.percent))
                return (
                  <li
                    key={category.name}
                    className="rounded-std border border-[color:color-mix(in_srgb,hsl(var(--border))_55%,transparent)] bg-[color:color-mix(in_srgb,hsl(var(--card))_90%,transparent)] p-4"
                    role="listitem"
                  >
                    <div className="flex items-center justify-between gap-3 text-sm font-medium text-[hsl(var(--foreground))]">
                      <span className="flex max-w-[60%] items-center gap-2 truncate" title={category.name}>
                        <span
                          aria-hidden
                          className="inline-block h-2.5 w-2.5 flex-none rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="truncate">{category.name}</span>
                      </span>
                      <span className="text-[hsl(var(--muted-foreground))]">{formatCLP(category.amount)}</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-[color:color-mix(in_srgb,hsl(var(--muted))_55%,transparent)]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${safePercent}%`, backgroundColor: color }}
                        aria-hidden
                      />
                    </div>
                    <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                      {safePercent.toFixed(1)}% del total
                    </p>
                  </li>
                )
              })}
            </ul>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

"use client"

import { motion } from "framer-motion"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { CategoryItem } from "@/hooks/useDashboardOverview"
import { CategoriesDonut } from "@/components/charts/CategoriesDonut"
import { formatCurrencyCLP } from "@/lib/formatters"
import { getCategoryColor } from "@/lib/ui/palette"

interface TopCategoriesDonutProps {
  data: CategoryItem[]
  range?: "7" | "30" | "90"
}

export function TopCategoriesDonut({ data, range = "30" }: TopCategoriesDonutProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}>
      <Card className="touch-feedback border-app-border-subtle bg-app-card">
        <CardHeader className="gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Top categorías</CardTitle>
              <CardDescription>Distribución de gastos principales.</CardDescription>
            </div>
            <Badge variant="secondary">Últimos {range} días</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 md:gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="flex flex-col justify-center">
            <CategoriesDonut data={data} />
          </div>
          <div>
            <ul className="space-y-3" role="list">
              {data.slice(0, 3).map((category) => {
                const color = getCategoryColor(category.name)
                const safePercent = Math.min(100, Math.max(0, category.percent))
                return (
                  <li key={category.name} className="touch-feedback rounded-2xl border border-app-border-subtle bg-app-surface-subtle p-4" role="listitem">
                    <div className="flex items-center justify-between text-sm font-medium text-app">
                      <span className="inline-flex max-w-[60%] items-center gap-2 truncate" title={category.name}>
                        <span
                          aria-hidden
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="truncate">{category.name}</span>
                      </span>
                      <span className="text-app-dim">{formatCurrencyCLP(category.amount)}</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-app-surface-subtle">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${safePercent}%`, backgroundColor: color }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-app-dim">{safePercent.toFixed(1)}% del total</p>
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

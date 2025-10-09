"use client"

import { motion } from "framer-motion"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Icon } from "@/components/ui/icon"
import type { Kpis } from "@/hooks/useDashboardOverview"
import { formatCurrencyCLP, formatPercentDelta } from "@/lib/formatters"
import { cn } from "@/lib/utils"

const kpiConfig = [
  {
    key: "incomeCLP" as const,
    deltaKey: "incomeDelta" as const,
    label: "Ingresos",
    tone: "positive" as const,
    icon: "TrendingUp" as const,
  },
  {
    key: "expensesCLP" as const,
    deltaKey: "expensesDelta" as const,
    label: "Gastos",
    tone: "negative" as const,
    icon: "Wallet" as const,
  },
  {
    key: "netCLP" as const,
    deltaKey: "netDelta" as const,
    label: "Flujo neto",
    tone: "positive" as const,
    icon: "Activity" as const,
  },
]

type TrendTone = "positive" | "negative"

type TrendMeta = {
  icon: "ArrowUpRight" | "ArrowDownRight" | "ArrowRight"
  className: string
}

function resolveTrend(delta: number, tone: TrendTone): TrendMeta {
  if (delta === 0) {
    return {
      icon: "ArrowRight",
      className: "text-app-dim",
    }
  }

  const isPositive = delta > 0
  const success = tone === "positive" ? isPositive : !isPositive

  return {
    icon: success ? "ArrowUpRight" : "ArrowDownRight",
    className: success ? "text-app-success" : "text-app-danger",
  }
}

interface KpiStripProps {
  kpis: Kpis
}

export function KpiStrip({ kpis }: KpiStripProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {kpiConfig.map((item, index) => {
        const value = kpis[item.key]
        const delta = kpis[item.deltaKey]
        const trend = resolveTrend(delta, item.tone)

        return (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.35, ease: "easeOut" }}
          >
            <Card className="elevated-card border-app-border-subtle bg-app-card">
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-caption">
                    <Icon name={item.icon} size="sm" aria-hidden />
                    {item.label}
                  </div>
                  <Badge variant="secondary">vs. periodo anterior</Badge>
                </div>
                <div className="flex items-end justify-between gap-4">
                  <span className="text-display leading-none">
                    {formatCurrencyCLP(value)}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full bg-app-surface-subtle px-3 py-1 text-sm font-semibold",
                      trend.className
                    )}
                    aria-live="polite"
                  >
                    <Icon name={trend.icon} size="sm" aria-hidden />
                    {formatPercentDelta(delta)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}

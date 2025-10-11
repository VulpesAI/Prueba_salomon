"use client"

import { motion } from "framer-motion"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Icon } from "@/components/ui/icon"
import type { IconName } from "@/components/ui/icon"
import type { Kpis } from "@/hooks/useDashboardOverview"
import { formatCurrencyCLP, formatPercentDelta } from "@/lib/formatters"
import { cn } from "@/lib/utils"

const kpiConfig = [
  {
    key: "incomeCLP",
    deltaKey: "incomeDelta",
    label: "Ingresos",
    tone: "positive",
    icon: "TrendingUp",
  },
  {
    key: "expensesCLP",
    deltaKey: "expensesDelta",
    label: "Gastos",
    tone: "negative",
    icon: "Wallet",
  },
  {
    key: "netCLP",
    deltaKey: "netDelta",
    label: "Flujo neto",
    tone: "positive",
    icon: "Activity",
  },
] satisfies Array<{
  key: keyof Pick<Kpis, "incomeCLP" | "expensesCLP" | "netCLP">;
  deltaKey: keyof Pick<Kpis, "incomeDelta" | "expensesDelta" | "netDelta">;
  label: string;
  tone: TrendTone;
  icon: IconName;
}>

type TrendTone = "positive" | "negative"

type TrendMeta = {
  icon: "ArrowUpRight" | "ArrowDownRight" | "ArrowRight"
  className: string
}

function resolveTrend(delta: number, tone: TrendTone): TrendMeta {
  if (delta === 0) {
    return {
      icon: "ArrowRight",
      className: "text-[hsl(var(--muted-foreground))]",
    }
  }

  const isPositive = delta > 0
  const success = tone === "positive" ? isPositive : !isPositive

  return {
    icon: success ? "ArrowUpRight" : "ArrowDownRight",
    className: success
      ? "text-[hsl(var(--success))]"
      : "text-[color:color-mix(in_srgb,hsl(var(--danger))_92%,transparent)]",
  }
}

interface KpiStripProps {
  kpis: Kpis
}

export function KpiStrip({ kpis }: KpiStripProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
            <Card className="no-glass">
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 caption text-[hsl(var(--muted-foreground))]">
                    <Icon name={item.icon} size="sm" aria-hidden />
                    {item.label}
                  </div>
                  <Badge variant="secondary">vs. periodo anterior</Badge>
                </div>
                <div className="flex items-end justify-between gap-4">
                  <span className="h1 leading-none">{formatCurrencyCLP(value)}</span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full bg-[color:color-mix(in_srgb,hsl(var(--muted))_35%,transparent)] px-3 py-1 text-sm font-semibold",
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

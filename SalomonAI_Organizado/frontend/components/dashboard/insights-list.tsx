"use client"

import { motion } from "framer-motion"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import type { Insight } from "@/hooks/useDashboardOverview"

interface InsightsListProps {
  items: Insight[]
}

export function InsightsList({ items }: InsightsListProps) {
  if (!items.length) {
    return (
      <EmptyState
        title="Sin insights por ahora"
        description="Cuando detectemos patrones relevantes, los verás aquí."
        className="h-full bg-app-card-subtle"
      />
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16, duration: 0.4 }}>
      <Card className="touch-feedback border border-app-border-subtle bg-app-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Insights accionables</CardTitle>
          <Badge variant="default">IA</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-4" role="list">
            {items.map((insight, index) => (
              <motion.li
                key={`${insight.text}-${index}`}
                role="listitem"
                className="touch-feedback rounded-2xl border border-app-border-subtle bg-app-surface-subtle px-4 py-4 text-sm text-app"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.05, duration: 0.3 }}
              >
                <p className="line-clamp-2 text-sm leading-relaxed text-app">{insight.text}</p>
                <button
                  type="button"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--accent)_45%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"
                >
                  Ver detalle
                  <span aria-hidden className="text-app">→</span>
                </button>
              </motion.li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  )
}

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
      <Card className="no-glass">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="h2 text-[hsl(var(--foreground))]">Insights accionables</CardTitle>
          <Badge variant="default">IA</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-4" role="list">
            {items.map((insight, index) => (
              <motion.li
                key={`${insight.text}-${index}`}
                role="listitem"
                className="rounded-std border border-[color:color-mix(in_srgb,hsl(var(--border))_55%,transparent)] bg-[color:color-mix(in_srgb,hsl(var(--card))_92%,transparent)] px-4 py-4 text-sm text-[hsl(var(--foreground))]"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.05, duration: 0.3 }}
              >
                <p className="line-clamp-2 text-sm leading-relaxed">{insight.text}</p>
                <button
                  type="button"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[hsl(var(--accent))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,hsl(var(--accent))_45%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]"
                >
                  Ver detalle
                  <span aria-hidden className="text-[hsl(var(--foreground))]">→</span>
                </button>
              </motion.li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  )
}

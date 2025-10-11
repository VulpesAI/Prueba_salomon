"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Icon } from "@/components/ui/icon"
import type { FluxPoint } from "@/hooks/useDashboardOverview"
import { FluxChart } from "@/components/charts/FluxChart"
import { formatDateCL } from "@/lib/formatters"
import { cn } from "@/lib/utils"

const RANGE_OPTIONS: Array<{ label: string; value: "7" | "30" | "90" }> = [
  { label: "7 días", value: "7" },
  { label: "30 días", value: "30" },
  { label: "90 días", value: "90" },
]

interface CashflowChartProps {
  data: FluxPoint[]
  range: "7" | "30" | "90"
  onRangeChange: (value: "7" | "30" | "90") => void
}

export function CashflowChart({ data, range, onRangeChange }: CashflowChartProps) {
  const [activeRange, setActiveRange] = useState(range)
  const rangeGroupRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    setActiveRange(range)
  }, [range])
  const projectionMeta = useMemo(() => {
    const projectionPoint = [...data].reverse().find((point) => point.type === "proj")
    return projectionPoint
      ? {
          model: projectionPoint.model_type,
          calculatedAt: projectionPoint.calculated_at,
        }
      : null
  }, [data])

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className="no-glass">
        <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-[hsl(var(--muted-foreground))]">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,hsl(var(--accent))_18%,transparent)] text-[hsl(var(--accent))]">
                <Icon name="ChartLine" size="lg" />
              </span>
              <CardTitle className="h2 text-[hsl(var(--foreground))]">Flujo + Proyección</CardTitle>
            </div>
            <p className="body text-[hsl(var(--muted-foreground))]">
              Histórico en área sólida, proyección punteada basada en IA financiera.
            </p>
            {projectionMeta?.calculatedAt ? (
              <Badge variant="secondary" className="w-fit">
                Actualizado {formatDateCL(projectionMeta.calculatedAt)} ·
                {" "}
                {new Date(projectionMeta.calculatedAt).toLocaleTimeString("es-CL", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
            <span className="caption text-[hsl(var(--muted-foreground))]">Rango</span>
            <div
              role="group"
              aria-label="Rango de días"
              className="inline-flex items-center gap-1 rounded-full border border-[color:color-mix(in_srgb,hsl(var(--border))_60%,transparent)] bg-[color:color-mix(in_srgb,hsl(var(--card))_82%,transparent)] p-1"
              ref={rangeGroupRef}
            >
              {RANGE_OPTIONS.map((option) => {
                const isActive = option.value === activeRange
                return (
                  <Button
                    key={`${option.value}-${isActive ? "on" : "off"}`}
                    type="button"
                    size="sm"
                    variant={isActive ? "primary" : "ghost"}
                    aria-pressed={isActive ? "true" : "false"}
                    onClick={(event) => {
                      if (!isActive) {
                        setActiveRange(option.value)
                        if (rangeGroupRef.current) {
                          rangeGroupRef.current
                            .querySelectorAll<HTMLButtonElement>("button[aria-pressed='true']")
                            .forEach((node) => {
                              if (node !== event.currentTarget) {
                                node.setAttribute("aria-pressed", "false")
                              }
                            })
                        }
                        event.currentTarget.setAttribute("aria-pressed", "true")
                        onRangeChange(option.value)
                      }
                    }}
                    className={cn(
                      "touch-target",
                      isActive
                        ? "shadow-none"
                        : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                    )}
                  >
                    {option.label}
                  </Button>
                )
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <FluxChart data={data} />
          {projectionMeta?.model ? (
            <p className="mt-4 text-xs text-[hsl(var(--muted-foreground))]">
              Proyección estimada con modelo{" "}
              <strong className="font-semibold text-[hsl(var(--foreground))]">{projectionMeta.model}</strong>.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </motion.div>
  )
}

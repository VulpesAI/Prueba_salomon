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
      <Card className="elevated-card border-app-border-subtle bg-app-card">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Icon name="LineChart" size="md" aria-hidden />
              <CardTitle>Flujo + Proyección</CardTitle>
            </div>
            <p className="text-sm text-app-dim">
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
            <span className="text-caption">Rango</span>
            <div
              role="group"
              aria-label="Rango de días"
              className="inline-flex items-center gap-1 rounded-full border border-app-border-subtle bg-app-surface-subtle p-1"
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
                    className={isActive ? "shadow-none" : "text-app-dim hover:text-app"}
                  >
                    {option.label}
                  </Button>
                )
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <FluxChart data={data} />
          {projectionMeta?.model ? (
            <p className="mt-4 text-xs text-app-dim">
              Proyección estimada con modelo <strong className="font-semibold text-app">{projectionMeta.model}</strong>.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </motion.div>
  )
}

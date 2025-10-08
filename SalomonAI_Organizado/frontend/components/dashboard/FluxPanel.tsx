"use client";

import { useMemo } from "react";

import type { FluxPoint } from "@/hooks/useDashboardOverview";

import { FluxChart } from "../charts/FluxChart";

const RANGE_OPTIONS: Array<{ label: string; value: "7" | "30" | "90" }> = [
  { label: "7 días", value: "7" },
  { label: "30 días", value: "30" },
  { label: "90 días", value: "90" },
];

type FluxPanelProps = {
  data: FluxPoint[];
  range: "7" | "30" | "90";
  onRangeChange: (value: "7" | "30" | "90") => void;
};

export function FluxPanel({ data, range, onRangeChange }: FluxPanelProps) {
  const projectionMeta = useMemo(() => {
    const projectionPoint = [...data].reverse().find((point) => point.type === "proj");
    return projectionPoint
      ? {
          model: projectionPoint.model_type,
          calculatedAt: projectionPoint.calculated_at,
        }
      : null;
  }, [data]);

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Flujo + Proyección</h3>
          {projectionMeta?.calculatedAt ? (
            <p className="text-xs text-muted-foreground">
              Actualizado el {new Date(projectionMeta.calculatedAt).toLocaleString("es-CL")}
              {projectionMeta.model ? ` · Modelo ${projectionMeta.model}` : ""}
            </p>
          ) : null}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="opacity-80">Rango:</span>
          <select
            className="rounded border bg-background px-2 py-1"
            value={range}
            onChange={(event) => onRangeChange(event.target.value as "7" | "30" | "90")}
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-4">
        <FluxChart data={data} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Histórico en área sólida, proyección punteada.</p>
    </div>
  );
}

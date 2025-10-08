'use client';

import { useMemo } from 'react';
import {
  Area,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from 'recharts';

import { formatDateShort } from '@/lib/utils/date';
import { ForecastResponse } from '@/types/forecasts';

interface ChartRow {
  ts: string;
  label: string;
  hist: number | null;
  fcst: number | null;
  lower: number | null;
  range: number | null;
}

const SERIES_LABELS: Record<string, string> = {
  hist: 'Histórico',
  fcst: 'Proyección',
};

export default function ForecastChart({ data }: { data: ForecastResponse }) {
  const rows = useMemo<ChartRow[]>(
    () =>
      data.points.map((point) => {
        const isForecast = point.kind === 'FCST';
        const lower = isForecast && point.lo != null ? point.lo : null;
        const upper = isForecast && point.hi != null ? point.hi : null;

        return {
          ts: point.ts,
          label: formatDateShort(point.ts),
          hist: point.kind === 'HIST' ? point.value : null,
          fcst: isForecast ? point.value : null,
          lower,
          range:
            lower != null && upper != null ? Math.max(upper - lower, 0) : null,
        };
      }),
    [data.points],
  );

  return (
    <section className="h-80 rounded-card border border-soft bg-gradient-card p-3 text-surface">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 12, right: 16, bottom: 12, left: 8 }}>
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            minTickGap={24}
            tick={{ fill: 'var(--chart-axis)', fontSize: 12 }}
            tickLine={{ stroke: 'var(--chart-axis)', strokeWidth: 0.5 }}
            axisLine={{ stroke: 'var(--chart-axis)', strokeWidth: 0.5 }}
          />
          <YAxis
            width={72}
            tickFormatter={(value) => value.toLocaleString('es-CL')}
            tick={{ fill: 'var(--chart-axis)', fontSize: 12 }}
            tickLine={{ stroke: 'var(--chart-axis)', strokeWidth: 0.5 }}
            axisLine={{ stroke: 'var(--chart-axis)', strokeWidth: 0.5 }}
          />
          <Tooltip content={<TooltipContent />} />
          <Area
            type="monotone"
            dataKey="lower"
            stackId="uncertainty"
            strokeOpacity={0}
            fillOpacity={0}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="range"
            stackId="uncertainty"
            strokeOpacity={0}
            fill="var(--chart-series-1)"
            fillOpacity={0.12}
          />
          <Line type="monotone" dataKey="hist" dot={false} stroke="var(--chart-series-1)" strokeWidth={2} />
          <Line
            type="monotone"
            dataKey="fcst"
            strokeDasharray="4 4"
            dot={false}
            stroke="var(--chart-series-2)"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}

function TooltipContent(props: TooltipProps<number, string>) {
  const { active, label, payload } = props;

  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const formatted = payload
    .filter((item) => item.dataKey === 'hist' || item.dataKey === 'fcst')
    .map((item) => ({
      key: item.dataKey ?? item.name,
      name: SERIES_LABELS[item.dataKey ?? ''] ?? item.name,
      value:
        typeof item.value === 'number'
          ? item.value.toLocaleString('es-CL')
          : '—',
    }));

  if (formatted.length === 0) {
    return null;
  }

  return (
    <div className="rounded-card border border-soft bg-gradient-card px-3 py-2 text-sm text-surface shadow-md backdrop-blur">
      <div className="mb-1 text-xs font-medium text-muted">{label}</div>
      <ul className="space-y-1">
        {formatted.map((item) => (
          <li key={item.key} className="flex items-center justify-between gap-4 text-surface">
            <span className="capitalize text-muted">{item.name}</span>
            <span className="font-medium tabular-nums text-surface">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

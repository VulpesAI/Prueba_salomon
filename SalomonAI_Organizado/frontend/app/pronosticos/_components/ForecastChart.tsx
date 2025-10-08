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
    <div className="h-80 rounded-xl border p-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 12, right: 16, bottom: 12, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
          <XAxis dataKey="label" minTickGap={24} />
          <YAxis width={72} tickFormatter={(value) => value.toLocaleString('es-CL')} />
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
            fillOpacity={0.15}
          />
          <Line type="monotone" dataKey="hist" dot={false} strokeWidth={2} />
          <Line
            type="monotone"
            dataKey="fcst"
            strokeDasharray="4 4"
            dot={false}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
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
    <div className="rounded-md border bg-popover/95 px-3 py-2 text-sm text-popover-foreground shadow-md backdrop-blur">
      <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
      <ul className="space-y-1">
        {formatted.map((item) => (
          <li key={item.key} className="flex items-center justify-between gap-4">
            <span className="capitalize text-muted-foreground">{item.name}</span>
            <span className="font-medium tabular-nums">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

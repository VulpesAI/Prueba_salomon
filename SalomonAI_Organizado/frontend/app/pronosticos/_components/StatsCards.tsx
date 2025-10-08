import { ForecastResponse } from '@/types/forecasts';
import { statsOf } from '@/lib/utils/stats';

export default function StatsCards({ data }: { data: ForecastResponse }) {
  const values = data.points.map((point) => point.value);
  const { min, max, avg } = statsOf(values);

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Stat label="Mínimo" value={min} />
      <Stat label="Promedio" value={avg} />
      <Stat label="Máximo" value={max} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  const text = Number.isFinite(value) ? value.toLocaleString('es-CL') : '—';

  return (
    <div className="rounded-xl border p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{text}</div>
    </div>
  );
}

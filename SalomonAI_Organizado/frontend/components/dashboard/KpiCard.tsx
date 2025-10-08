import { formatCLP, formatPercent } from "@/lib/currency";

export type Kind = "ingresos" | "gastos" | "neto";

function kpiColors(kind: Kind, delta: number) {
  const neutral = "text-muted-foreground";
  const green = "text-emerald-500";
  const red = "text-red-500";

  const amount =
    kind === "ingresos"
      ? "text-emerald-500"
      : kind === "gastos"
        ? "text-red-500"
        : "text-foreground";

  let pct = neutral;
  if (kind === "ingresos") {
    pct = delta > 0 ? green : delta < 0 ? red : neutral;
  } else if (kind === "gastos") {
    pct = delta > 0 ? red : delta < 0 ? green : neutral;
  } else {
    pct = delta > 0 ? green : delta < 0 ? red : neutral;
  }

  const arrow = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";

  return { amount, pct, arrow };
}

type KpiCardProps = {
  kind: Kind;
  label: string;
  value: number;
  delta: number;
};

export function KpiCard({ kind, label, value, delta }: KpiCardProps) {
  const { amount, pct, arrow } = kpiColors(kind, delta);

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${amount}`}>{formatCLP(value)}</div>
      <div className={`mt-2 text-xs font-medium ${pct}`}>
        {arrow} {formatPercent(delta)}
      </div>
    </div>
  );
}

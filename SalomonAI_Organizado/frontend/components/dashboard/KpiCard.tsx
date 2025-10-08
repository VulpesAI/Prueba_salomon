import { formatPercent } from "@/lib/currency";

type KpiCardProps = {
  label: string;
  value: string;
  delta: number;
};

export function KpiCard({ label, value, delta }: KpiCardProps) {
  const sign = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";
  const color =
    delta > 0 ? "text-emerald-500" : delta < 0 ? "text-red-500" : "text-zinc-400 dark:text-zinc-500";

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-foreground">{value}</div>
      <div className={`mt-2 text-xs font-medium ${color}`}>
        {sign} {formatPercent(delta)}
      </div>
    </div>
  );
}

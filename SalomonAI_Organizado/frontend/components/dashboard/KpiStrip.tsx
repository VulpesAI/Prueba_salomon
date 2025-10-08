import type { Kpis } from "@/hooks/useDashboardOverview";
import { formatCLP } from "@/lib/currency";

import { KpiCard } from "./KpiCard";

type KpiStripProps = {
  kpis: Kpis;
};

export function KpiStrip({ kpis }: KpiStripProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <KpiCard label="Ingresos" value={formatCLP(kpis.incomeCLP)} delta={kpis.incomeDelta} />
      <KpiCard label="Gastos" value={formatCLP(kpis.expensesCLP)} delta={kpis.expensesDelta} />
      <KpiCard label="Flujo neto" value={formatCLP(kpis.netCLP)} delta={kpis.netDelta} />
    </div>
  );
}

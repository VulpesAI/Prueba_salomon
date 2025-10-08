import type { Kpis } from "@/hooks/useDashboardOverview";

import { KpiCard } from "./KpiCard";

type KpiStripProps = {
  kpis: Kpis;
};

export function KpiStrip({ kpis }: KpiStripProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <KpiCard kind="ingresos" label="Ingresos" value={kpis.incomeCLP} delta={kpis.incomeDelta} />
      <KpiCard kind="gastos" label="Gastos" value={kpis.expensesCLP} delta={kpis.expensesDelta} />
      <KpiCard kind="neto" label="Flujo neto" value={kpis.netCLP} delta={kpis.netDelta} />
    </div>
  );
}

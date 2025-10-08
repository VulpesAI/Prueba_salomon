"use client";

import { useResumen } from "@/lib/hooks";

const currency = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export function HeaderResumen() {
  const resumen = useResumen();

  if (resumen.isPending) {
    return <span className="text-xs text-muted-foreground">Cargando…</span>;
  }

  if (resumen.isError || !resumen.data) {
    return (
      <button
        type="button"
        onClick={() => resumen.refetch()}
        className="text-xs text-destructive underline-offset-2 hover:underline"
      >
        Reintentar resumen
      </button>
    );
  }

  const { income_total, expense_total, net_cashflow } = resumen.data;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground md:text-sm">
      <span>Ingresos: {currency.format(income_total)}</span>
      <span>Gastos: {currency.format(expense_total)}</span>
      <span>Flujo: {currency.format(net_cashflow)}</span>
    </div>
  );
}

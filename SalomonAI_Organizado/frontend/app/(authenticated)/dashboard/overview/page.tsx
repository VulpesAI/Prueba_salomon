"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardProyeccion, useDashboardResumen } from "@/lib/hooks";

const currencyFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export default function DashboardOverviewPage() {
  const resumen = useDashboardResumen();
  const proyeccion = useDashboardProyeccion();

  const isLoading = resumen.isPending || proyeccion.isPending;
  const isError = resumen.isError || proyeccion.isError;

  const projectionSeries = useMemo(() => {
    if (!proyeccion.data) return [];
    return proyeccion.data.series.map((item) => ({
      date: new Date(item.date).toLocaleDateString("es-CL", {
        month: "short",
        day: "numeric",
      }),
      value: item.value,
    }));
  }, [proyeccion.data]);

  if (isLoading) {
    return (
      <div className="grid gap-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">No fue posible cargar los datos del dashboard.</p>
        <Button onClick={() => {
          resumen.refetch();
          proyeccion.refetch();
        }}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (!resumen.data || !proyeccion.data) {
    return <p>No hay datos disponibles para tu dashboard todavía.</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Resumen financiero</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Ingresos" value={resumen.data.income_total} />
          <Metric label="Gastos" value={resumen.data.expense_total} />
          <Metric label="Flujo neto" value={resumen.data.net_cashflow} />
          <div className="rounded-md border p-4">
            <p className="text-sm font-medium">Categorías principales</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {resumen.data.top_categories.map((category) => (
                <li key={category.name} className="flex items-center justify-between">
                  <span>{category.name}</span>
                  <span>{currencyFormatter.format(category.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Proyección ({proyeccion.data.model_type})</CardTitle>
          <p className="text-sm text-muted-foreground">
            Actualizado el {new Date(proyeccion.data.calculated_at).toLocaleString("es-CL")}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <ul className="space-y-1 text-sm">
              {projectionSeries.map((point) => (
                <li key={point.date} className="flex items-center justify-between border-b py-1">
                  <span>{point.date}</span>
                  <span>{currencyFormatter.format(point.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">
        {currencyFormatter.format(value)}
      </p>
    </div>
  );
}

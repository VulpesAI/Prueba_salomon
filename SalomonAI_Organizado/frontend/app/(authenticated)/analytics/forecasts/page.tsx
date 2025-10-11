"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useForecast } from "@/lib/hooks";

const USER_ID_STORAGE_KEY = "current_user_id";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
  });

export default function AnalyticsForecastsPage() {
  const userId = useMemo(() => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem(USER_ID_STORAGE_KEY) ?? "";
  }, []);

  const forecast = useForecast(userId, 30);

  const chartData = useMemo(() => {
    if (!forecast.data?.series) return [];
    return forecast.data.series.map((point) => ({
      ...point,
      label: formatDate(point.date),
    }));
  }, [forecast.data?.series]);

  if (!userId) {
    return <p className="text-sm text-muted-foreground">Conéctate para ver tu proyección de saldo.</p>;
  }

  if (forecast.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (forecast.isError) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">No se pudo cargar el pronóstico financiero.</p>
        <Button size="sm" onClick={() => forecast.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (!forecast.data || chartData.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay datos de pronóstico para este período.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Pronóstico financiero</h1>
        <p className="text-sm text-muted-foreground">
          Visualiza la proyección de tu saldo para los próximos 30 días basada en el modelo {forecast.data.model_type}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Proyección de saldo</CardTitle>
          <CardDescription>
            Actualizado el {new Date(forecast.data.calculated_at).toLocaleString("es-CL")}
          </CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="4 4" />
              <XAxis dataKey="label" minTickGap={24} tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <YAxis
                tickFormatter={(value) => formatCurrency(Number(value)).replace(/\$|CLP\s?/g, "")}
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label: string, payload) => {
                  const point = payload?.[0]?.payload;
                  return point ? new Date(point.date).toLocaleDateString("es-CL", { dateStyle: "full" }) : label;
                }}
                contentStyle={{
                  background: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "0.75rem",
                  color: "hsl(var(--foreground))",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                itemStyle={{ color: "hsl(var(--foreground))" }}
                wrapperStyle={{ outline: "none" }}
              />
              <Line type="monotone" dataKey="value" stroke="hsl(221 83% 53%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecomendaciones } from "@/lib/hooks";

const USER_ID_STORAGE_KEY = "current_user_id";

export default function RecommendationsPage() {
  const userId = useMemo(() => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem(USER_ID_STORAGE_KEY) ?? "";
  }, []);

  const recomendaciones = useRecomendaciones(userId, Boolean(userId));

  if (!userId) {
    return <p className="text-sm text-muted-foreground">Conéctate para ver tus recomendaciones.</p>;
  }

  if (recomendaciones.isPending) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (recomendaciones.isError) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-destructive">No pudimos cargar tus recomendaciones personalizadas.</p>
        <Button size="sm" onClick={() => recomendaciones.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const items = recomendaciones.data?.items ?? [];

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay recomendaciones en este momento.</p>;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>{item.title}</span>
              <span className="text-xs font-medium text-muted-foreground">Prioridad {item.priority}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{item.message}</p>
            {item.evidence ? (
              <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(item.evidence, null, 2)}
              </pre>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

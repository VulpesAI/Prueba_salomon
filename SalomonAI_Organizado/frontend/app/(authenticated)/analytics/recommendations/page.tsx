"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useRecoFeedback, useRecomendaciones } from "@/lib/hooks";

const USER_ID_STORAGE_KEY = "current_user_id";

export default function RecommendationsPage() {
  const { toast } = useToast();

  const userId = useMemo(() => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem(USER_ID_STORAGE_KEY) ?? "";
  }, []);

  const recomendaciones = useRecomendaciones(userId, Boolean(userId));
  const feedback = useRecoFeedback();

  const items = useMemo(() => {
    if (!recomendaciones.data?.items) return [];
    return [...recomendaciones.data.items].sort((a, b) => b.priority - a.priority);
  }, [recomendaciones.data?.items]);

  const sendFeedback = (recommendationId: string, score: -1 | 0 | 1) => {
    if (!userId) return;

    feedback.mutate(
      {
        user_id: userId,
        recommendation_id: recommendationId,
        score,
        client_submission_id: crypto.randomUUID(),
      },
      {
        onSuccess: () => {
          toast({
            title: score > 0 ? "Gracias por tu feedback" : "Registramos tu feedback",
            description:
              score > 0
                ? "Usaremos esta señal para priorizar recomendaciones similares."
                : "Ajustaremos las sugerencias futuras para que sean más relevantes.",
          });
        },
        onError: () => {
          toast({
            title: "No pudimos guardar tu feedback",
            description: "Vuelve a intentarlo en unos segundos.",
            variant: "destructive",
          });
        },
      },
    );
  };

  if (!userId) {
    return <p className="text-sm text-muted-foreground">Conéctate para ver tus recomendaciones.</p>;
  }

  if (recomendaciones.isPending) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
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
              <span className="text-xs font-medium text-muted-foreground">
                Prioridad {item.priority}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>{item.message}</p>
            {typeof item.score === "number" ? (
              <p className="text-xs text-muted-foreground">
                Puntaje del motor: {item.score.toFixed(2)}
              </p>
            ) : null}
            {item.evidence ? (
              <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(item.evidence, null, 2)}
              </pre>
            ) : null}
          </CardContent>
          <CardFooter className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={feedback.isPending}
              onClick={() => sendFeedback(item.id, 1)}
            >
              Útil
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={feedback.isPending}
              onClick={() => sendFeedback(item.id, -1)}
            >
              No útil
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

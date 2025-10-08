"use client";

import { useMemo } from "react";
import { useToast } from "@/components/ui/use-toast";
import RecommendationCard from "./_components/RecommendationCard";
import { useRecommendations } from "@/lib/hooks/useRecommendations";
import { useRecommendationFeedback } from "@/lib/hooks/useRecommendationFeedback";
import { uuidv4 } from "@/lib/utils/uuid";
import { Button } from "@/components/ui/button";

export default function RecomendacionesPage() {
  const { toast } = useToast();
  const { data, isLoading, isError, error, refetch } = useRecommendations();

  const mutation = useRecommendationFeedback({
    onSuccessToast: () =>
      toast({
        title: "¡Gracias por tu feedback!",
        description: "Lo tendremos en cuenta para mejorar las recomendaciones.",
      }),
  });

  const userId = useMemo(() => "user-demo-123", []);

  const handleFeedback = (recommendationId: string, score: 1 | -1) => {
    mutation.mutate({
      user_id: userId,
      recommendation_id: recommendationId,
      score,
      client_submission_id: uuidv4(),
    });
  };

  return (
    <main className="container mx-auto max-w-4xl space-y-6 py-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Recomendaciones</h1>
        <p className="text-sm text-muted-foreground">
          Personalizamos estas sugerencias según tus movimientos más recientes.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-32 animate-pulse rounded-xl border border-border bg-muted/40" />
          ))}
        </div>
      ) : null}

      {isError ? (
        <div className="flex flex-col gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          <p className="font-medium text-red-200">Ocurrió un problema al cargar las recomendaciones.</p>
          <p className="text-red-200/80">{(error as Error).message}</p>
          <div>
            <Button variant="outline" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        </div>
      ) : null}

      {!isLoading && !isError && data?.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-6 text-center">
          <p className="text-base font-medium text-foreground">
            Por ahora no tenemos recomendaciones.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sube tu cartola o ajusta tus metas para obtener sugerencias personalizadas.
          </p>
        </div>
      ) : null}

      <section className="grid gap-4">
        {data?.items.map((recommendation) => (
          <RecommendationCard
            key={recommendation.id}
            r={recommendation}
            disabled={mutation.isPending}
            onUseful={() => handleFeedback(recommendation.id, 1)}
            onNotUseful={() => handleFeedback(recommendation.id, -1)}
          />
        ))}
      </section>
    </main>
  );
}

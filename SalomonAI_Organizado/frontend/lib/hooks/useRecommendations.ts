import { useQuery } from "@tanstack/react-query";
import { RecommendationsResponse } from "@/types/recommendations";

export function useRecommendations() {
  return useQuery<RecommendationsResponse>({
    queryKey: ["recommendations"],
    queryFn: async () => {
      const res = await fetch("/api/recommendations", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("No se pudieron cargar las recomendaciones");
      }
      return res.json();
    },
    staleTime: 60_000,
  });
}

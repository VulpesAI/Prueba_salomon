import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FeedbackPayload,
  FeedbackResponse,
  RecommendationsResponse,
} from "@/types/recommendations";

export function useRecommendationFeedback({
  onSuccessToast,
}: {
  onSuccessToast: () => void;
}) {
  const queryClient = useQueryClient();

  return useMutation<FeedbackResponse, Error, FeedbackPayload>({
    mutationFn: async (payload) => {
      const res = await fetch("/api/recommendations/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("No se pudo enviar el feedback");
      }

      return res.json();
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ["recommendations"] });
      const previous = queryClient.getQueryData<RecommendationsResponse>(["recommendations"]);

      if (previous) {
        const optimistic: RecommendationsResponse = {
          items: previous.items.map((item) => ({ ...item, evidence: item.evidence?.map((e) => ({ ...e })) })),
        };
        const index = optimistic.items.findIndex((item) => item.id === payload.recommendation_id);

        if (index !== -1) {
          optimistic.items[index].score = optimistic.items[index].score + payload.score;
          optimistic.items.sort((a, b) => {
            const pr = priorityRank(a.priority) - priorityRank(b.priority);
            if (pr !== 0) return pr;
            if (b.score !== a.score) return b.score - a.score;
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
          });
          queryClient.setQueryData(["recommendations"], optimistic);
        }
      }

      return { previous };
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["recommendations"], context.previous);
      }
    },
    onSuccess: () => {
      onSuccessToast();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
    },
  });
}

function priorityRank(priority: "HIGH" | "MEDIUM" | "LOW") {
  if (priority === "HIGH") return 0;
  if (priority === "MEDIUM") return 1;
  return 2;
}

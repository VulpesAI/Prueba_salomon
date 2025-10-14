import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ENV } from "@/config/env";

import { apiGet, apiPost } from "@/lib/api";
import {
  ChatReply,
  ForecastResp,
  DashboardProyeccion,
  MovimientosPage,
  RecoResp,
  ResumenResp,
  STTOut,
  TTSOut,
} from "@/lib/schemas";
import { z } from "zod";

export function useDashboardResumen() {
  return useResumen();
}

export function useDashboardProyeccion() {
  return useQuery({
    queryKey: ["dashboard", "proyeccion"],
    queryFn: async () => DashboardProyeccion.parse(await apiGet(`/dashboard/proyeccion`)),
    staleTime: 60_000,
  });
}

export function useMovimientos(params: {
  from?: string;
  to?: string;
  category?: string;
  q?: string;
}) {
  return useInfiniteQuery({
    queryKey: ["movimientos", params],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const query = new URLSearchParams({
        ...Object.fromEntries(
          Object.entries(params).filter(([, value]) => value != null && value !== ""),
        ),
        page: String(pageParam),
        limit: ENV.NEXT_PUBLIC_PAGE_SIZE || "50",
      });
      return MovimientosPage.parse(await apiGet(`/movimientos?${query.toString()}`));
    },
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
  });
}

export function useRecomendaciones(userId: string, enabled = true) {
  return useQuery({
    queryKey: ["recs", userId],
    enabled,
    queryFn: async () =>
      RecoResp.parse(
        await apiGet(`/recommendations/personalized/${encodeURIComponent(userId)}?limit=20`),
      ),
    staleTime: 5 * 60_000,
  });
}

const RecoFeedbackSchema = z.object({
  feedback_id: z.string(),
  stored: z.boolean(),
});

export function useRecoFeedback() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      user_id: string;
      recommendation_id: string;
      score: -1 | 0 | 1;
      comment?: string;
      client_submission_id?: string;
    }) => RecoFeedbackSchema.parse(await apiPost(`/recommendations/feedback`, payload)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recs"] });
    },
  });
}

export function useForecast(userId: string, horizon = 30) {
  return useQuery({
    enabled: Boolean(userId),
    queryKey: ["forecast", userId, horizon],
    queryFn: async () =>
      ForecastResp.parse(
        await apiGet(`/forecasts/${encodeURIComponent(userId)}?horizon=${horizon}`),
      ),
    staleTime: 5 * 60_000,
  });
}

export function useResumen() {
  return useQuery({
    queryKey: ["dashboard", "resumen"],
    queryFn: async () => ResumenResp.parse(await apiGet(`/dashboard/resumen`)),
    staleTime: 60_000,
  });
}

export function useChatSync() {
  return useMutation({
    mutationFn: async (payload: {
      messages: { role: "user" | "system" | "assistant"; content: string }[];
    }) => ChatReply.parse(await apiPost(`/conversation/chat`, payload)),
  });
}

export function useSTT() {
  return useMutation({
    mutationFn: async (payload: {
      audio_base64: string;
      mime: string;
      language?: string;
    }) => STTOut.parse(await apiPost(`/voice/transcriptions`, payload)),
  });
}

export function useTTS() {
  return useMutation({
    mutationFn: async (payload: {
      text: string;
      voice?: string;
      format?: "mp3" | "wav";
      language?: string;
    }) => TTSOut.parse(await apiPost(`/voice/speech`, payload)),
  });
}

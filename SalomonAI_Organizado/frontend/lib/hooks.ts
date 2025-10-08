import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";

import { apiGet, apiPost } from "@/lib/api";
import {
  ChatReply,
  DashboardProyeccion,
  DashboardResumen,
  MovimientosPage,
  RecoResponse,
  STTOut,
  TTSOut,
} from "@/lib/schemas";

export function useDashboardResumen() {
  return useQuery({
    queryKey: ["dashboard", "resumen"],
    queryFn: () => apiGet("/dashboard/resumen", DashboardResumen),
    staleTime: 60_000,
  });
}

export function useDashboardProyeccion() {
  return useQuery({
    queryKey: ["dashboard", "proyeccion"],
    queryFn: () => apiGet("/dashboard/proyeccion", DashboardProyeccion),
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
    queryFn: ({ pageParam }) => {
      const query = new URLSearchParams({
        ...Object.fromEntries(
          Object.entries(params).filter(([, value]) => value != null && value !== ""),
        ),
        page: String(pageParam),
        limit: process.env.NEXT_PUBLIC_PAGE_SIZE ?? "50",
      });
      return apiGet(`/movimientos?${query.toString()}`, MovimientosPage);
    },
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
  });
}

export function useRecomendaciones(userId: string, enabled = true) {
  return useQuery({
    queryKey: ["recomendaciones", userId],
    enabled,
    queryFn: () => apiGet(`/recommendations/personalized/${userId}`, RecoResponse),
    staleTime: 5 * 60_000,
  });
}

export function useChatSync() {
  return useMutation({
    mutationFn: (payload: {
      messages: { role: "user" | "system" | "assistant"; content: string }[];
    }) => apiPost("/conversation/chat", payload, ChatReply),
  });
}

export function useSTT() {
  return useMutation({
    mutationFn: (payload: {
      audio_base64: string;
      mime: string;
      language?: string;
    }) => apiPost("/voice/transcriptions", payload, STTOut),
  });
}

export function useTTS() {
  return useMutation({
    mutationFn: (payload: {
      text: string;
      voice?: string;
      format?: "mp3" | "wav";
      language?: string;
    }) => apiPost("/voice/speech", payload, TTSOut),
  });
}

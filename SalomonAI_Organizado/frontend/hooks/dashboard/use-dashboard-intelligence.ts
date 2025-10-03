"use client"

import { useEffect, useMemo, useState } from "react"

import { queryKeys } from "@/config/query-keys"
import { useApiMutation, useApiQuery } from "@/hooks/use-api"
import {
  getDashboardIntelligence,
  sendDashboardRecommendationFeedback,
} from "@/services/dashboard"
import type {
  DashboardIntelligenceResponse,
  FeedbackStatus,
  RecommendationFeedbackPayload,
} from "@/types/dashboard"

type IntelligenceQueryResult = DashboardIntelligenceResponse | undefined

export const useDashboardIntelligence = () => {
  const [recommendationFeedback, setRecommendationFeedback] = useState<
    Record<string, FeedbackStatus>
  >({})

  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
    []
  )

  const intelligenceQuery = useApiQuery<
    DashboardIntelligenceResponse,
    Error,
    IntelligenceQueryResult
  >({
    queryKey: queryKeys.dashboard.intelligence(),
    queryFn: (_, context) => getDashboardIntelligence({ signal: context.signal }),
    staleTime: 60_000,
  })

  useEffect(() => {
    const recommendations = intelligenceQuery.data?.recommendations ?? []
    if (recommendations.length === 0) {
      setRecommendationFeedback({})
      return
    }

    setRecommendationFeedback((previous) => {
      const nextState: Record<string, FeedbackStatus> = {}

      for (const recommendation of recommendations) {
        nextState[recommendation.id] = previous[recommendation.id] ?? "idle"
      }

      return nextState
    })
  }, [intelligenceQuery.data?.recommendations])

  const feedbackMutation = useApiMutation<
    RecommendationFeedbackPayload,
    Error,
    RecommendationFeedbackPayload
  >({
    mutationFn: async (_, payload) => {
      await sendDashboardRecommendationFeedback(payload)
      return payload
    },
  })

  const intelligence = intelligenceQuery.data

  const errorMessage = intelligenceQuery.error
    ? intelligenceQuery.error.message || "No pudimos cargar los datos analíticos."
    : null

  const isLoading = intelligenceQuery.isPending || intelligenceQuery.isFetching

  const sendRecommendationFeedback = async (
    recommendationId: string,
    feedback: RecommendationFeedbackPayload["feedback"],
  ) => {
    setRecommendationFeedback((previous) => ({
      ...previous,
      [recommendationId]: "sending",
    }))

    try {
      await feedbackMutation.mutateAsync({ recommendationId, feedback })
      setRecommendationFeedback((previous) => ({
        ...previous,
        [recommendationId]: "sent",
      }))
    } catch (error) {
      setRecommendationFeedback((previous) => ({
        ...previous,
        [recommendationId]: "error",
      }))
      throw error
    }
  }

  return {
    forecastSummary: intelligence?.forecastSummary ?? null,
    predictiveAlerts: intelligence?.predictiveAlerts ?? [],
    insights: intelligence?.insights ?? [],
    recommendations: intelligence?.recommendations ?? [],
    recommendationFeedback,
    isLoading,
    error: errorMessage,
    refresh: intelligenceQuery.refetch,
    sendRecommendationFeedback,
    apiBaseUrl,
  }
}

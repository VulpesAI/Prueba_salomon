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
import {
  IS_DEMO_MODE,
  useDemoFinancialData,
} from "@/context/DemoFinancialDataContext"

type IntelligenceQueryResult = DashboardIntelligenceResponse | undefined

export const useDashboardIntelligence = () => {
  const [recommendationFeedback, setRecommendationFeedback] = useState<
    Record<string, FeedbackStatus>
  >({})

  const { intelligence } = useDemoFinancialData()
  const hasLocalIntelligence = Boolean(intelligence)
  const isDemoMode = IS_DEMO_MODE

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
    enabled: !isDemoMode && !hasLocalIntelligence,
    initialData: intelligence ?? undefined,
  })

  useEffect(() => {
    const recommendations = (intelligence ?? intelligenceQuery.data)?.recommendations ?? []
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
  }, [intelligence?.recommendations, intelligenceQuery.data?.recommendations])

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

  const intelligenceData = intelligence ?? intelligenceQuery.data

  const errorMessage = isDemoMode
    ? null
    : hasLocalIntelligence
      ? null
      : intelligenceQuery.error
        ? intelligenceQuery.error.message || "No pudimos cargar los datos analíticos."
        : null

  const isLoading = isDemoMode
    ? false
    : hasLocalIntelligence
      ? false
      : intelligenceQuery.isPending || intelligenceQuery.isFetching

  const sendRecommendationFeedback = async (
    recommendationId: string,
    feedback: RecommendationFeedbackPayload["feedback"],
  ) => {
    if (isDemoMode) {
      setRecommendationFeedback((previous) => ({
        ...previous,
        [recommendationId]: "sent",
      }))
      return
    }

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
    forecastSummary: intelligenceData?.forecastSummary ?? null,
    predictiveAlerts: intelligenceData?.predictiveAlerts ?? [],
    insights: intelligenceData?.insights ?? [],
    recommendations: intelligenceData?.recommendations ?? [],
    recommendationFeedback,
    isLoading,
    error: errorMessage,
    refresh: intelligenceQuery.refetch,
    sendRecommendationFeedback,
    apiBaseUrl,
  }
}

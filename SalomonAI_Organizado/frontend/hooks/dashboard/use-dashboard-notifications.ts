"use client"

import { useMemo } from "react"

import { useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/config/query-keys"
import { useApiMutation, useApiQuery } from "@/hooks/use-api"
import {
  getDashboardNotifications,
  updateNotificationPreferences,
} from "@/services/dashboard"
import type {
  DashboardNotificationsResponse,
  UserNotificationPreferences,
} from "@/types/dashboard"
import {
  IS_DEMO_MODE,
  useDemoFinancialData,
} from "@/context/DemoFinancialDataContext"

type NotificationsQueryResult = DashboardNotificationsResponse | undefined

export const useDashboardNotifications = () => {
  const queryClient = useQueryClient()
  const { notifications: localNotifications } = useDemoFinancialData()
  const hasLocalNotifications = Boolean(localNotifications)
  const isDemoMode = IS_DEMO_MODE

  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
    []
  )

  const notificationsQuery = useApiQuery<
    DashboardNotificationsResponse,
    Error,
    NotificationsQueryResult
  >({
    queryKey: queryKeys.dashboard.notifications(),
    queryFn: (_, context) => getDashboardNotifications({ signal: context.signal }),
    staleTime: 45_000,
    enabled: !isDemoMode && !hasLocalNotifications,
    initialData: localNotifications ?? undefined,
  })

  const updatePreferencesMutation = useApiMutation<
    UserNotificationPreferences,
    Error,
    UserNotificationPreferences
  >({
    mutationFn: async (_, preferences) => updateNotificationPreferences(preferences),
    onSuccess: (preferences) => {
      queryClient.setQueryData<DashboardNotificationsResponse | undefined>(
        queryKeys.dashboard.notifications(),
        (previous) =>
          previous
            ? { ...previous, preferences }
            : { notifications: [], preferences }
      )
    },
  })

  const notificationsData = localNotifications ?? notificationsQuery.data
  const notifications = notificationsData?.notifications ?? []
  const preferences = notificationsData?.preferences ?? null

  const errorMessage = isDemoMode
    ? null
    : hasLocalNotifications
      ? null
      : notificationsQuery.error
        ? notificationsQuery.error.message || "No pudimos cargar las notificaciones."
        : null

  const isLoading = isDemoMode
    ? false
    : hasLocalNotifications
      ? false
      : notificationsQuery.isPending || notificationsQuery.isFetching

  const refresh = isDemoMode
    ? async () => undefined
    : notificationsQuery.refetch

  const updatePreferences = async (preferencesInput: UserNotificationPreferences) => {
    if (isDemoMode) {
      queryClient.setQueryData<DashboardNotificationsResponse | undefined>(
        queryKeys.dashboard.notifications(),
        (previous) =>
          previous
            ? { ...previous, preferences: preferencesInput }
            : { notifications: [], preferences: preferencesInput }
      )
      return
    }

    await updatePreferencesMutation.mutateAsync(preferencesInput)
  }

  return {
    notifications,
    preferences,
    isLoading,
    error: errorMessage,
    refresh,
    updatePreferences,
    apiBaseUrl,
  }
}

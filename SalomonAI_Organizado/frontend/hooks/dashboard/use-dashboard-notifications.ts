"use client"

import { useMemo } from "react"

import { useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/config/query-keys"
import { useAuth } from "@/context/AuthContext"
import { useApiMutation, useApiQuery } from "@/hooks/use-api"
import {
  getDashboardNotifications,
  updateNotificationPreferences,
} from "@/services/dashboard"
import type {
  DashboardNotificationsResponse,
  UserNotificationPreferences,
} from "@/types/dashboard"

type NotificationsQueryResult = DashboardNotificationsResponse | undefined

export const useDashboardNotifications = () => {
  const { session, isLoading: isAuthLoading } = useAuth()
  const queryClient = useQueryClient()

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
    enabled: Boolean(session?.accessToken),
    staleTime: 45_000,
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

  const notifications = notificationsQuery.data?.notifications ?? []
  const preferences = notificationsQuery.data?.preferences ?? null

  const errorMessage = notificationsQuery.error
    ? notificationsQuery.error.message || "No pudimos cargar las notificaciones."
    : null

  const isQueryEnabled = Boolean(session?.accessToken)
  const isLoading =
    isAuthLoading ||
    (isQueryEnabled ? notificationsQuery.isPending || notificationsQuery.isFetching : false)

  const refresh = notificationsQuery.refetch

  const updatePreferences = async (preferencesInput: UserNotificationPreferences) => {
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

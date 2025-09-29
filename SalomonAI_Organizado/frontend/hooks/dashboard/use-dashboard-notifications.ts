"use client"

import { useCallback, useMemo } from "react"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAuth } from "@/context/AuthContext"

export type NotificationChannel = "email" | "push" | "sms" | "in_app"
export type NotificationSeverity = "info" | "warning" | "critical"

export type NotificationHistoryItem = {
  id: string
  message: string
  read: boolean
  channel: NotificationChannel
  severity: NotificationSeverity
  createdAt: string
  metadata?: Record<string, unknown> | null
}

export type UserNotificationPreferences = {
  email?: boolean
  push?: boolean
  sms?: boolean
  mutedEvents?: { key: string; until?: string | null }[]
}

type NotificationsResponse = {
  notifications: NotificationHistoryItem[]
  preferences: UserNotificationPreferences | null
}

const QUERY_KEY = ["dashboard", "notifications"]

const fallbackData: NotificationsResponse = {
  notifications: [],
  preferences: null,
}

export const useDashboardNotifications = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
    []
  )

  const query = useQuery<NotificationsResponse>({
    queryKey: QUERY_KEY,
    enabled: Boolean(user),
    placeholderData: fallbackData,
    queryFn: async () => {
      if (!user) {
        return fallbackData
      }

      const token = await user.getIdToken()
      const authHeaders = { Authorization: `Bearer ${token}` }

      // TODO: Reemplazar por integración real
      void authHeaders

      return {
        notifications: [
          {
            id: "notif_1",
            message: "Conectamos correctamente tu cuenta principal.",
            read: false,
            channel: "in_app",
            severity: "info",
            createdAt: new Date().toISOString(),
          },
          {
            id: "notif_2",
            message: "Detectamos un gasto inusual en entretenimiento.",
            read: false,
            channel: "push",
            severity: "warning",
            createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
            metadata: { amount: 950 },
          },
          {
            id: "notif_3",
            message: "Tu meta de ahorro mensual está por alcanzarse.",
            read: true,
            channel: "email",
            severity: "info",
            createdAt: new Date(Date.now() - 7 * 86_400_000).toISOString(),
          },
        ],
        preferences: {
          email: true,
          push: true,
          sms: false,
          mutedEvents: [
            { key: "marketing", until: null },
          ],
        },
      }
    },
  })

  const mutation = useMutation({
    mutationFn: async (preferences: UserNotificationPreferences) => {
      if (!user) return

      const token = await user.getIdToken()
      const authHeaders = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      }

      // TODO: Integrar con endpoint real
      void authHeaders

      return preferences
    },
    onMutate: async (preferences) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY })

      const previous = queryClient.getQueryData<NotificationsResponse>(QUERY_KEY)

      queryClient.setQueryData<NotificationsResponse>(QUERY_KEY, (current) => ({
        notifications: current?.notifications ?? [],
        preferences,
      }))

      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEY, context.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
    [queryClient]
  )

  const data = query.data ?? fallbackData

  return {
    notifications: data.notifications,
    preferences: data.preferences,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refresh,
    updatePreferences: mutation.mutateAsync,
    isUpdatingPreferences: mutation.isPending,
    apiBaseUrl,
  }
}

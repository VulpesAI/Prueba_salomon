"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

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

type NotificationsState = {
  notifications: NotificationHistoryItem[]
  preferences: UserNotificationPreferences | null
  isLoading: boolean
  error: string | null
}

const initialState: NotificationsState = {
  notifications: [],
  preferences: null,
  isLoading: true,
  error: null,
}

export const useDashboardNotifications = () => {
  const { user } = useAuth()
  const [state, setState] = useState<NotificationsState>(initialState)

  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
    []
  )

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setState((previous) => ({ ...previous, isLoading: false, error: null }))
      return
    }

    setState((previous) => ({ ...previous, isLoading: true, error: null }))

    try {
      const token = await user.getIdToken()
      const authHeaders = { Authorization: `Bearer ${token}` }

      // TODO: Reemplazar por integración real
      // const historyResponse = await fetch(`${apiBaseUrl}/api/v1/dashboard/notifications/history`, {
      //   headers: authHeaders,
      // })
      // const preferencesResponse = await fetch(`${apiBaseUrl}/api/v1/dashboard/notifications/preferences`, {
      //   headers: authHeaders,
      // })
      // const [historyData, preferencesData] = await Promise.all([
      //   historyResponse.json(),
      //   preferencesResponse.json(),
      // ])

      void authHeaders

      setState({
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
        isLoading: false,
        error: null,
      })
    } catch (error) {
      console.error("Dashboard notifications placeholder error", error)
      setState((previous) => ({
        ...previous,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "No pudimos cargar las notificaciones.",
      }))
    }
  }, [apiBaseUrl, user])

  const updatePreferences = useCallback(
    async (preferences: UserNotificationPreferences) => {
      if (!user) return

      setState((previous) => ({
        ...previous,
        preferences,
      }))

      try {
        const token = await user.getIdToken()
        const authHeaders = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        }

        // TODO: Integrar con el endpoint real de actualización de preferencias
        // await fetch(`${apiBaseUrl}/api/v1/dashboard/notifications/preferences`, {
        //   method: "PUT",
        //   headers: authHeaders,
        //   body: JSON.stringify(preferences),
        // })

        void authHeaders
      } catch (error) {
        console.error("Dashboard update preferences placeholder error", error)
        setState((previous) => ({
          ...previous,
          error:
            error instanceof Error
              ? error.message
              : "No pudimos actualizar las preferencias.",
        }))
      }
    },
    [apiBaseUrl, user]
  )

  useEffect(() => {
    void fetchNotifications()
  }, [fetchNotifications])

  return {
    ...state,
    refresh: fetchNotifications,
    updatePreferences,
    apiBaseUrl,
  }
}

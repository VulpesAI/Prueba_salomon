"use client"

import { useMemo } from "react"

import { useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/config/query-keys"
import { ENV } from "@/config/env"
import { useApiMutation, useApiQuery } from "@/hooks/use-api"
import {
  getNotificationSettings,
  updateNotificationChannels,
  updateNotificationDigest,
  updateNotificationPreferences,
  updateNotificationTemplates,
} from "@/services/dashboard"
import type {
  NotificationDigestSettings,
  NotificationSettingsResponse,
  NotificationTemplateSettings,
  UserNotificationPreferences,
} from "@/types/dashboard"

type SettingsQueryResult = NotificationSettingsResponse | undefined

type UpdateTemplatesInput = Array<{ id: string; subject: string }>

export const useNotificationSettings = () => {
  const queryClient = useQueryClient()

  const apiBaseUrl = useMemo(
    () => ENV.NEXT_PUBLIC_API_URL || "http://localhost:3000",
    []
  )

  const settingsQuery = useApiQuery<
    NotificationSettingsResponse,
    Error,
    SettingsQueryResult
  >({
    queryKey: queryKeys.dashboard.notificationSettings(),
    queryFn: (_, context) => getNotificationSettings({ signal: context.signal }),
    staleTime: 60_000,
  })

  const digestMutation = useApiMutation<
    NotificationDigestSettings,
    Error,
    NotificationDigestSettings
  >({
    mutationFn: async (_, digest) => updateNotificationDigest(digest),
    onSuccess: (digest) => {
      queryClient.setQueryData<NotificationSettingsResponse | undefined>(
        queryKeys.dashboard.notificationSettings(),
        (previous) =>
          previous
            ? { ...previous, digest }
            : { digest, channels: { email: true, push: true, sms: true, inApp: true }, templates: [] }
      )
    },
  })

  const channelsMutation = useApiMutation<
    Required<Pick<UserNotificationPreferences, "email" | "push" | "sms" | "inApp">>,
    Error,
    Required<Pick<UserNotificationPreferences, "email" | "push" | "sms" | "inApp">>
  >({
    mutationFn: async (_, channels) => updateNotificationChannels(channels),
    onSuccess: (channels) => {
      queryClient.setQueryData<NotificationSettingsResponse | undefined>(
        queryKeys.dashboard.notificationSettings(),
        (previous) =>
          previous ? { ...previous, channels } : { digest: null, channels, templates: [] }
      )
    },
  })

  const preferencesMutation = useApiMutation<
    UserNotificationPreferences,
    Error,
    UserNotificationPreferences
  >({
    mutationFn: async (_, preferences) => updateNotificationPreferences(preferences),
  })

  const templatesMutation = useApiMutation<
    NotificationTemplateSettings[],
    Error,
    UpdateTemplatesInput
  >({
    mutationFn: async (_, templates) => updateNotificationTemplates(templates),
    onSuccess: (updatedTemplates, variables) => {
      queryClient.setQueryData<NotificationSettingsResponse | undefined>(
        queryKeys.dashboard.notificationSettings(),
        (previous) => {
          const mergeTemplates = () => {
            if (updatedTemplates.length > 0) {
              return updatedTemplates.map((template) => {
                const previousTemplate = previous?.templates.find(
                  (item) => item.id === template.id
                )

                return previousTemplate
                  ? { ...previousTemplate, ...template }
                  : template
              })
            }

            if (previous) {
              return previous.templates.map((template) => {
                const updated = variables?.find((item) => item.id === template.id)
                return updated
                  ? { ...template, subject: updated.subject }
                  : template
              })
            }

            return (variables ?? []).map((template) => ({
              id: template.id,
              subject: template.subject,
              name: template.id,
              defaultSubject: template.subject,
            }))
          }

          const nextTemplates = mergeTemplates()

          return previous
            ? { ...previous, templates: nextTemplates }
            : {
                digest: null,
                channels: { email: true, push: true, sms: true, inApp: true },
                templates: nextTemplates,
              }
        }
      )
    },
  })

  const settings = settingsQuery.data

  const errorMessage = settingsQuery.error
    ? settingsQuery.error.message ||
      `No pudimos cargar la configuración desde ${apiBaseUrl}/dashboard/notifications/settings.`
    : null

  const refresh = settingsQuery.refetch

  return {
    settings: settings ?? null,
    isLoading: settingsQuery.isPending || settingsQuery.isFetching,
    error: errorMessage,
    refresh,
    updateDigest: digestMutation.mutateAsync,
    updateChannels: channelsMutation.mutateAsync,
    updatePreferences: preferencesMutation.mutateAsync,
    updateTemplates: templatesMutation.mutateAsync,
    apiBaseUrl,
    isSavingDigest: digestMutation.isPending,
    isSavingChannels: channelsMutation.isPending || preferencesMutation.isPending,
    isSavingTemplates: templatesMutation.isPending,
  }
}


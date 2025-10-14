"use client"

import { useMemo, useState } from "react"

import { useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/config/query-keys"
import { ENV } from "@/config/env"
import { useApiMutation, useApiQuery } from "@/hooks/use-api"
import { getUserSessions, revokeUserSession } from "@/services/auth"
import type { UserSession, UserSessionsResponse } from "@/types/auth"

type SessionsQueryResult = UserSessionsResponse | undefined

export const useUserSessions = () => {
  const queryClient = useQueryClient()
  const [activeRevocation, setActiveRevocation] = useState<string | null>(null)

  const apiBaseUrl = useMemo(
    () => ENV.NEXT_PUBLIC_API_URL || "http://localhost:3000",
    []
  )

  const sessionsQuery = useApiQuery<UserSessionsResponse, Error, SessionsQueryResult>({
    queryKey: queryKeys.auth.sessions(),
    queryFn: (_, context) => getUserSessions({ signal: context.signal }),
    staleTime: 30_000,
  })

  const revokeMutation = useApiMutation<void, Error, string>({
    mutationFn: async (_, sessionId) => {
      await revokeUserSession(sessionId)
    },
    onMutate: async (sessionId) => {
      setActiveRevocation(sessionId)
    },
    onSettled: () => {
      setActiveRevocation(null)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.sessions() })
    },
  })

  const sessions = sessionsQuery.data?.sessions ?? []

  const errorMessage = sessionsQuery.error
    ? sessionsQuery.error.message || "No pudimos cargar tus sesiones activas."
    : null

  const isRevoking = revokeMutation.isPending

  const revoke = async (sessionId: string) => {
    await revokeMutation.mutateAsync(sessionId)
  }

  const refresh = sessionsQuery.refetch

  return {
    sessions: sessions as UserSession[],
    isLoading: sessionsQuery.isPending || sessionsQuery.isFetching,
    error: errorMessage,
    refresh,
    revoke,
    isRevoking,
    activeRevocation,
    apiBaseUrl,
  }
}


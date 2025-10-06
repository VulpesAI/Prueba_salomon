import { api } from "@/lib/api-client"
import type { UserSessionsResponse } from "@/types/auth"

type RequestOptions = {
  signal?: AbortSignal
}

export const getUserSessions = async ({ signal }: RequestOptions = {}) => {
  const response = await api.get<UserSessionsResponse>("/api/v1/auth/sessions", {
    signal,
  })

  return response.data
}

export const revokeUserSession = async (sessionId: string) => {
  await api.delete(`/api/v1/auth/sessions/${encodeURIComponent(sessionId)}`)
}


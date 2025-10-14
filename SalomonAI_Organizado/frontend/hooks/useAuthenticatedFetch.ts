"use client"

import { useMemo } from "react"

import { useAuth } from "@/context/AuthContext"

export const useAuthenticatedFetch = () => {
  const { session, refreshSession } = useAuth()

  return useMemo(() => {
    const getAuthHeaders = async (): Promise<Record<string, string>> => {
      const headers: Record<string, string> = {}

      let activeSession = session

      if (!activeSession) {
        activeSession = await refreshSession()
      }

      if (activeSession?.access_token) {
        const tokenType = activeSession.token_type ?? "Bearer"
        headers.Authorization = `${tokenType} ${activeSession.access_token}`
      }

      return headers
    }

    const authenticatedFetch: typeof fetch = async (input, init = {}) => {
      const resolvedInit: RequestInit = { ...init }
      const authHeaders = await getAuthHeaders()
      const headers = new Headers(resolvedInit.headers ?? {})

      for (const [key, value] of Object.entries(authHeaders)) {
        headers.set(key, value)
      }

      resolvedInit.headers = headers

      return fetch(input, resolvedInit)
    }

    return { fetch: authenticatedFetch, getAuthHeaders }
  }, [refreshSession, session])
}

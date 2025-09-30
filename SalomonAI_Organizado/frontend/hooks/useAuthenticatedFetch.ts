"use client"

import { useCallback, useMemo } from "react"

import { useAuth } from "@/context/AuthContext"

type AuthenticatedFetchOptions = RequestInit & {
  auth?: {
    forceRefresh?: boolean
    retryOnUnauthorized?: boolean
  }
}

const resolveRequestUrl = (input: Parameters<typeof fetch>[0]) => {
  if (typeof input === "string") {
    return input
  }

  if (input instanceof URL) {
    return input.toString()
  }

  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.url
  }

  try {
    return String(input)
  } catch {
    return "unknown"
  }
}

export const useAuthenticatedFetch = () => {
  const {
    session,
    sessionRef,
    forceRefreshSession,
    emitTelemetryEvent,
    invalidateSession,
  } = useAuth()

  const buildAuthorizationHeader = useCallback(() => {
    const currentSession = sessionRef.current

    if (!currentSession?.accessToken) {
      return null
    }

    const tokenType = currentSession.tokenType ?? "Bearer"
    return `${tokenType} ${currentSession.accessToken}`
  }, [sessionRef])

  const headers = useMemo<Record<string, string>>(() => {
    const authorization = buildAuthorizationHeader()
    if (!authorization) {
      return {}
    }

    return { Authorization: authorization }
  }, [buildAuthorizationHeader, session?.accessToken, session?.tokenType])

  const withAuthHeaders = useCallback(
    (init: RequestInit = {}) => {
      const authorization = buildAuthorizationHeader()
      if (!authorization) {
        return init
      }

      const headersWithAuth = new Headers(init.headers ?? {})
      headersWithAuth.set("Authorization", authorization)

      return {
        ...init,
        headers: headersWithAuth,
      }
    },
    [buildAuthorizationHeader]
  )

  const fetchWithAuth = useCallback(
    async (
      input: Parameters<typeof fetch>[0],
      init: AuthenticatedFetchOptions = {}
    ) => {
      const { auth, ...rest } = init

      if (auth?.forceRefresh) {
        await forceRefreshSession()
      }

      const execute = () => fetch(input, withAuthHeaders(rest))

      const recordTelemetry = (
        event: string,
        detail?: Record<string, unknown>
      ) => {
        const url = resolveRequestUrl(input)
        emitTelemetryEvent(event, {
          url,
          ...detail,
        })
      }

      try {
        let response = await execute()

        const shouldRetry =
          (response.status === 401 || response.status === 403) &&
          auth?.retryOnUnauthorized !== false

        if (shouldRetry) {
          recordTelemetry("auth.fetch.unauthorized", { status: response.status })
          await forceRefreshSession()
          response = await execute()

          if (response.status === 401 || response.status === 403) {
            recordTelemetry("auth.fetch.session_invalid", {
              status: response.status,
            })
            await invalidateSession()
          }
        }

        return response
      } catch (error) {
        recordTelemetry("auth.fetch.error", {
          message: error instanceof Error ? error.message : "unknown",
        })
        throw error
      }
    },
    [emitTelemetryEvent, forceRefreshSession, invalidateSession, withAuthHeaders]
  )

  return useMemo(
    () => ({
      headers,
      withAuthHeaders,
      fetchWithAuth,
      forceRefresh: forceRefreshSession,
      session,
      sessionRef,
    }),
    [
      fetchWithAuth,
      forceRefreshSession,
      headers,
      session,
      sessionRef,
      withAuthHeaders,
    ]
  )
}

export type { AuthenticatedFetchOptions }

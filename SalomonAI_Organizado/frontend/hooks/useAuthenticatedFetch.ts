"use client"

import { useMemo } from "react"

import { useAuth } from "@/context/AuthContext"
import { supabaseBrowser } from "@/lib/supabase-browser"

const supabase = supabaseBrowser()

export const useAuthenticatedFetch = () => {
  const { session } = useAuth()

  return useMemo(() => {
    const getAuthHeaders = async (): Promise<Record<string, string>> => {
      const headers: Record<string, string> = {}

      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          throw error
        }

        const activeSession = data.session ?? session

        if (activeSession?.access_token) {
          const tokenType = activeSession.token_type ?? "Bearer"
          headers.Authorization = `${tokenType} ${activeSession.access_token}`
        }
      } catch (error) {
        console.error("Unable to retrieve Supabase session", error)
        if (session?.access_token) {
          const tokenType = session.token_type ?? "Bearer"
          headers.Authorization = `${tokenType} ${session.access_token}`
        }
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
  }, [session])
}

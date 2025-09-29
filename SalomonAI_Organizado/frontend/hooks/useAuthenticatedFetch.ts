"use client"

import { useMemo } from "react"

import { useAuth } from "@/context/AuthContext"

export const useAuthenticatedFetch = () => {
  const { session } = useAuth()

  return useMemo(() => {
    const headers: Record<string, string> = {}

    if (session?.accessToken) {
      const tokenType = session.tokenType ?? "Bearer"
      headers.Authorization = `${tokenType} ${session.accessToken}`
    }

    return { headers }
  }, [session?.accessToken, session?.tokenType])
}

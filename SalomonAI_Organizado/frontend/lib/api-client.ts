import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from "axios"

import {
  getCurrentAuthSession,
  invalidateAuthSession,
  requestSessionRefresh,
} from "@/context/AuthContext"

type RetryConfig = AxiosRequestConfig & {
  _retry?: boolean
  _retryCount?: number
}

const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
  withCredentials: true,
})

apiClient.interceptors.request.use((config) => {
  const session = getCurrentAuthSession()

  if (session?.accessToken) {
    const tokenType = session.tokenType ?? "Bearer"
    config.headers = {
      ...config.headers,
      Authorization: `${tokenType} ${session.accessToken}`,
    }
  }

  return config
})

const scheduleDelay = (duration: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, duration)
  })

const MAX_RATE_LIMIT_RETRIES = 2

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = (error.config ?? {}) as RetryConfig
    const status = error.response?.status

    if (!status) {
      throw error
    }

    if (status === 401 && !config._retry) {
      config._retry = true

      try {
        if (typeof window === "undefined") {
          throw error
        }

        await requestSessionRefresh()
      } catch (refreshError) {
        await invalidateAuthSession()
        throw refreshError
      }

      return apiClient(config)
    }

    if (status === 429) {
      const retryCount = config._retryCount ?? 0
      if (retryCount >= MAX_RATE_LIMIT_RETRIES) {
        throw error
      }

      const retryAfterHeader = error.response?.headers?.["retry-after"]
      const retryAfterSeconds = Array.isArray(retryAfterHeader)
        ? Number.parseFloat(retryAfterHeader[0])
        : typeof retryAfterHeader === "string"
          ? Number.parseFloat(retryAfterHeader)
          : NaN

      const fallbackDelay = 2 ** retryCount * 1000
      const delay = Number.isFinite(retryAfterSeconds)
        ? retryAfterSeconds * 1000
        : fallbackDelay

      config._retryCount = retryCount + 1

      await scheduleDelay(delay)

      return apiClient(config)
    }

    if (status === 401 && config._retry) {
      await invalidateAuthSession()
    }

    throw error
  }
)

export { apiClient }

import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios"
import type { QueryClient } from "@tanstack/react-query"

type SessionSnapshot = {
  accessToken: string
  tokenType?: string
  expiresAt?: number
}

type SessionGetter = () => SessionSnapshot | null

type RefreshSession = () => Promise<void>

type QueryClientGetter = () => QueryClient | null

type BusinessAuthError = {
  type: "auth"
  message: string
}

type ApiClientRequestConfig = AxiosRequestConfig & {
  __retryCount?: number
}

const FIVE_SECONDS = 5_000
const MAX_RATE_LIMIT_RETRIES = 3

let getSessionRef: SessionGetter | null = null
let refreshSessionRef: RefreshSession | null = null
let queryClientGetter: QueryClientGetter | null = null
let refreshPromise: Promise<void> | null = null

export const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
})

export const setApiClientSessionAccessors = (
  accessors: {
    getSession?: SessionGetter | null
    refreshSession?: RefreshSession | null
  } | null
) => {
  getSessionRef = accessors?.getSession ?? null
  refreshSessionRef = accessors?.refreshSession ?? null
}

export const setApiClientQueryClientGetter = (getter: QueryClientGetter | null) => {
  queryClientGetter = getter
}

export const emitApiMetric = (
  event: string,
  detail?: Record<string, unknown>
) => {
  const payload = {
    event,
    ...detail,
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("telemetry", {
        detail: payload,
      })
    )
  }

  if (process.env.NODE_ENV !== "production") {
    console.warn("[telemetry]", event, detail)
  }
}

const ensureFreshSession = async () => {
  const currentSession = getSessionRef?.()
  if (!currentSession?.accessToken) {
    return
  }

  const expiresAt = currentSession.expiresAt
  const tokenExpired =
    typeof expiresAt === "number" && expiresAt > 0
      ? expiresAt - FIVE_SECONDS <= Date.now()
      : false

  if (!tokenExpired) {
    return
  }

  if (!refreshSessionRef) {
    return
  }

  if (!refreshPromise) {
    refreshPromise = refreshSessionRef().finally(() => {
      refreshPromise = null
    })
  }

  await refreshPromise
}

const applyAuthHeader = (config: InternalAxiosRequestConfig) => {
  const session = getSessionRef?.()
  if (!session?.accessToken) {
    return config
  }

  const tokenType = session.tokenType ?? "Bearer"
  config.headers = {
    ...config.headers,
    Authorization: `${tokenType} ${session.accessToken}`,
  }

  return config
}

apiClient.interceptors.request.use(async (config) => {
  await ensureFreshSession()
  return applyAuthHeader(config)
})

const extractErrorMessage = (error: AxiosError) => {
  const response = error.response
  if (!response) {
    return error.message
  }

  const data = response.data as { message?: string } | undefined
  if (data && typeof data.message === "string" && data.message.length > 0) {
    return data.message
  }

  if (typeof response.statusText === "string" && response.statusText.length > 0) {
    return response.statusText
  }

  return `Request failed with status ${response.status}`
}

const handleRateLimit = async (error: AxiosError): Promise<AxiosResponse> => {
  const client = queryClientGetter?.()
  void client?.invalidateQueries()

  const config = error.config as ApiClientRequestConfig | undefined
  if (!config) {
    throw error
  }

  const retryCount = config.__retryCount ?? 0
  if (retryCount >= MAX_RATE_LIMIT_RETRIES) {
    throw error
  }

  const delay = Math.min(2 ** retryCount * 1_000, 10_000)
  config.__retryCount = retryCount + 1

  await new Promise((resolve) => setTimeout(resolve, delay))

  return apiClient(config)
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (!error.response) {
      emitApiMetric("api.network.error", {
        message: error.message,
        url: error.config?.url,
      })
      return Promise.reject(error)
    }

    const { status } = error.response

    if (status === 429) {
      emitApiMetric("api.rate_limited", {
        url: error.config?.url,
      })

      try {
        return await handleRateLimit(error)
      } catch (rateLimitError) {
        return Promise.reject(rateLimitError)
      }
    }

    if (status === 401 || status === 403) {
      const businessError: BusinessAuthError = {
        type: "auth",
        message: extractErrorMessage(error),
      }

      emitApiMetric("api.auth.error", {
        message: businessError.message,
        url: error.config?.url,
        status,
      })

      return Promise.reject(businessError)
    }

    if (status >= 500) {
      emitApiMetric("api.error.critical", {
        status,
        url: error.config?.url,
      })
    }

    emitApiMetric("api.response.error", {
      status,
      url: error.config?.url,
    })

    return Promise.reject(error)
  }
)

export type { BusinessAuthError }

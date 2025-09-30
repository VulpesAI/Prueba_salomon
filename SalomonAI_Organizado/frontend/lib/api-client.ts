import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios"

import type { AuthSession } from "@/context/AuthContext"

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
})

type SessionGetter = () => AuthSession | null

type RefreshHandler = () => Promise<void>

type UnauthorizedHandler = () => Promise<void> | void

type ConfigureAuthOptions = {
  getSession: SessionGetter
  refreshSession?: RefreshHandler
  onUnauthorized?: UnauthorizedHandler
}

let sessionGetter: SessionGetter | null = null
let refreshHandler: RefreshHandler | null = null
let unauthorizedHandler: UnauthorizedHandler | null = null
let refreshPromise: Promise<void> | null = null

export const configureApiClientAuth = ({
  getSession,
  refreshSession,
  onUnauthorized,
}: ConfigureAuthOptions) => {
  sessionGetter = getSession
  refreshHandler = refreshSession ?? null
  unauthorizedHandler = onUnauthorized ?? null
}

const attachAuthorizationHeader = (config: InternalAxiosRequestConfig) => {
  const session = sessionGetter?.()

  if (session?.accessToken) {
    config.headers = config.headers ?? {}
    const tokenType = session.tokenType ?? "Bearer"
    config.headers.Authorization = `${tokenType} ${session.accessToken}`
  }

  return config
}

api.interceptors.request.use(attachAuthorizationHeader)

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
  _retryCount?: number
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const { response } = error
  const config = error.config as RetriableRequestConfig | undefined

  if (!response || !config) {
    return Promise.reject(error)
  }

  if (response.status === 401 && !config._retry) {
    config._retry = true

    if (!refreshHandler) {
      await unauthorizedHandler?.()
      return Promise.reject(error)
    }

    try {
      refreshPromise = refreshPromise ?? refreshHandler()
      await refreshPromise
      refreshPromise = null

      const session = sessionGetter?.()
      if (session?.accessToken) {
        config.headers = config.headers ?? {}
        const tokenType = session.tokenType ?? "Bearer"
        config.headers.Authorization = `${tokenType} ${session.accessToken}`
      }

      return api(config)
    } catch (refreshError) {
      refreshPromise = null
      await unauthorizedHandler?.()
      return Promise.reject(refreshError)
    }
  }

  if (response.status === 429) {
    const retryCount = config._retryCount ?? 0
    const maxRetries = 2

    if (retryCount < maxRetries) {
      config._retryCount = retryCount + 1

      const retryAfterHeader = response.headers?.["retry-after"]
      const retryAfterSeconds = Array.isArray(retryAfterHeader)
        ? Number.parseInt(retryAfterHeader[0] ?? "", 10)
        : typeof retryAfterHeader === "string"
          ? Number.parseInt(retryAfterHeader, 10)
          : Number.NaN

      const backoffDelay = Number.isFinite(retryAfterSeconds)
        ? retryAfterSeconds * 1000
        : Math.min(1000 * 2 ** retryCount, 10_000)

      await delay(backoffDelay)

      return api(config)
    }
  }

  return Promise.reject(error)
})

export { api }

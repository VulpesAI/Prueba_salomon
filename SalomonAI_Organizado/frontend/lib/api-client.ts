const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

export type ApiRequestOptions = RequestInit & {
  token?: string | null
}

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(message: string, status: number, data: unknown) {
    super(message)
    this.status = status
    this.data = data
  }
}

export async function apiRequest<T>(
  endpoint: string,
  { token, headers, ...options }: ApiRequestOptions = {}
): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  })

  const contentType = response.headers.get("content-type")
  const responseData = contentType && contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null)

  if (!response.ok) {
    const message =
      typeof responseData === "object" && responseData && "message" in responseData
        ? String((responseData as { message: string }).message)
        : response.statusText || "Error en la solicitud"

    throw new ApiError(message, response.status, responseData)
  }

  return responseData as T
}

export function getApiBaseUrl() {
  return API_BASE_URL
}

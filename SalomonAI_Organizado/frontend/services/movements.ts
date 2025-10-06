import { api } from "@/lib/api-client"
import type {
  MovementPreset,
  MovementPresetsResponse,
  MovementsResponse,
  MovementCondition,
} from "@/types/movements"

type RequestOptions = {
  signal?: AbortSignal
}

export type MovementsSearchParams = {
  userId: string
  accountId?: string
  statementId?: string
  search?: string
  category?: string
  merchant?: string
  minAmount?: number
  maxAmount?: number
  startDate?: string
  endDate?: string
  type?: "inflow" | "outflow"
  page?: number
  pageSize?: number
  sortBy?: "postedAt" | "amount"
  sortDirection?: "asc" | "desc"
}

const LOCAL_STORAGE_KEY_PREFIX = "salomonai.movements.presets"

const logFallbackWarning = (message: string, error: unknown) => {
  if (process.env.NODE_ENV !== "production") {
    console.warn(message, error)
  }
}

const getLocalStorageKey = (userId: string) => `${LOCAL_STORAGE_KEY_PREFIX}:${userId}`

const readLocalPresets = (userId: string): MovementPreset[] => {
  if (typeof window === "undefined") {
    return []
  }

  try {
    const raw = window.localStorage.getItem(getLocalStorageKey(userId))
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed as MovementPreset[]
  } catch (error) {
    logFallbackWarning("Failed to read local movement presets", error)
    return []
  }
}

const writeLocalPresets = (userId: string, presets: MovementPreset[]) => {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.setItem(
      getLocalStorageKey(userId),
      JSON.stringify(presets)
    )
  } catch (error) {
    logFallbackWarning("Failed to persist movement presets locally", error)
  }
}

const buildLocalPreset = (
  userId: string,
  preset: Omit<MovementPreset, "id" | "createdAt" | "updatedAt">
): MovementPreset => {
  const now = new Date().toISOString()
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `preset-${Math.random().toString(36).slice(2)}`

  const nextPreset: MovementPreset = {
    id,
    createdAt: now,
    updatedAt: now,
    description: null,
    ...preset,
  }

  const current = readLocalPresets(userId)
  writeLocalPresets(userId, [...current, nextPreset])

  return nextPreset
}

export const searchMovements = async (
  params: MovementsSearchParams,
  { signal }: RequestOptions = {}
) => {
  const response = await api.get<MovementsResponse>("/api/v1/movements", {
    params,
    signal,
  })

  return response.data
}

export const getMovementPresets = async (
  userId: string,
  { signal }: RequestOptions = {}
) => {
  try {
    const response = await api.get<MovementPresetsResponse>(
      "/api/v1/movements/presets",
      {
        params: { userId },
        signal,
      }
    )

    return response.data
  } catch (error) {
    logFallbackWarning("Falling back to local movement presets", error)
    return { presets: readLocalPresets(userId) }
  }
}

export type CreateMovementPresetInput = {
  userId: string
  name: string
  description?: string | null
  conditions: MovementCondition[]
  logicOperator: "AND" | "OR"
}

export const createMovementPreset = async (
  input: CreateMovementPresetInput
) => {
  const { userId, ...payload } = input

  try {
    const response = await api.post<MovementPreset>(
      "/api/v1/movements/presets",
      {
        userId,
        ...payload,
      }
    )

    return response.data
  } catch (error) {
    logFallbackWarning("Failed to persist preset remotely, storing locally", error)
    return buildLocalPreset(userId, {
      name: payload.name,
      description: payload.description ?? null,
      conditions: payload.conditions,
      logicOperator: payload.logicOperator,
    })
  }
}

export const deleteMovementPreset = async (userId: string, presetId: string) => {
  try {
    await api.delete(`/api/v1/movements/presets/${encodeURIComponent(presetId)}`, {
      params: { userId },
    })
  } catch (error) {
    logFallbackWarning("Falling back to local preset deletion", error)
    const current = readLocalPresets(userId)
    writeLocalPresets(
      userId,
      current.filter((preset) => preset.id !== presetId)
    )
  }
}


import type { QueryKey } from "@tanstack/react-query"

type QueryKeyFactory<TArgs extends unknown[]> = (...args: TArgs) => QueryKey

type PaginatedQueryKeyFactory<TArgs extends unknown[]> = (
  ...args: TArgs
) => QueryKey

export const queryKeys = {
  dashboard: {
    overview: (() => ["dashboard", "overview"]) satisfies QueryKeyFactory<[]>,
    intelligence: (() => ["dashboard", "intelligence"]) satisfies QueryKeyFactory<[]>,
    notifications: (() => ["dashboard", "notifications"]) satisfies QueryKeyFactory<[]>,
    notificationSettings: (() =>
      ["dashboard", "notification-settings"]) satisfies QueryKeyFactory<[]>,
    summary: ((params: {
      userId: string
      accountId?: string | null
      startDate?: string | null
      endDate?: string | null
      granularity?: "day" | "week" | "month" | null
      maxCategories?: number | null
    }) => [
      "dashboard",
      "summary",
      {
        userId: params.userId,
        accountId: params.accountId ?? null,
        startDate: params.startDate ?? null,
        endDate: params.endDate ?? null,
        granularity: params.granularity ?? null,
        maxCategories: params.maxCategories ?? null,
      },
    ]) satisfies QueryKeyFactory<[
      {
        userId: string
        accountId?: string | null
        startDate?: string | null
        endDate?: string | null
        granularity?: "day" | "week" | "month" | null
        maxCategories?: number | null
      }
    ]>,
    transactionsPage: ((page: number) => [
      "dashboard",
      "transactions",
      { page },
    ]) satisfies PaginatedQueryKeyFactory<[number]>,
  },
  user: {
    profile: (() => ["user", "profile"]) satisfies QueryKeyFactory<[]>,
  },
  auth: {
    sessions: (() => ["auth", "sessions"]) satisfies QueryKeyFactory<[]>,
  },
  movements: {
    search: ((params: {
      userId: string
      page: number
      pageSize: number
      filters: Record<string, unknown>
    }) => [
      "movements",
      "search",
      {
        userId: params.userId,
        page: params.page,
        pageSize: params.pageSize,
        filters: params.filters,
      },
    ]) satisfies QueryKeyFactory<[
      {
        userId: string
        page: number
        pageSize: number
        filters: Record<string, unknown>
      }
    ]>,
    presets: ((userId: string) => [
      "movements",
      "presets",
      { userId },
    ]) satisfies QueryKeyFactory<[string]>,
  },
  statements: {
    list: (() => ["statements", "list"]) satisfies QueryKeyFactory<[]>,
    detail: ((id: string) => ["statements", "detail", { id }]) satisfies QueryKeyFactory<[
      string
    ]>,
    transactions: ((id: string) => [
      "statements",
      "transactions",
      { id },
    ]) satisfies QueryKeyFactory<[string]>,
  },
} as const

type ExtractQueryKey<T> = T extends (...args: infer TArgs) => infer TResult
  ? (...args: TArgs) => TResult
  : never

export type DashboardQueryKeys = {
  [TKey in keyof typeof queryKeys.dashboard]: ExtractQueryKey<
    (typeof queryKeys.dashboard)[TKey]
  >
}

export type AppQueryKeys = {
  [TGroup in keyof typeof queryKeys]: {
    [TKey in keyof (typeof queryKeys)[TGroup]]: ExtractQueryKey<
      (typeof queryKeys)[TGroup][TKey]
    >
  }
}

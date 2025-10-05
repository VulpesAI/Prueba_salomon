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
    transactionsPage: ((page: number) => [
      "dashboard",
      "transactions",
      { page },
    ]) satisfies PaginatedQueryKeyFactory<[number]>,
  },
  user: {
    profile: (() => ["user", "profile"]) satisfies QueryKeyFactory<[]>,
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

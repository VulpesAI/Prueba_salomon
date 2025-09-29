import type { QueryKey } from "@tanstack/react-query"

type QueryKeyFactory<TArgs extends unknown[]> = (...args: TArgs) => QueryKey

type QueryKeysRegistry = {
  dashboard: {
    overview: QueryKey
  }
  accounts: {
    list: QueryKey
    detail: QueryKeyFactory<[accountId: string]>
  }
  transactions: {
    list: QueryKeyFactory<[
      filters?: Record<string, string | number | boolean | undefined>
    ]>
    detail: QueryKeyFactory<[transactionId: string]>
  }
  insights: {
    summary: QueryKey
  }
}

export const queryKeys: QueryKeysRegistry = {
  dashboard: {
    overview: ["dashboard", "overview"],
  },
  accounts: {
    list: ["accounts", "list"],
    detail: (accountId: string) => ["accounts", "detail", accountId],
  },
  transactions: {
    list: (
      filters?: Record<string, string | number | boolean | undefined>
    ) => ["transactions", "list", filters ?? {}],
    detail: (transactionId: string) => [
      "transactions",
      "detail",
      transactionId,
    ],
  },
  insights: {
    summary: ["insights", "summary"],
  },
} as const satisfies QueryKeysRegistry

export type QueryKeys = typeof queryKeys

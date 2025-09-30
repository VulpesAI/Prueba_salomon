export const queryKeys = {
  dashboard: {
    overview: ["dashboard", "overview"] as const,
    intelligence: ["dashboard", "intelligence"] as const,
    notifications: ["dashboard", "notifications"] as const,
  },
  accounts: {
    list: (filters?: Record<string, unknown>) =>
      ["accounts", "list", filters ?? {}] as const,
    detail: (accountId: string) =>
      ["accounts", "detail", accountId] as const,
  },
  transactions: {
    list: (filters?: Record<string, unknown>) =>
      ["transactions", "list", filters ?? {}] as const,
  },
  goals: {
    summary: ["goals", "summary"] as const,
  },
  alerts: {
    list: ["alerts", "list"] as const,
  },
  settings: {
    profile: ["settings", "profile"] as const,
  },
} as const

export type QueryKeys = typeof queryKeys

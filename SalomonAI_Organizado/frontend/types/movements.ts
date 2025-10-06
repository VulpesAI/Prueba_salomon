export type MovementAccount = {
  id: string
  externalId: string | null
  name: string | null
  institution: string | null
  type: string | null
  currency: string | null
}

export type Movement = {
  id: string
  statementId: string
  postedAt: string | null
  description: string | null
  amount: number | null
  currency: string | null
  merchant: string | null
  category: string | null
  type: "credit" | "debit" | "unknown"
  account: MovementAccount | null
  metadata: Record<string, unknown> | null
  conversational?: {
    direction: "inflow" | "outflow" | "unknown"
    absoluteAmount: number | null
    summary: string
  }
}

export type MovementsStats = {
  count: number
  totalAmount: number
  inflow: number
  outflow: number
  averageAmount: number
}

export type MovementsPagination = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type MovementsResponse = {
  pagination: MovementsPagination
  filters: Record<string, unknown>
  data: Movement[]
  stats: MovementsStats
}

export type MovementConditionField =
  | "amount"
  | "description"
  | "category"
  | "merchant"
  | "postedAt"

export type MovementConditionOperator =
  | "gt"
  | "lt"
  | "eq"
  | "contains"
  | "between"

export type MovementCondition = {
  field: MovementConditionField
  operator: MovementConditionOperator
  value: string
}

export type MovementPreset = {
  id: string
  name: string
  description?: string | null
  conditions: MovementCondition[]
  logicOperator: "AND" | "OR"
  createdAt: string
  updatedAt: string
}

export type MovementPresetsResponse = {
  presets: MovementPreset[]
}


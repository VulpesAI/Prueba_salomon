export type MovementType = "INCOME" | "EXPENSE"

export interface Movement {
  id: string
  occurred_at: string
  merchant: string
  category: string
  amount: number
  currency: "CLP" | "UF"
  type: MovementType
}

export interface MovementsQuery {
  from?: string
  to?: string
  category?: string
  q?: string
  cursor?: string
  limit?: number
}

export interface MovementsPage {
  items: Movement[]
  nextCursor?: string | null
  totalMatched?: number
}

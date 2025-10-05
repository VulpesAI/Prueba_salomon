import { api } from "@/lib/api-client"

export type StatementStatus =
  | "uploaded"
  | "processing"
  | "processed"
  | "completed"
  | "ready"
  | "failed"
  | "error"
  | string

export interface StatementAccountSummary {
  id: string
  externalId: string
  name: string | null
  type: string | null
  institution: string | null
  currency: string | null
}

export interface StatementSummary {
  id: string
  status: StatementStatus
  progress: number | null
  error: string | null
  storagePath: string
  uploadedAt: string | null
  periodStart: string | null
  periodEnd: string | null
  checksum: string | null
  account: StatementAccountSummary | null
}

export interface StatementTransaction {
  id: string
  postedAt: string | null
  description: string | null
  amount: number | null
  currency: string | null
  merchant: string | null
  category?: string | null
}

type ListStatementsResponse = {
  statements: StatementSummary[]
}

type StatementTransactionsResponse = {
  statement: StatementSummary
  transactions: StatementTransaction[]
}

export const getStatements = async ({ signal }: { signal?: AbortSignal } = {}) => {
  const response = await api.get<ListStatementsResponse>("/api/v1/statements", { signal })
  return response.data.statements
}

export const getStatementTransactions = async (
  id: string,
  { signal }: { signal?: AbortSignal } = {}
) => {
  const response = await api.get<StatementTransactionsResponse>(
    `/api/v1/statements/${id}/transactions`,
    { signal }
  )

  return response.data
}

export interface UpdateTransactionInput {
  transactionId: string
  payload: {
    description?: string | null
    category?: string | null
  }
}

type UpdateTransactionResponse = {
  transaction: StatementTransaction
}

export const updateTransaction = async ({
  transactionId,
  payload,
}: UpdateTransactionInput) => {
  const response = await api.patch<UpdateTransactionResponse>(
    `/api/v1/transactions/${transactionId}`,
    payload
  )

  return response.data.transaction
}

import type { AxiosInstance } from "axios"

import { apiClient } from "@/lib/api-client"

export type OverviewTotals = {
  balance: number
  income: number
  expenses: number
  savings?: number | null
}

export type AccountSummary = {
  id: string
  name: string
  balance: number
  type?: string | null
  institution?: string | null
  currency?: string | null
}

export type TransactionSummary = {
  id: string
  description: string
  amount: number
  date: string
  category?: string | null
  currency?: string | null
}

export type CategoryBreakdown = {
  name: string
  amount: number
  percentage: number
  color: string
}

export type DashboardOverviewResponse = {
  totals: OverviewTotals
  accounts: AccountSummary[]
  recentTransactions: TransactionSummary[]
  categoryBreakdown: CategoryBreakdown[]
}

const fallbackOverview: DashboardOverviewResponse = {
  totals: {
    balance: 12_850,
    income: 8_650,
    expenses: 5_230,
    savings: 2_740,
  },
  accounts: [
    {
      id: "acc_1",
      name: "Cuenta corriente",
      balance: 4_250,
      type: "checking",
      institution: "Banco Central",
      currency: "CLP",
    },
    {
      id: "acc_2",
      name: "Tarjeta premium",
      balance: -850,
      type: "credit",
      institution: "Banco Central",
      currency: "CLP",
    },
    {
      id: "acc_3",
      name: "Ahorros",
      balance: 8_900,
      type: "savings",
      institution: "Finanzas Digitales",
      currency: "CLP",
    },
  ],
  recentTransactions: [
    {
      id: "txn_1",
      description: "Pago de nómina",
      amount: 2_800,
      date: new Date().toISOString(),
      category: "Ingresos",
    },
    {
      id: "txn_2",
      description: "Supermercado",
      amount: -650,
      date: new Date().toISOString(),
      category: "Gastos esenciales",
    },
    {
      id: "txn_3",
      description: "Servicio de streaming",
      amount: -200,
      date: new Date().toISOString(),
      category: "Suscripciones",
    },
  ],
  categoryBreakdown: [
    { name: "Vivienda", amount: 1_800, percentage: 34, color: "#38bdf8" },
    { name: "Transporte", amount: 620, percentage: 12, color: "#34d399" },
    { name: "Estilo de vida", amount: 420, percentage: 8, color: "#facc15" },
    { name: "Ahorro", amount: 1_200, percentage: 23, color: "#a855f7" },
  ],
}

export const getDashboardOverview = async (
  client: AxiosInstance = apiClient
) => {
  try {
    const { data } = await client.get<DashboardOverviewResponse>(
      "/api/v1/dashboard/overview"
    )
    return data
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Falling back to mocked dashboard overview", error)
    }

    return fallbackOverview
  }
}

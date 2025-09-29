"use client"

import { useCallback, useMemo } from "react"

import { useQuery, useQueryClient } from "@tanstack/react-query"

import { useAuth } from "@/context/AuthContext"

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

type OverviewResponse = {
  totals: OverviewTotals | null
  accounts: AccountSummary[]
  recentTransactions: TransactionSummary[]
  categoryBreakdown: CategoryBreakdown[]
}

const QUERY_KEY = ["dashboard", "overview"]

const fallbackData: OverviewResponse = {
  totals: null,
  accounts: [],
  recentTransactions: [],
  categoryBreakdown: [],
}

export const useDashboardOverview = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
    []
  )

  const query = useQuery<OverviewResponse>({
    queryKey: QUERY_KEY,
    enabled: Boolean(user),
    placeholderData: fallbackData,
    queryFn: async () => {
      if (!user) {
        return fallbackData
      }

      const token = await user.getIdToken()
      const authHeaders = { Authorization: `Bearer ${token}` }

      // TODO: Reemplazar por integración real con el backend
      void authHeaders

      return {
        totals: {
          balance: 12850,
          income: 8650,
          expenses: 5230,
          savings: 2740,
        },
        accounts: [
          {
            id: "acc_1",
            name: "Cuenta corriente",
            balance: 4250,
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
            balance: 8900,
            type: "savings",
            institution: "Finanzas Digitales",
            currency: "CLP",
          },
        ],
        recentTransactions: [
          {
            id: "txn_1",
            description: "Pago de nómina",
            amount: 2800,
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
          { name: "Vivienda", amount: 1800, percentage: 34, color: "#38bdf8" },
          { name: "Transporte", amount: 620, percentage: 12, color: "#34d399" },
          { name: "Estilo de vida", amount: 420, percentage: 8, color: "#facc15" },
          { name: "Ahorro", amount: 1200, percentage: 23, color: "#a855f7" },
        ],
      }
    },
  })

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
    [queryClient]
  )

  const data = query.data ?? fallbackData

  return {
    ...data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refresh,
    apiBaseUrl,
  }
}

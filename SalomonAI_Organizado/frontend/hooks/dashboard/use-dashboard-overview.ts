"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

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

type OverviewState = {
  totals: OverviewTotals | null
  accounts: AccountSummary[]
  recentTransactions: TransactionSummary[]
  categoryBreakdown: CategoryBreakdown[]
  isLoading: boolean
  error: string | null
}

const initialState: OverviewState = {
  totals: null,
  accounts: [],
  recentTransactions: [],
  categoryBreakdown: [],
  isLoading: true,
  error: null,
}

export const useDashboardOverview = () => {
  const { user } = useAuth()
  const [state, setState] = useState<OverviewState>(initialState)

  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
    []
  )

  const fetchOverview = useCallback(async () => {
    if (!user) {
      setState((previous) => ({
        ...previous,
        isLoading: false,
        error: null,
      }))
      return
    }

    setState((previous) => ({ ...previous, isLoading: true, error: null }))

    try {
      const token = await user.getIdToken()
      const authHeaders = { Authorization: `Bearer ${token}` }

      // TODO: Reemplazar por integración real con el backend
      // const summaryResponse = await fetch(`${apiBaseUrl}/api/v1/dashboard/summary`, {
      //   headers: authHeaders,
      // })
      // const accountsResponse = await fetch(`${apiBaseUrl}/api/v1/dashboard/accounts`, {
      //   headers: authHeaders,
      // })
      // const transactionsResponse = await fetch(`${apiBaseUrl}/api/v1/dashboard/transactions/recent`, {
      //   headers: authHeaders,
      // })
      // const categoriesResponse = await fetch(`${apiBaseUrl}/api/v1/dashboard/categories`, {
      //   headers: authHeaders,
      // })
      // const [summaryData, accountsData, transactionsData, categoriesData] = await Promise.all([
      //   summaryResponse.json(),
      //   accountsResponse.json(),
      //   transactionsResponse.json(),
      //   categoriesResponse.json(),
      // ])

      void authHeaders

      setState({
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
        isLoading: false,
        error: null,
      })
    } catch (error) {
      console.error("Dashboard overview placeholder error", error)
      setState((previous) => ({
        ...previous,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "No pudimos cargar el resumen financiero.",
      }))
    }
  }, [apiBaseUrl, user])

  useEffect(() => {
    void fetchOverview()
  }, [fetchOverview])

  return {
    ...state,
    refresh: fetchOverview,
    apiBaseUrl,
  }
}

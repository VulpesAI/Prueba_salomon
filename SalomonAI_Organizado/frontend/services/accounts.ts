import { addHours, subDays, subHours } from "date-fns"
import type { Route } from "next"

import { ACCOUNT_COLOR_VARS, colorFromVar } from "@/lib/ui/account-colors"

export type AccountType = "checking" | "savings" | "credit" | "investment"

type AccountStatus = "operational" | "syncing" | "action_required" | "error"

type SyncStatus = "healthy" | "degraded" | "syncing"

type SyncJobStatus = "success" | "error" | "running"

export type LinkedAccount = {
  id: string
  institutionId: string
  name: string
  alias?: string
  type: AccountType
  number: string
  currency: string
  balance: number
  availableBalance: number
  status: AccountStatus
  lastSyncedAt: string
  updatedAt: string
  change30d: number
}

export type InstitutionLink = {
  id: string
  name: string
  institutionType: "Banco" | "Wallet" | "Fintech"
  provider: string
  status: SyncStatus
  lastSyncedAt: string
  nextSyncAt: string
  supportChannel: string
  accounts: LinkedAccount[]
}

export type AccountTypeSummary = {
  type: AccountType
  label: string
  balance: number
  accounts: number
  color: string
}

export type BalanceHistoryPoint = {
  date: string
  total: number
  checking: number
  savings: number
  credit: number
  investment: number
}

export type BalanceComparison = {
  accountId: string
  name: string
  institution: string
  institutionId: string
  type: AccountType
  balance: number
  change30d: number
}

export type BalanceAlert = {
  id: string
  severity: "high" | "medium" | "low"
  title: string
  description: string
  href: Route
}

type QuickAction = {
  id: string
  title: string
  description: string
  href: Route
}

export type SynchronizationJob = {
  id: string
  institutionId: string
  accountId: string
  accountName: string
  status: SyncJobStatus
  startedAt: string
  completedAt?: string
  durationSeconds: number
  message: string
}

export type SyncDiagnosticItem = {
  id: string
  title: string
  description: string
  status: "ok" | "attention" | "pending"
  action?: string
}

export type InstitutionRule = {
  id: string
  name: string
  description: string
  status: "active" | "paused"
  target: string
}

export type SyncHistoryEvent = {
  id: string
  status: SyncJobStatus
  startedAt: string
  completedAt?: string
  durationSeconds: number
  source: string
  details: string
}

const now = new Date()

const linkedInstitutions: InstitutionLink[] = [
  {
    id: "link-banco-central",
    name: "Banco Central",
    institutionType: "Banco",
    provider: "Belvo",
    status: "healthy",
    lastSyncedAt: subHours(now, 2).toISOString(),
    nextSyncAt: addHours(now, 10).toISOString(),
    supportChannel: "Mesa digital 24/7",
    accounts: [
      {
        id: "acc-corriente-001",
        institutionId: "link-banco-central",
        name: "Cuenta corriente",
        alias: "Operaciones diarias",
        type: "checking",
        number: "***1234",
        currency: "CLP",
        balance: 4_250_000,
        availableBalance: 4_100_000,
        status: "operational",
        lastSyncedAt: subHours(now, 2).toISOString(),
        updatedAt: subHours(now, 1).toISOString(),
        change30d: 0.08,
      },
      {
        id: "acc-credito-001",
        institutionId: "link-banco-central",
        name: "Tarjeta premium",
        alias: "Consumos", 
        type: "credit",
        number: "***5678",
        currency: "CLP",
        balance: -850_000,
        availableBalance: 1_200_000,
        status: "operational",
        lastSyncedAt: subHours(now, 3).toISOString(),
        updatedAt: subHours(now, 3).toISOString(),
        change30d: -0.05,
      },
    ],
  },
  {
    id: "link-finanzas-digitales",
    name: "Finanzas Digitales",
    institutionType: "Fintech",
    provider: "API propietaria",
    status: "degraded",
    lastSyncedAt: subHours(now, 6).toISOString(),
    nextSyncAt: addHours(now, 6).toISOString(),
    supportChannel: "Soporte prioritario",
    accounts: [
      {
        id: "acc-ahorro-001",
        institutionId: "link-finanzas-digitales",
        name: "Cuenta de ahorro",
        alias: "Colchón de seguridad",
        type: "savings",
        number: "***9012",
        currency: "CLP",
        balance: 6_800_000,
        availableBalance: 6_800_000,
        status: "action_required",
        lastSyncedAt: subHours(now, 6).toISOString(),
        updatedAt: subHours(now, 5).toISOString(),
        change30d: 0.12,
      },
      {
        id: "acc-inversion-001",
        institutionId: "link-finanzas-digitales",
        name: "Fondo dinámico",
        alias: "Inversiones", 
        type: "investment",
        number: "***3456",
        currency: "CLP",
        balance: 3_400_000,
        availableBalance: 3_400_000,
        status: "operational",
        lastSyncedAt: subHours(now, 6).toISOString(),
        updatedAt: subHours(now, 4).toISOString(),
        change30d: 0.04,
      },
    ],
  },
  {
    id: "link-wallet-one",
    name: "Wallet One",
    institutionType: "Wallet",
    provider: "Conector OAuth",
    status: "syncing",
    lastSyncedAt: subHours(now, 1).toISOString(),
    nextSyncAt: addHours(now, 2).toISOString(),
    supportChannel: "Chat en línea",
    accounts: [
      {
        id: "acc-wallet-001",
        institutionId: "link-wallet-one",
        name: "Saldo principal",
        alias: "Compras digitales",
        type: "checking",
        number: "***2222",
        currency: "CLP",
        balance: 450_000,
        availableBalance: 450_000,
        status: "syncing",
        lastSyncedAt: subHours(now, 1).toISOString(),
        updatedAt: subHours(now, 1).toISOString(),
        change30d: 0.02,
      },
    ],
  },
]

const accountTypeMetadata: Record<
  AccountType,
  { label: string; colorVar: (typeof ACCOUNT_COLOR_VARS)[AccountType]; color: string }
> = {
  checking: {
    label: "Cuentas corrientes",
    colorVar: ACCOUNT_COLOR_VARS.checking,
    color: colorFromVar(ACCOUNT_COLOR_VARS.checking),
  },
  savings: {
    label: "Ahorro",
    colorVar: ACCOUNT_COLOR_VARS.savings,
    color: colorFromVar(ACCOUNT_COLOR_VARS.savings),
  },
  credit: {
    label: "Crédito",
    colorVar: ACCOUNT_COLOR_VARS.credit,
    color: colorFromVar(ACCOUNT_COLOR_VARS.credit),
  },
  investment: {
    label: "Inversiones",
    colorVar: ACCOUNT_COLOR_VARS.investment,
    color: colorFromVar(ACCOUNT_COLOR_VARS.investment),
  },
}

const balanceHistory: BalanceHistoryPoint[] = Array.from({ length: 8 }).map((_, index) => {
  const date = subDays(now, (7 - index) * 7)
  const checking = 4_250_000 + index * 120_000
  const savings = 6_300_000 + index * 80_000
  const credit = -780_000 - index * 25_000
  const investment = 3_100_000 + index * 95_000

  return {
    date: date.toISOString(),
    total: checking + savings + investment + credit,
    checking,
    savings,
    credit,
    investment,
  }
})

const synchronizationJobs: SynchronizationJob[] = [
  {
    id: "job-001",
    institutionId: "link-banco-central",
    accountId: "acc-corriente-001",
    accountName: "Cuenta corriente",
    status: "success",
    startedAt: subHours(now, 2.5).toISOString(),
    completedAt: subHours(now, 2.3).toISOString(),
    durationSeconds: 120,
    message: "Sincronización completada sin observaciones",
  },
  {
    id: "job-002",
    institutionId: "link-finanzas-digitales",
    accountId: "acc-ahorro-001",
    accountName: "Cuenta de ahorro",
    status: "error",
    startedAt: subHours(now, 5).toISOString(),
    completedAt: subHours(now, 4.8).toISOString(),
    durationSeconds: 220,
    message: "Token expirado, se requiere reconexión",
  },
  {
    id: "job-003",
    institutionId: "link-wallet-one",
    accountId: "acc-wallet-001",
    accountName: "Saldo principal",
    status: "running",
    startedAt: subHours(now, 0.4).toISOString(),
    durationSeconds: 90,
    message: "Procesando movimientos del último día",
  },
]

const syncHistoryEvents: Record<string, SyncHistoryEvent[]> = {
  "link-banco-central": [
    {
      id: "hist-001",
      status: "success",
      startedAt: subDays(now, 1).toISOString(),
      completedAt: subDays(now, 1).toISOString(),
      durationSeconds: 140,
      source: "Belvo",
      details: "Se descargaron 120 movimientos",
    },
    {
      id: "hist-002",
      status: "success",
      startedAt: subDays(now, 2).toISOString(),
      completedAt: subDays(now, 2).toISOString(),
      durationSeconds: 180,
      source: "Belvo",
      details: "Actualización de balance y límites",
    },
  ],
  "link-finanzas-digitales": [
    {
      id: "hist-003",
      status: "error",
      startedAt: subDays(now, 1).toISOString(),
      completedAt: subDays(now, 1).toISOString(),
      durationSeconds: 200,
      source: "API propietaria",
      details: "Token vencido",
    },
    {
      id: "hist-004",
      status: "success",
      startedAt: subDays(now, 3).toISOString(),
      completedAt: subDays(now, 3).toISOString(),
      durationSeconds: 230,
      source: "API propietaria",
      details: "Sincronización completa",
    },
  ],
  "link-wallet-one": [
    {
      id: "hist-005",
      status: "success",
      startedAt: subDays(now, 2).toISOString(),
      completedAt: subDays(now, 2).toISOString(),
      durationSeconds: 100,
      source: "OAuth",
      details: "Sincronización incremental",
    },
  ],
}

const institutionRules: Record<string, InstitutionRule[]> = {
  "link-banco-central": [
    {
      id: "rule-001",
      name: "Etiquetar nóminas",
      description: "Clasifica pagos superiores a CLP 1.000.000 como ingresos de nómina",
      status: "active",
      target: "Movimientos",
    },
    {
      id: "rule-002",
      name: "Alertar sobregiros",
      description: "Notifica cuando el saldo de la tarjeta supere el 85% del cupo",
      status: "active",
      target: "Alertas",
    },
  ],
  "link-finanzas-digitales": [
    {
      id: "rule-003",
      name: "Traslado automático",
      description: "Sugerir traslado al fondo conservador cuando la variación semanal sea negativa",
      status: "paused",
      target: "Inversiones",
    },
  ],
  "link-wallet-one": [
    {
      id: "rule-004",
      name: "Límite diario",
      description: "Avisar cuando se gaste más de CLP 200.000 en un día",
      status: "active",
      target: "Wallet",
    },
  ],
}

const diagnostics: SyncDiagnosticItem[] = [
  {
    id: "diag-001",
    title: "Verificación de credenciales",
    description: "Token válido y con vigencia superior a 24 horas.",
    status: "ok",
  },
  {
    id: "diag-002",
    title: "Reintentos programados",
    description: "Se programó un reintento automático para la institución Finanzas Digitales.",
    status: "attention",
    action: "Revisar en sincronización",
  },
  {
    id: "diag-003",
    title: "Cobertura de datos",
    description: "3 de 3 instituciones están entregando balances diarios.",
    status: "ok",
  },
  {
    id: "diag-004",
    title: "Logs disponibles",
    description: "Los últimos 30 eventos están disponibles para descarga en CSV.",
    status: "pending",
    action: "Descargar cartola",
  },
]

const balanceAlerts: BalanceAlert[] = [
  {
    id: "alert-bal-001",
    severity: "high",
    title: "Saldo de tarjeta en descenso",
    description: "Tu tarjeta premium registró un aumento del 12% en consumo respecto a la semana anterior.",
    href: "/accounts/synchronization",
  },
  {
    id: "alert-bal-002",
    severity: "medium",
    title: "Ahorro con variación positiva",
    description: "La cuenta de ahorro creció CLP 250.000 este mes, puedes asignarlo a una meta.",
    href: "/goals",
  },
  {
    id: "alert-bal-003",
    severity: "low",
    title: "Wallet en equilibrio",
    description: "Sin movimientos relevantes los últimos 7 días.",
    href: "/accounts",
  },
]

const quickActions: QuickAction[] = [
  {
    id: "action-connect",
    title: "Conectar cuenta",
    description: "Integra una nueva institución bancaria o wallet en minutos.",
    href: "/accounts/synchronization?view=connect",
  },
  {
    id: "action-sync",
    title: "Forzar sincronización",
    description: "Ejecuta una actualización inmediata para una cuenta específica.",
    href: "/accounts/synchronization",
  },
  {
    id: "action-download",
    title: "Descargar cartola",
    description: "Obtén un extracto consolidado para conciliaciones manuales.",
    href: "/accounts/balances",
  },
]

export const getLinkedInstitutions = () => linkedInstitutions

export const getInstitutionById = (institutionId: string) =>
  linkedInstitutions.find((institution) => institution.id === institutionId)

export const getAccountTypeSummary = (): AccountTypeSummary[] => {
  const summaryMap = new Map<AccountType, { balance: number; accounts: number }>()

  linkedInstitutions.forEach((institution) => {
    institution.accounts.forEach((account) => {
      const current = summaryMap.get(account.type) ?? { balance: 0, accounts: 0 }

      summaryMap.set(account.type, {
        balance: current.balance + account.balance,
        accounts: current.accounts + 1,
      })
    })
  })

  return (Object.keys(accountTypeMetadata) as AccountType[]).map((type) => {
    const aggregated = summaryMap.get(type) ?? { balance: 0, accounts: 0 }

    return {
      type,
      label: accountTypeMetadata[type].label,
      color: accountTypeMetadata[type].color,
      balance: aggregated.balance,
      accounts: aggregated.accounts,
    }
  })
}

export const getBalanceHistory = () => balanceHistory

export const getBalanceComparisons = (): BalanceComparison[] =>
  linkedInstitutions.flatMap((institution) =>
    institution.accounts.map((account) => ({
      accountId: account.id,
      name: account.name,
      institution: institution.name,
      institutionId: institution.id,
      type: account.type,
      balance: account.balance,
      change30d: account.change30d,
    }))
  )

export const getBalanceAlerts = () => balanceAlerts

export const getSynchronizationJobs = () => synchronizationJobs

export const getSyncDiagnostics = () => diagnostics

export const getSyncHistoryForInstitution = (institutionId: string) =>
  syncHistoryEvents[institutionId] ?? []

export const getRulesForInstitution = (institutionId: string) =>
  institutionRules[institutionId] ?? []

export const getQuickAccountActions = (): QuickAction[] => quickActions

export const getInstitutionsSummary = () => {
  const institutions = getLinkedInstitutions()
  const totalBalance = institutions.reduce((acc, institution) => {
    return (
      acc +
      institution.accounts.reduce(
        (accountTotal, account) => accountTotal + account.balance,
        0
      )
    )
  }, 0)

  const totalAccounts = institutions.reduce(
    (acc, institution) => acc + institution.accounts.length,
    0
  )

  return {
    totalBalance,
    totalAccounts,
    totalInstitutions: institutions.length,
  }
}


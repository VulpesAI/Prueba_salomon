import { GraduationCap, Settings, ShieldCheck } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { Route } from "next"

export type NavBadgeVariant = "default" | "secondary" | "outline"

export type NavBadge = {
  label: string
  variant?: NavBadgeVariant
}

export type NavItem = {
  id: string
  label: string
  href: Route
  icon?: LucideIcon
  description?: string
  badge?: NavBadge
  exact?: boolean
  quickAction?: boolean
}

export type NavSection = { id: string; label: string; items: NavItem[] }

export const NAV_SECTIONS_BASE: NavSection[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    items: [
      { id: "overview", label: "Resumen general", href: "/dashboard/overview" },
      { id: "insights", label: "Insights", href: "/dashboard/insights" },
    ],
  },
  {
    id: "accounts",
    label: "Cuentas",
    items: [
      { id: "accounts-overview", label: "Resumen de cuentas", href: "/accounts" },
      { id: "accounts-balances", label: "Saldos", href: "/accounts/balances" },
      { id: "accounts-sync", label: "Sincronización", href: "/accounts/synchronization" },
    ],
  },
  {
    id: "transactions",
    label: "Transacciones",
    items: [
      { id: "transactions-list", label: "Movimientos", href: "/transactions" },
      { id: "transactions-export", label: "Exportar", href: "/transactions/export" },
      { id: "transactions-advanced", label: "Búsqueda avanzada", href: "/transactions/advanced-search" },
      { id: "transactions-classification", label: "Clasificación", href: "/transactions/classification" },
      { id: "transactions-summaries", label: "Resúmenes", href: "/transactions/summaries" },
    ],
  },
  {
    id: "analytics",
    label: "Analítica e IA",
    items: [
      { id: "analytics-categories", label: "Categorías", href: "/analytics/categories" },
      { id: "analytics-forecasts", label: "Pronósticos", href: "/analytics/forecasts" },
      { id: "analytics-recommendations", label: "Recomendaciones", href: "/analytics/recommendations" },
      { id: "analytics-insights", label: "Insights avanzados", href: "/analytics/insights" },
    ],
  },
  {
    id: "goals",
    label: "Metas",
    items: [
      { id: "goals-tracking", label: "Seguimiento de metas", href: "/goals" },
    ],
  },
  {
    id: "alerts",
    label: "Alertas",
    items: [
      { id: "alerts-center", label: "Centro de alertas", href: "/alerts" },
      { id: "alerts-history", label: "Historial", href: "/alerts/history" },
      { id: "alerts-preferences", label: "Preferencias", href: "/alerts/preferences" },
      { id: "alerts-notifications", label: "Notificaciones", href: "/notifications" },
    ],
  },
  {
    id: "assistant",
    label: "Asistente",
    items: [
      { id: "assistant-bot", label: "Asistente financiero", href: "/assistant" },
    ],
  },
  {
    id: "settings",
    label: "Configuración",
    items: [
      {
        id: "settings-profile",
        label: "Perfil",
        href: "/settings/profile",
        icon: Settings,
        description: "Datos personales, preferencias y carga manual de cartolas",
      },
      {
        id: "settings-security",
        label: "Seguridad",
        href: "/settings/security",
        icon: ShieldCheck,
        description: "Accesos y autenticación",
      },
      {
        id: "settings-notifications",
        label: "Notificaciones",
        href: "/settings/notifications",
        icon: GraduationCap,
        description: "Alertas de correo y push",
      },
    ],
  },
]

export const NAV_ALIASES: Partial<Record<Route, string>> = {
  "/accounts": "Resumen de cuentas",
  "/accounts/balances": "Saldos",
  "/accounts/synchronization": "Sincronización",
  "/transactions": "Movimientos",
  "/alerts/preferences": "Preferencias",
  "/settings/profile": "Perfil",
}

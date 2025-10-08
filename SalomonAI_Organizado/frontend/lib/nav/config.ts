import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bell,
  Bot,
  Brain,
  ChartBarStacked,
  ChartLine,
  Compass,
  CreditCard,
  FileText,
  Goal,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  ListTree,
  PiggyBank,
  PieChart,
  Settings,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react"
import type { Route } from "next"
import type { LucideIcon } from "lucide-react"

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

export type NavSection = {
  id: string
  label: string
  items: NavItem[]
}

export const NAV_SECTIONS_BASE: NavSection[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    items: [
      {
        id: "overview",
        label: "Resumen general",
        href: "/dashboard/overview",
        icon: LayoutDashboard,
        description: "Métricas clave de tus finanzas",
        exact: true,
      },
      {
        id: "insights",
        label: "Insights",
        href: "/dashboard/insights",
        icon: Brain,
        description: "Hallazgos generados por IA",
        badge: { label: "IA", variant: "secondary" },
      },
    ],
  },
  {
    id: "accounts",
    label: "Cuentas",
    items: [
      {
        id: "accounts-overview",
        label: "Resumen de cuentas",
        href: "/accounts",
        icon: Wallet,
        description: "Estado consolidado de tus cuentas",
        quickAction: true,
      },
      {
        id: "accounts-detail",
        label: "Detalle de cuenta",
        href: "/accounts",
        icon: CreditCard,
        description: "Información de una cuenta vinculada",
      },
      {
        id: "accounts-balances",
        label: "Saldos",
        href: "/accounts/balances",
        icon: ChartBarStacked,
        description: "Evolución de saldos históricos",
      },
      {
        id: "accounts-sync",
        label: "Sincronización",
        href: "/accounts/synchronization",
        icon: ListTree,
        description: "Estados de actualización con instituciones",
      },
    ],
  },
  {
    id: "transactions",
    label: "Transacciones",
    items: [
      {
        id: "transactions-list",
        label: "Movimientos",
        href: "/transactions",
        icon: Activity,
        description: "Historial y búsqueda básica",
        quickAction: true,
      },
      {
        id: "transactions-statements",
        label: "Cartolas",
        href: "/statements",
        icon: FileText,
        description: "Carga manual y estado de procesamiento",
      },
      {
        id: "transactions-advanced",
        label: "Búsqueda avanzada",
        href: "/transactions/advanced-search",
        icon: Compass,
        description: "Filtros combinados para auditoría",
      },
      {
        id: "transactions-classification",
        label: "Clasificación",
        href: "/transactions/classification",
        icon: PieChart,
        description: "Etiquetado automático y reglas",
      },
      {
        id: "transactions-summaries",
        label: "Resúmenes",
        href: "/transactions/summaries",
        icon: ChartLine,
        description: "Agrupaciones por categoría y periodo",
      },
    ],
  },
  {
    id: "analytics",
    label: "Analítica e IA",
    items: [
      {
        id: "analytics-categories",
        label: "Categorías",
        href: "/analytics/categories",
        icon: PieChart,
        description: "Distribución de gastos e ingresos",
      },
      {
        id: "analytics-forecasts",
        label: "Pronósticos",
        href: "/analytics/forecasts",
        icon: LineChart,
        description: "Proyecciones de flujo de caja",
        badge: { label: "Beta", variant: "outline" },
      },
      {
        id: "analytics-recommendations",
        label: "Recomendaciones",
        href: "/analytics/recommendations",
        icon: Sparkles,
        description: "Acciones sugeridas por IA",
      },
      {
        id: "analytics-insights",
        label: "Insights avanzados",
        href: "/analytics/insights",
        icon: Bot,
        description: "Narrativas automáticas",
      },
    ],
  },
  {
    id: "goals",
    label: "Metas",
    items: [
      {
        id: "goals-tracking",
        label: "Seguimiento de metas",
        href: "/goals",
        icon: Goal,
        description: "Estado y progreso consolidado",
      },
      {
        id: "goals-detail",
        label: "Detalle de meta",
        href: "/goals",
        icon: PiggyBank,
        description: "Configuración y eventos de una meta",
      },
    ],
  },
  {
    id: "alerts",
    label: "Alertas",
    items: [
      {
        id: "alerts-center",
        label: "Centro de alertas",
        href: "/alerts",
        icon: AlertCircle,
        description: "Alertas en tiempo real",
      },
      {
        id: "alerts-history",
        label: "Historial",
        href: "/alerts/history",
        icon: AlertTriangle,
        description: "Eventos pasados y resolución",
      },
      {
        id: "alerts-notifications",
        label: "Historial de notificaciones",
        href: "/notifications",
        icon: Bell,
        description: "Envíos por canal y estado de lectura consolidado.",
      },
      {
        id: "alerts-preferences",
        label: "Preferencias",
        href: "/alerts/preferences",
        icon: ShieldCheck,
        description: "Canales y reglas de notificación",
      },
    ],
  },
  {
    id: "assistant",
    label: "Asistente",
    items: [
      {
        id: "assistant-bot",
        label: "Asistente financiero",
        href: "/assistant",
        icon: Bot,
        description: "Chat inteligente contextual",
        quickAction: true,
      },
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
        description:
          "Datos personales, preferencias y carga manual de cartolas",
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

export const NAV_ALIASES: Record<string, string> = {
  "/accounts": "Resumen de cuentas",
  "/accounts/balances": "Saldos",
  "/accounts/synchronization": "Sincronización",
  "/transactions": "Movimientos",
  "/alerts/preferences": "Preferencias",
  "/settings/profile": "Perfil",
}

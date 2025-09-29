import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bot,
  Brain,
  Bell,
  ChartBarStacked,
  ChartLine,
  Compass,
  CreditCard,
  Goal,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  ListTree,
  PieChart,
  PiggyBank,
  Settings,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react"

import type { LucideIcon } from "lucide-react"

export type NavigationBadgeVariant = "default" | "secondary" | "outline"

export type NavigationBadge = {
  label: string
  variant?: NavigationBadgeVariant
}

export type NavigationItem = {
  title: string
  href: string
  icon: LucideIcon
  description?: string
  badge?: NavigationBadge
  exact?: boolean
  quickAction?: boolean
}

export type NavigationGroup = {
  title: string
  items: NavigationItem[]
}

export const postLoginNavigation: NavigationGroup[] = [
  {
    title: "Dashboard",
    items: [
      {
        title: "Resumen general",
        href: "/dashboard/overview",
        icon: LayoutDashboard,
        description: "Métricas clave de tus finanzas",
        exact: true,
      },
      {
        title: "Insights",
        href: "/dashboard/insights",
        icon: Brain,
        description: "Hallazgos generados por IA",
        badge: { label: "IA", variant: "secondary" },
      },
    ],
  },
  {
    title: "Cuentas",
    items: [
      {
        title: "Resumen de cuentas",
        href: "/accounts",
        icon: Wallet,
        description: "Estado consolidado de tus cuentas",
        quickAction: true,
      },
      {
        title: "Detalle de cuenta",
        href: "/accounts/[linkId]",
        icon: CreditCard,
        description: "Información de una cuenta vinculada",
      },
      {
        title: "Saldos",
        href: "/accounts/balances",
        icon: ChartBarStacked,
        description: "Evolución de saldos históricos",
      },
      {
        title: "Sincronización",
        href: "/accounts/synchronization",
        icon: ListTree,
        description: "Estados de actualización con instituciones",
      },
    ],
  },
  {
    title: "Transacciones",
    items: [
      {
        title: "Movimientos",
        href: "/transactions",
        icon: Activity,
        description: "Historial y búsqueda básica",
        quickAction: true,
      },
      {
        title: "Búsqueda avanzada",
        href: "/transactions/advanced-search",
        icon: Compass,
        description: "Filtros combinados para auditoría",
      },
      {
        title: "Clasificación",
        href: "/transactions/classification",
        icon: PieChart,
        description: "Etiquetado automático y reglas",
      },
      {
        title: "Resúmenes",
        href: "/transactions/summaries",
        icon: ChartLine,
        description: "Agrupaciones por categoría y periodo",
      },
    ],
  },
  {
    title: "Analítica e IA",
    items: [
      {
        title: "Categorías",
        href: "/analytics/categories",
        icon: PieChart,
        description: "Distribución de gastos e ingresos",
      },
      {
        title: "Pronósticos",
        href: "/analytics/forecasts",
        icon: LineChart,
        description: "Proyecciones de flujo de caja",
        badge: { label: "Beta", variant: "outline" },
      },
      {
        title: "Recomendaciones",
        href: "/analytics/recommendations",
        icon: Sparkles,
        description: "Acciones sugeridas por IA",
      },
      {
        title: "Insights avanzados",
        href: "/analytics/insights",
        icon: Bot,
        description: "Narrativas automáticas",
      },
    ],
  },
  {
    title: "Metas",
    items: [
      {
        title: "Seguimiento de metas",
        href: "/goals",
        icon: Goal,
        description: "Estado y progreso consolidado",
      },
      {
        title: "Detalle de meta",
        href: "/goals/[goalId]",
        icon: PiggyBank,
        description: "Configuración y eventos de una meta",
      },
    ],
  },
  {
    title: "Alertas",
    items: [
      {
        title: "Centro de alertas",
        href: "/alerts",
        icon: AlertCircle,
        description: "Alertas en tiempo real",
      },
      {
        title: "Historial",
        href: "/alerts/history",
        icon: AlertTriangle,
        description: "Eventos pasados y resolución",
      },
      {
        title: "Historial de notificaciones",
        href: "/notifications",
        icon: Bell,
        description: "Envíos por canal y estado de lectura consolidado.",
      },
      {
        title: "Preferencias",
        href: "/alerts/preferences",
        icon: ShieldCheck,
        description: "Canales y reglas de notificación",
      },
    ],
  },
  {
    title: "Asistente",
    items: [
      {
        title: "Asistente financiero",
        href: "/assistant",
        icon: Bot,
        description: "Chat inteligente contextual",
        quickAction: true,
      },
    ],
  },
  {
    title: "Configuración",
    items: [
      {
        title: "Perfil",
        href: "/settings/profile",
        icon: Settings,
        description: "Datos personales y preferencias",
      },
      {
        title: "Seguridad",
        href: "/settings/security",
        icon: ShieldCheck,
        description: "Accesos y autenticación",
      },
      {
        title: "Notificaciones",
        href: "/settings/notifications",
        icon: GraduationCap,
        description: "Alertas de correo y push",
      },
    ],
  },
]

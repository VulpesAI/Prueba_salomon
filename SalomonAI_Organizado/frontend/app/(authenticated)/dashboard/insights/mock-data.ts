export type InsightPriorityLevel = "alta" | "media" | "baja"

type PriorityInsight = {
  id: string
  title: string
  summary: string
  impact: string
  helper: string
  priority: InsightPriorityLevel
  actionLabel: string
  actionHref: string
}

type HighlightInsight = {
  id: string
  title: string
  description: string
  icon: "sparkles" | "trendingUp" | "shield"
  badgeLabel: string
  badgeVariant: "secondary" | "outline"
}

type NarrativeInsight = {
  id: string
  title: string
  summary: string
  focus: string
  audience: string
  updatedAt: string
  href: string
}

type VersionHistoryItem = {
  id: string
  status: "published" | "scheduled" | "draft"
  date: string
  title: string
  description: string
}

type HeaderAction = {
  id: string
  label: string
  href: string
  icon: "radar" | "download" | "share"
  variant: "default" | "secondary" | "outline"
}

type FollowUpAction = {
  id: string
  title: string
  description: string
  href: string
  label: string
}

export const dashboardInsightsMock = {
  headerActions: [
    {
      id: "advanced-analytics",
      label: "Analítica avanzada",
      href: "/analytics/advanced",
      icon: "radar",
      variant: "default",
    },
    {
      id: "export-insights",
      label: "Exportar insights",
      href: "/dashboard/insights/export",
      icon: "download",
      variant: "outline",
    },
    {
      id: "share-insights",
      label: "Compartir con equipo",
      href: "/share/insights",
      icon: "share",
      variant: "secondary",
    },
  ] satisfies HeaderAction[],
  priorities: [
    {
      id: "cashflow-pressure",
      title: "Presión de flujo de caja en 21 días",
      summary:
        "Los gastos operacionales crecieron 12% respecto al promedio trimestral y adelantarían el déficit a la tercera semana del mes.",
      impact: "Déficit proyectado: -$18.5M",
      helper: "Activa escenarios de liquidez para priorizar pagos críticos.",
      priority: "alta",
      actionLabel: "Abrir proyección de flujo",
      actionHref: "/analytics/cashflow",
    },
    {
      id: "revenue-opportunity",
      title: "Upsell en clientes con alto margen",
      summary:
        "Los clientes premium muestran un 8.4% de menor churn tras activar campañas cross-sell en canales digitales.",
      impact: "Ingreso potencial: +$24M trimestral",
      helper: "Replica mensajes en cohortes con comportamiento similar.",
      priority: "media",
      actionLabel: "Abrir segmento recomendado",
      actionHref: "/analytics/clientes/premium",
    },
    {
      id: "expense-leakage",
      title: "Fugas en gastos de proveedores logísticos",
      summary:
        "Se detectaron cargos duplicados en 3 proveedores con contratos indexados por tipo de cambio.",
      impact: "Recuperación estimada: $6.2M",
      helper: "Validar conciliación automática antes del cierre semanal.",
      priority: "alta",
      actionLabel: "Revisar conciliaciones",
      actionHref: "/analytics/proveedores",
    },
  ] satisfies PriorityInsight[],
  highlights: [
    {
      id: "ai-detection",
      title: "Detección automática de anomalías",
      description:
        "Modelo identifica patrones fuera de rango en gastos variables con 94% de precisión.",
      icon: "sparkles",
      badgeLabel: "IA en tiempo real",
      badgeVariant: "secondary",
    },
    {
      id: "growth-signal",
      title: "Señal de crecimiento en suscripciones",
      description:
        "La cohorte adquirida en abril mantiene 3x engagement frente a cohortes previas.",
      icon: "trendingUp",
      badgeLabel: "Oportunidad",
      badgeVariant: "outline",
    },
    {
      id: "risk-coverage",
      title: "Cobertura de riesgo actualizada",
      description:
        "El 87% de los vencimientos en dólares ya cuentan con cobertura cambiaria vigente.",
      icon: "shield",
      badgeLabel: "Estabilidad",
      badgeVariant: "outline",
    },
  ] satisfies HighlightInsight[],
  narratives: [
    {
      id: "executive-briefing",
      title: "Resumen ejecutivo Q2",
      summary:
        "La rentabilidad operativa se mantiene sobre el plan gracias a eficiencias en logística y renegociación de contratos.",
      focus: "Margen operacional",
      audience: "Dirección",
      updatedAt: "2024-05-04",
      href: "/analytics/insights/resumen-ejecutivo",
    },
    {
      id: "collections-story",
      title: "Storytelling cartera de cobranzas",
      summary:
        "La cartera riesgosa se redujo 18% tras el piloto de recordatorios omnicanal y priorización por scoring.",
      focus: "Liquidez",
      audience: "Finanzas",
      updatedAt: "2024-05-06",
      href: "/analytics/insights/cobranzas",
    },
    {
      id: "commerce-update",
      title: "Narrativa ecommerce",
      summary:
        "Conversión móvil creció 2.4 puntos impulsada por mejoras UX y campañas regionales.",
      focus: "Crecimiento",
      audience: "Comercial",
      updatedAt: "2024-05-02",
      href: "/analytics/insights/ecommerce",
    },
  ] satisfies NarrativeInsight[],
  versionHistory: [
    {
      id: "release-mayo",
      status: "published",
      date: "2024-05-07",
      title: "Publicación Mayo · Directorio",
      description: "Incluye nueva sección de liquidez y anexos comparativos vs. presupuesto.",
    },
    {
      id: "draft-comercial",
      status: "draft",
      date: "2024-05-09",
      title: "Borrador Comercial",
      description: "Pendiente validar cifras de conversión regional antes de compartir.",
    },
    {
      id: "release-junio",
      status: "scheduled",
      date: "2024-06-03",
      title: "Entrega mensual stakeholders",
      description: "Programado para envío automático con versión comparativa del último trimestre.",
    },
  ] satisfies VersionHistoryItem[],
  followUpActions: [
    {
      id: "liquidity-simulations",
      title: "Simular escenarios de liquidez",
      description: "Prioriza pagos críticos y automatiza alertas de caja para las próximas 6 semanas.",
      href: "/analytics/cashflow/simulaciones",
      label: "Abrir simulador",
    },
    {
      id: "share-playbook",
      title: "Compartir playbook con stakeholders",
      description: "Envía historias preformateadas con KPIs clave y recomendaciones.",
      href: "/share/insights/playbook",
      label: "Configurar envío",
    },
  ] satisfies FollowUpAction[],
} as const

export type DashboardInsightsMock = typeof dashboardInsightsMock

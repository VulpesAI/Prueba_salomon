export type InsightPriorityLevel = "alta" | "media" | "baja"

export type PriorityInsight = {
  id: string
  title: string
  summary: string
  impact: string
  helper: string
  priority: InsightPriorityLevel
  actionLabel: string
  actionHref: string
}

export type HighlightInsight = {
  id: string
  title: string
  description: string
  icon: "sparkles" | "trendingUp" | "shield"
  badgeLabel: string
  badgeVariant: "secondary" | "outline"
}

export type NarrativeInsight = {
  id: string
  title: string
  summary: string
  focus: string
  audience: string
  updatedAt: string
  href: string
}

export type VersionHistoryItem = {
  id: string
  status: "published" | "scheduled" | "draft"
  date: string
  title: string
  description: string
}

export type FollowUpAction = {
  id: string
  title: string
  description: string
  href: string
  label: string
}

export const personalBudgetFallback = {
  priorities: [
    {
      id: "cashflow-balance",
      title: "Cuida tu flujo de caja para el próximo mes",
      summary:
        "Tus gastos proyectados superan a los ingresos promedio. Ajusta tus pagos para proteger tu saldo disponible.",
      impact: "Déficit estimado: $-180.000 CLP",
      helper: "Reordena tus pagos variables y posterga lo prescindible.",
      priority: "alta",
      actionLabel: "Revisar flujo",
      actionHref: "/dashboard/overview#flujo",
    },
    {
      id: "category-focus",
      title: "Define un tope para tus gastos en ocio",
      summary:
        "La categoría Ocio concentra gran parte del presupuesto mensual. Establece un monto máximo para cada semana.",
      impact: "Participación: 32% del gasto",
      helper: "Agenda una alerta automática cuando alcances el tope.",
      priority: "media",
      actionLabel: "Configurar alerta",
      actionHref: "/dashboard/notifications",
    },
    {
      id: "savings-surplus",
      title: "Usa tu excedente a favor del ahorro",
      summary:
        "Registra un superávit este mes. Aprovecha el excedente para adelantar tu meta de fondo de emergencia.",
      impact: "Superávit estimado: $95.000 CLP",
      helper: "Traslada el excedente a tu cuenta de ahorro apenas recibas tus ingresos.",
      priority: "baja",
      actionLabel: "Planificar ahorro",
      actionHref: "/dashboard/goals",
    },
  ] satisfies PriorityInsight[],
  highlights: [
    {
      id: "savings-rate",
      title: "Mejoraste tu tasa de ahorro",
      description: "Tu tasa de ahorro mensual creció 3 puntos gracias a aportes automáticos.",
      icon: "sparkles",
      badgeLabel: "Buen hábito",
      badgeVariant: "secondary",
    },
    {
      id: "spending-alert",
      title: "Alerta preventiva activa",
      description: "Configura recordatorios antes de exceder tu presupuesto en compras personales.",
      icon: "trendingUp",
      badgeLabel: "Control",
      badgeVariant: "outline",
    },
    {
      id: "safety-cushion",
      title: "Tu colchón financiero crece",
      description: "Los depósitos recurrentes aumentaron tu fondo de emergencia durante tres semanas consecutivas.",
      icon: "shield",
      badgeLabel: "Seguridad",
      badgeVariant: "outline",
    },
  ] satisfies HighlightInsight[],
  narratives: [
    {
      id: "monthly-budget",
      title: "Tu presupuesto personal del mes",
      summary:
        "Ingresos y gastos mantienen una tendencia positiva. Conserva un margen de ahorro para acelerar tus metas.",
      focus: "Presupuesto",
      audience: "Tu plan personal",
      updatedAt: "2024-05-10",
      href: "/dashboard/recommendations",
    },
    {
      id: "alerts-story",
      title: "Lo que dicen tus alertas predictivas",
      summary:
        "Las alertas te ayudan a anticipar desbalances. Ajusta tus gastos variables antes de que se conviertan en un problema.",
      focus: "Alertas",
      audience: "Tu plan personal",
      updatedAt: "2024-05-09",
      href: "/dashboard/notifications",
    },
    {
      id: "habit-tracker",
      title: "Hábitos financieros en marcha",
      summary:
        "Tu meta de emergencia avanza según lo previsto. Mantén los aportes para consolidar el hábito.",
      focus: "Hábitos",
      audience: "Tu plan personal",
      updatedAt: "2024-05-08",
      href: "/dashboard/goals",
    },
  ] satisfies NarrativeInsight[],
  versionHistory: [
    {
      id: "budget-update",
      status: "published",
      date: "2024-05-07",
      title: "Revisión mensual del presupuesto",
      description: "Ajustaste tus categorías y registraste el nuevo saldo inicial en CLP.",
    },
    {
      id: "habit-check",
      status: "scheduled",
      date: "2024-05-12",
      title: "Seguimiento de hábitos",
      description: "Programaste un recordatorio semanal para registrar tus gastos manualmente.",
    },
    {
      id: "alert-fine-tune",
      status: "draft",
      date: "2024-05-15",
      title: "Ajuste de alertas predictivas",
      description: "Pendiente definir nuevos umbrales para compras online en CLP.",
    },
  ] satisfies VersionHistoryItem[],
  followUpActions: [
    {
      id: "schedule-transfer",
      title: "Agenda tu transferencia de ahorro",
      description: "Programa una transferencia automática apenas recibas tu ingreso.",
      href: "/dashboard/goals",
      label: "Configurar hábito",
    },
    {
      id: "track-expenses",
      title: "Registra gastos variables cada semana",
      description: "Anota tus compras menores para mantener el control del presupuesto.",
      href: "/dashboard/transactions",
      label: "Abrir registro",
    },
  ] satisfies FollowUpAction[],
} as const

export type PersonalBudgetFallback = typeof personalBudgetFallback

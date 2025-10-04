'use client'

import { useMemo } from "react"

export type AssistantMessageStatus = "sent" | "loading" | "error"
export type AssistantMessageRole = "user" | "assistant" | "system"

export interface AssistantMessage {
  id: string
  role: AssistantMessageRole
  content: string
  timestamp: string
  status?: AssistantMessageStatus
  note?: string
}

export type AssistantConversationState = "idle" | "responding" | "error"

export interface AssistantConversationSummary {
  highlights: string[]
  nextSteps: string[]
  blockers?: string[]
}

export interface AssistantConversation {
  id: string
  title: string
  updatedAt: string
  preview: string
  pinned?: boolean
  state: AssistantConversationState
  messages: AssistantMessage[]
  summary: AssistantConversationSummary
}

export type PlaybookStatus = "scheduled" | "running" | "ready" | "error"

export interface AssistantPlaybook {
  id: string
  name: string
  description: string
  status: PlaybookStatus
  updatedAt: string
  successRate: number
  owner: string
  nextRun?: string
}

export interface AssistantResource {
  id: string
  title: string
  description: string
  href: string
  type: "reporte" | "guía" | "dashboard"
  cta: string
}

export interface AssistantAutomation {
  id: string
  title: string
  description: string
  impact: string
  href: string
}

export interface AssistantMockData {
  conversations: AssistantConversation[]
  playbooks: AssistantPlaybook[]
  resources: AssistantResource[]
  automations: AssistantAutomation[]
}

export function useAssistantMock(): AssistantMockData {
  return useMemo(() => {
    const conversations: AssistantConversation[] = [
      {
        id: "closing-april",
        title: "Cierre mensual de abril",
        updatedAt: "Hace 2 horas",
        preview: "Conciliamos bancos y detectamos variaciones relevantes en caja.",
        pinned: true,
        state: "responding",
        messages: [
          {
            id: "m-1",
            role: "user",
            content:
              "Necesito un resumen del cierre de abril y alertas de desviaciones relevantes respecto a marzo.",
            timestamp: "09:12",
            status: "sent",
          },
          {
            id: "m-2",
            role: "assistant",
            content:
              "Preparé el resumen financiero del mes. Ingresos +12 % vs marzo y reducción de gastos operativos del 6 %. Destaca el incremento en cobros a clientes enterprise.",
            timestamp: "09:14",
            status: "sent",
          },
          {
            id: "m-3",
            role: "assistant",
            content:
              "Estoy proyectando el flujo de caja para validar la liquidez en los próximos 45 días…",
            timestamp: "09:15",
            status: "loading",
            note: "Generando escenarios con tus fuentes conectadas",
          },
        ],
        summary: {
          highlights: [
            "Ingresos recurrentes +12 % respecto a marzo.",
            "Margen bruto se mantiene en 64 %, por encima del objetivo.",
            "Eficiencia en cobros: 87 % de facturas dentro de SLA.",
          ],
          nextSteps: [
            "Validar el escenario conservador del flujo de caja con el equipo de tesorería.",
            "Programar recordatorios automáticos para cuentas por cobrar > 20 días.",
            "Actualizar presupuesto de gastos variables con las nuevas proyecciones.",
          ],
          blockers: [
            "Pendiente confirmar importaciones desde el ERP para gastos de logística.",
          ],
        },
      },
      {
        id: "forecast-q3",
        title: "Preparación forecast Q3",
        updatedAt: "Ayer",
        preview: "Simulamos escenarios de ventas y rotación de inventario.",
        state: "error",
        messages: [
          {
            id: "m-4",
            role: "user",
            content:
              "Genera un forecast de ingresos para Q3 considerando el pipeline comercial y el histórico de conversiones.",
            timestamp: "17:48",
            status: "sent",
          },
          {
            id: "m-5",
            role: "assistant",
            content:
              "No pude acceder a las oportunidades más recientes en el CRM. ¿Quieres que reintente con los datos de la última sincronización?",
            timestamp: "17:49",
            status: "error",
            note: "Revisa la conexión con Salesforce - credenciales expiradas",
          },
        ],
        summary: {
          highlights: [
            "Último forecast disponible indica crecimiento del 18 %.",
            "Se identificaron tres cuentas clave en riesgo de churn.",
          ],
          nextSteps: [
            "Restablecer credenciales del CRM para sincronizar pipeline actualizado.",
            "Actualizar supuestos de conversión con el equipo comercial.",
          ],
        },
      },
      {
        id: "cash-variations",
        title: "Variaciones de caja semanales",
        updatedAt: "Hace 3 días",
        preview: "Automatizamos insights de flujo de caja semanal.",
        state: "idle",
        messages: [
          {
            id: "m-6",
            role: "user",
            content:
              "Muéstrame las variaciones de caja de la última semana y su causa raíz.",
            timestamp: "11:02",
            status: "sent",
          },
          {
            id: "m-7",
            role: "assistant",
            content:
              "La caja aumentó 9 % principalmente por recuperación de cartera vencida y diferimiento de pagos a proveedores estratégicos.",
            timestamp: "11:03",
            status: "sent",
          },
        ],
        summary: {
          highlights: [
            "Incremento de caja de 9 % semana vs semana.",
            "Campaña de cobro redujo facturas vencidas en 4 días promedio.",
          ],
          nextSteps: [
            "Mantener seguimiento diario a pagos diferidos para evitar riesgos de suministro.",
            "Enviar reporte automatizado al comité financiero cada lunes.",
          ],
        },
      },
    ]

    const playbooks: AssistantPlaybook[] = [
      {
        id: "pb-1",
        name: "Conciliación bancaria avanzada",
        description:
          "Ejecuta conciliaciones con múltiple banca, detecta discrepancias y propone ajustes contables.",
        status: "running",
        updatedAt: "Hace 5 minutos",
        successRate: 0.94,
        owner: "Tesorería",
        nextRun: "12:45",
      },
      {
        id: "pb-2",
        name: "Seguimiento de cobranza",
        description:
          "Orquesta recordatorios automáticos y prioriza cuentas por riesgo de mora.",
        status: "scheduled",
        updatedAt: "Hace 1 hora",
        successRate: 0.88,
        owner: "Revenue Ops",
        nextRun: "Mañana 09:00",
      },
      {
        id: "pb-3",
        name: "Forecast de ingresos colaborativo",
        description:
          "Integra datos comerciales y financieros para alinear al comité de crecimiento.",
        status: "error",
        updatedAt: "Ayer",
        successRate: 0.71,
        owner: "Planeación",
      },
    ]

    const resources: AssistantResource[] = [
      {
        id: "rs-1",
        title: "Reporte de resultados Abril 2024",
        description: "Dashboard en Looker con indicadores clave y detalle por unidad de negocio.",
        href: "/(authenticated)/analytics/insights",
        type: "dashboard",
        cta: "Abrir dashboard",
      },
      {
        id: "rs-2",
        title: "Guía de cierres contables eficientes",
        description: "Buenas prácticas de Salomón AI para acelerar cierres mensuales sin perder control.",
        href: "/docs/cierres",
        type: "guía",
        cta: "Leer guía",
      },
      {
        id: "rs-3",
        title: "Checklist automatizado de cobranza",
        description: "Plantilla editable para coordinar tareas con el equipo de cuentas por cobrar.",
        href: "/(authenticated)/transactions/summaries",
        type: "reporte",
        cta: "Revisar checklist",
      },
    ]

    const automations: AssistantAutomation[] = [
      {
        id: "auto-1",
        title: "Activar monitoreo de flujo de caja",
        description: "Configura alertas diarias sobre variaciones relevantes y predice brechas de liquidez.",
        impact: "Impacto alto",
        href: "/(authenticated)/analytics/forecasts",
      },
      {
        id: "auto-2",
        title: "Sincronizar pipeline comercial",
        description: "Actualiza el forecast con los datos más recientes del CRM sin salir del asistente.",
        impact: "Impacto medio",
        href: "/(authenticated)/integrations",
      },
      {
        id: "auto-3",
        title: "Clasificar gastos automáticamente",
        description: "Entrena al modelo con tus políticas y reduce el trabajo manual del equipo contable.",
        impact: "Impacto alto",
        href: "/(authenticated)/transactions/classification",
      },
    ]

    return {
      conversations,
      playbooks,
      resources,
      automations,
    }
  }, [])
}

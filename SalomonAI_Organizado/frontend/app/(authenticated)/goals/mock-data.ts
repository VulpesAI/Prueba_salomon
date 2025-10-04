export type GoalListItem = {
  id: string
  title: string
  description: string
  category: string
  currentAmount: number
  targetAmount: number
  monthlyContribution: number
  dueDate: string
  recommendations: string[]
  progressTrend: string
}

export type SuggestedGoal = {
  id: string
  title: string
  description: string
  potentialMonthlyContribution: number
}

export type GoalTimelineItem = {
  id: string
  title: string
  description: string
  date: string
  status: "completed" | "upcoming" | "delayed"
}

export type GoalDetail = {
  id: string
  title: string
  description: string
  category: string
  currentAmount: number
  targetAmount: number
  dueDate: string
  monthlyContribution: number
  pace: "adelantada" | "en ruta" | "requiere atención"
  nextContributionDate: string
  metrics: Array<{ label: string; value: string; helper?: string }>
  timeline: GoalTimelineItem[]
  insights: string[]
}

export const goalsMock: GoalListItem[] = [
  {
    id: "demo-meta",
    title: "Vacaciones familiares en la playa",
    description:
      "Fondo para cubrir vuelos, hospedaje y actividades para cuatro personas.",
    category: "Viajes y experiencias",
    currentAmount: 27000,
    targetAmount: 45000,
    monthlyContribution: 2500,
    dueDate: "2025-12-01",
    recommendations: [
      "Aumenta tu aporte mensual en $500 para llegar al objetivo dos meses antes.",
      "Destina los reembolsos de tarjetas de crédito a esta meta durante el próximo trimestre.",
    ],
    progressTrend: "En la última semana registraste dos aportes automáticos desde tu cuenta principal.",
  },
  {
    id: "fondo-emergencia",
    title: "Fondo de emergencia 6 meses",
    description:
      "Construye un colchón financiero equivalente a seis meses de gastos esenciales.",
    category: "Seguridad financiera",
    currentAmount: 54000,
    targetAmount: 72000,
    monthlyContribution: 3200,
    dueDate: "2025-06-01",
    recommendations: [
      "Redondea compras con tarjeta y destina el excedente automáticamente.",
      "Activa alertas cuando el ritmo de aportes baje del promedio mensual.",
    ],
    progressTrend: "Vas 8% por encima del ritmo esperado respecto al mes anterior.",
  },
  {
    id: "remodelacion-cocina",
    title: "Remodelación de cocina",
    description:
      "Actualizar electrodomésticos y acabados con proveedores certificados.",
    category: "Hogar",
    currentAmount: 18000,
    targetAmount: 30000,
    monthlyContribution: 1800,
    dueDate: "2024-10-15",
    recommendations: [
      "Negocia descuentos por pronto pago con el proveedor principal.",
      "Utiliza etiquetas en tus transacciones para identificar gastos relacionados.",
    ],
    progressTrend: "Se identificaron tres pagos pendientes asociados a contratistas.",
  },
]

export const suggestedGoalsMock: SuggestedGoal[] = [
  {
    id: "universidad-hija",
    title: "Ahorro universidad Camila",
    description:
      "Proyecta matrícula y manutención con base en tendencias de inflación educativas.",
    potentialMonthlyContribution: 2800,
  },
  {
    id: "anticipo-auto",
    title: "Anticipo para auto eléctrico",
    description:
      "Reduce gastos en combustible y mantenimiento con un vehículo más eficiente.",
    potentialMonthlyContribution: 2100,
  },
  {
    id: "retiro-flexible",
    title: "Retiro flexible 2045",
    description:
      "Diversifica aportes en instrumentos de riesgo moderado para alcanzar tu meta.",
    potentialMonthlyContribution: 3500,
  },
]

export const goalDetailsMock: Record<string, GoalDetail> = {
  "demo-meta": {
    id: "demo-meta",
    title: "Vacaciones familiares en la playa",
    description:
      "Planifica un viaje de dos semanas incluyendo vuelos, hospedaje y actividades para toda la familia.",
    category: "Viajes y experiencias",
    currentAmount: 27000,
    targetAmount: 45000,
    dueDate: "2025-12-01",
    monthlyContribution: 2500,
    pace: "en ruta",
    nextContributionDate: "2024-06-15",
    metrics: [
      {
        label: "Progreso acumulado",
        value: "60%",
        helper: "$27,000 de $45,000",
      },
      {
        label: "Aporte mensual promedio",
        value: "$2,450",
        helper: "Últimos 6 meses",
      },
      {
        label: "Ritmo proyectado",
        value: "Meta alcanzada en 5 meses",
        helper: "Manteniendo el aporte actual",
      },
    ],
    timeline: [
      {
        id: "inicio",
        title: "Apertura de meta",
        description: "Configuraste aportes automáticos desde tu cuenta nómina.",
        date: "2024-01-05",
        status: "completed",
      },
      {
        id: "check-marzo",
        title: "Revisión trimestral",
        description: "Confirmaste reservas con política de cancelación flexible.",
        date: "2024-03-28",
        status: "completed",
      },
      {
        id: "check-julio",
        title: "Pago de vuelos",
        description: "Recordatorio para emitir boletos con millas acumuladas.",
        date: "2024-07-12",
        status: "upcoming",
      },
      {
        id: "check-octubre",
        title: "Confirmación de hospedaje",
        description: "Evalúa opciones con cancelación gratuita antes de noviembre.",
        date: "2024-10-20",
        status: "upcoming",
      },
    ],
    insights: [
      "Considera redirigir los reembolsos de gastos empresariales a esta meta para adelantar el viaje.",
      "Activa recordatorios semanales para registrar gastos con etiqueta 'vacaciones'.",
      "Comparte el progreso con tu familia para alinear expectativas de presupuesto.",
    ],
  },
  "fondo-emergencia": {
    id: "fondo-emergencia",
    title: "Fondo de emergencia 6 meses",
    description:
      "Garantiza liquidez suficiente para cubrir contingencias y gastos esenciales durante medio año.",
    category: "Seguridad financiera",
    currentAmount: 54000,
    targetAmount: 72000,
    dueDate: "2025-06-01",
    monthlyContribution: 3200,
    pace: "adelantada",
    nextContributionDate: "2024-06-10",
    metrics: [
      {
        label: "Progreso acumulado",
        value: "75%",
        helper: "$54,000 de $72,000",
      },
      {
        label: "Aporte mensual promedio",
        value: "$3,150",
        helper: "Últimos 6 meses",
      },
      {
        label: "Ritmo proyectado",
        value: "Meta alcanzada en 4 meses",
        helper: "Siguiendo tus aportes actuales",
      },
    ],
    timeline: [
      {
        id: "inicio",
        title: "Primer transferencia",
        description: "Se configuró débito automático desde cuenta de nómina.",
        date: "2023-11-02",
        status: "completed",
      },
      {
        id: "revisión-marzo",
        title: "Revisión de tasa",
        description: "Ajustaste la tasa de interés en tu cuenta de alto rendimiento.",
        date: "2024-03-15",
        status: "completed",
      },
      {
        id: "seguro",
        title: "Evaluación de seguros",
        description: "Valida coberturas médicas y de hogar complementarias.",
        date: "2024-09-01",
        status: "upcoming",
      },
    ],
    insights: [
      "Traslada excedentes de tu cuenta de gastos diarios para completar el objetivo antes de fin de año.",
      "Activa etiquetas automáticas para clasificar retiros que comprometan este fondo.",
    ],
  },
  "remodelacion-cocina": {
    id: "remodelacion-cocina",
    title: "Remodelación de cocina",
    description:
      "Renueva acabados, iluminación y electrodomésticos priorizando eficiencia energética.",
    category: "Hogar",
    currentAmount: 18000,
    targetAmount: 30000,
    dueDate: "2024-10-15",
    monthlyContribution: 1800,
    pace: "requiere atención",
    nextContributionDate: "2024-06-20",
    metrics: [
      {
        label: "Progreso acumulado",
        value: "60%",
        helper: "$18,000 de $30,000",
      },
      {
        label: "Aporte mensual promedio",
        value: "$1,650",
        helper: "Últimos 6 meses",
      },
      {
        label: "Ritmo proyectado",
        value: "Meta se extiende 2 meses",
        helper: "Incrementa aportes para evitar retrasos",
      },
    ],
    timeline: [
      {
        id: "diseño",
        title: "Definición de planos",
        description: "Arquitecta entregó propuesta final y calendario de pagos.",
        date: "2024-02-11",
        status: "completed",
      },
      {
        id: "anticipos",
        title: "Pago a proveedores",
        description: "Se registraron adelantos a carpintero y electricista.",
        date: "2024-04-05",
        status: "completed",
      },
      {
        id: "obra-gruesa",
        title: "Instalación de mobiliario",
        description: "Coordina entrega de superficies de cuarzo y línea blanca.",
        date: "2024-08-18",
        status: "upcoming",
      },
      {
        id: "cierre",
        title: "Cierre de proyecto",
        description: "Inspección final y liberación de pago retenido.",
        date: "2024-11-02",
        status: "delayed",
      },
    ],
    insights: [
      "Etiqueta las transferencias a contratistas para monitorear desvíos del presupuesto.",
      "Sincroniza facturas para evaluar deducciones fiscales y recuperar IVA.",
      "Comparte esta meta con tu pareja para coordinar pagos pendientes.",
    ],
  },
}

import { PlaceholderPage } from "@/components/authenticated/placeholder-page"

export default function GoalsPage() {
  return (
    <PlaceholderPage
      title="Metas financieras"
      description="Crea, prioriza y monitorea objetivos de ahorro o inversión."
      sections={[
        {
          title: "Metas activas",
          description: "Visualiza progreso, fecha estimada y aportes pendientes.",
          skeletons: 4,
        },
        {
          title: "Sugerencias automáticas",
          description: "Propuestas de metas según tu historial de transacciones.",
          skeletons: 3,
        },
        {
          title: "Acciones rápidas",
          description: "Ajusta montos, vincula cuentas de ahorro y registra logros.",
          skeletons: 2,
          layout: "list",
        },
      ]}
    />
  )
}

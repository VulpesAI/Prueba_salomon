import { PlaceholderPage } from "@/components/authenticated/placeholder-page"

export default function AnalyticsInsightsPage() {
  return (
    <PlaceholderPage
      title="Insights avanzados"
      description="Crea historias automáticas, paneles comparativos y resúmenes ejecutivos."
      sections={[
        {
          title: "Narrativas generadas",
          description: "Resumen textual listo para copiar en presentaciones o reportes.",
          skeletons: 3,
        },
        {
          title: "Comparativo de cohortes",
          description: "Analiza diferencias entre segmentos de clientes o periodos.",
          skeletons: 4,
        },
        {
          title: "Resumen ejecutivo",
          description: "Tarjetas clave con KPI y llamadas a la acción sugeridas.",
          skeletons: 2,
          layout: "list",
        },
      ]}
    />
  )
}

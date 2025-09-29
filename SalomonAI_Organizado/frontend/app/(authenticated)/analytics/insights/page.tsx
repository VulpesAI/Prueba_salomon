import { FeaturePreview, type FeaturePreviewSection } from "@/components/authenticated/feature-preview"
import { BarChart3 } from "lucide-react"

const sections: FeaturePreviewSection[] = [
  {
    title: "Narrativas generadas",
    description: "Resumen textual listo para copiar en presentaciones o reportes.",
    skeletons: 3,
    variant: "card",
  },
  {
    title: "Comparativo de cohortes",
    description: "Analiza diferencias entre segmentos de clientes o periodos.",
    skeletons: 4,
    variant: "chart",
  },
  {
    title: "Resumen ejecutivo",
    description: "Tarjetas clave con KPI y llamadas a la acción sugeridas.",
    skeletons: 2,
    layout: "list",
  },
]

export default function AnalyticsInsightsPage() {
  return (
    <FeaturePreview
      icon={BarChart3}
      title="Insights avanzados"
      description="Crea historias automáticas, paneles comparativos y resúmenes ejecutivos."
      cta={{ label: "Ver plantilla ejecutiva", href: "/demo" }}
      sections={sections}
    />
  )
}

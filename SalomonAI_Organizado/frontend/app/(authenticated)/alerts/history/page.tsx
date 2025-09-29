import { FeaturePreview, type FeaturePreviewSection } from "@/components/authenticated/feature-preview"
import { History } from "lucide-react"

const sections: FeaturePreviewSection[] = [
  {
    title: "Cronología",
    description: "Línea de tiempo con cada alerta, responsable y resultado.",
    skeletons: 3,
    variant: "table",
  },
  {
    title: "Indicadores de desempeño",
    description: "Métricas de SLA, severidad y resolución por equipo.",
    skeletons: 3,
    variant: "card",
  },
  {
    title: "Exportación",
    description: "Descarga el historial en formatos compatibles con auditoría.",
    skeletons: 2,
    layout: "list",
  },
]

export default function AlertsHistoryPage() {
  return (
    <FeaturePreview
      icon={History}
      title="Historial de alertas"
      description="Consulta eventos pasados, tiempos de respuesta y seguimiento de acciones."
      cta={{ label: "Descargar ejemplo", href: "/demo" }}
      sections={sections}
    />
  )
}

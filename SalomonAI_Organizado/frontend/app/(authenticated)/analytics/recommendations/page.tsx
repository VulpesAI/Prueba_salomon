import { FeaturePreview, type FeaturePreviewSection } from "@/components/authenticated/feature-preview"
import { Sparkles } from "lucide-react"

const sections: FeaturePreviewSection[] = [
  {
    title: "Campañas activas",
    description: "Revisa qué recomendaciones están desplegadas y sus métricas.",
    skeletons: 3,
    variant: "card",
  },
  {
    title: "Experimentación",
    description: "Configura pruebas A/B y mide impacto en KPIs financieros.",
    skeletons: 4,
    variant: "table",
  },
  {
    title: "Retroalimentación",
    description: "Analiza las respuestas recibidas y entrena de nuevo el modelo.",
    skeletons: 2,
    layout: "list",
  },
]

export default function AnalyticsRecommendationsPage() {
  return (
    <FeaturePreview
      icon={Sparkles}
      title="Recomendaciones avanzadas"
      description="Gestiona motores de recomendaciones, experimentos y feedback de usuarios."
      cta={{ label: "Configurar campaña", href: "/demo" }}
      sections={sections}
    />
  )
}

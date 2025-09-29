import { FeaturePreview, type FeaturePreviewSection } from "@/components/authenticated/feature-preview"
import { Layers } from "lucide-react"

const sections: FeaturePreviewSection[] = [
  {
    title: "Mapa de calor",
    description: "Cruza categorías con periodos y detecta zonas de alto impacto.",
    skeletons: 3,
    variant: "chart",
  },
  {
    title: "Drill-down",
    description: "Explora subcategorías y transacciones relevantes con un clic.",
    skeletons: 4,
    variant: "table",
  },
  {
    title: "Recomendaciones de ajuste",
    description: "Propuestas automáticas para reorganizar o fusionar categorías.",
    skeletons: 2,
    layout: "list",
  },
]

export default function AnalyticsCategoriesPage() {
  return (
    <FeaturePreview
      icon={Layers}
      title="Analítica por categorías"
      description="Profundiza en la distribución y evolución de categorías personalizadas."
      cta={{ label: "Gestionar categorías", href: "/transactions" }}
      sections={sections}
    />
  )
}

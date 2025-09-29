import { FeaturePreview, type FeaturePreviewSection } from "@/components/authenticated/feature-preview"
import { LineChart } from "lucide-react"

const sections: FeaturePreviewSection[] = [
  {
    title: "Modelos disponibles",
    description: "Selecciona entre enfoques clásicos, ML o IA generativa para tus series.",
    skeletons: 3,
    variant: "card",
  },
  {
    title: "Validación de precisión",
    description: "Visualiza métricas, intervalos de confianza y errores históricos.",
    skeletons: 4,
    variant: "chart",
  },
  {
    title: "Programación de ejecuciones",
    description: "Agenda corridas automáticas y gestiona webhooks de entrega.",
    skeletons: 2,
    layout: "list",
  },
]

export default function AnalyticsForecastsPage() {
  return (
    <FeaturePreview
      icon={LineChart}
      title="Pronósticos financieros"
      description="Configura modelos de predicción, horizontes y métricas de calidad."
      cta={{ label: "Agregar modelo", href: "/demo" }}
      sections={sections}
    />
  )
}

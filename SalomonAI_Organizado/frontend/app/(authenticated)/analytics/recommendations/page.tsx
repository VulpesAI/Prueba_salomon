import { PlaceholderPage } from "@/components/authenticated/placeholder-page"

export default function AnalyticsRecommendationsPage() {
  return (
    <PlaceholderPage
      title="Recomendaciones avanzadas"
      description="Gestiona motores de recomendaciones, experimentos y feedback de usuarios."
      sections={[
        {
          title: "Campañas activas",
          description: "Revisa qué recomendaciones están desplegadas y sus métricas.",
          skeletons: 3,
        },
        {
          title: "Experimentación",
          description: "Configura pruebas A/B y mide impacto en KPIs financieros.",
          skeletons: 4,
        },
        {
          title: "Retroalimentación",
          description: "Analiza las respuestas recibidas y entrena de nuevo el modelo.",
          skeletons: 2,
          layout: "list",
        },
      ]}
    />
  )
}

import { PlaceholderPage } from "@/components/authenticated/placeholder-page"

export default function DashboardInsightsPage() {
  return (
    <PlaceholderPage
      title="Insights del dashboard"
      description="Explora hallazgos automáticos y narrativas de IA para tu panel financiero."
      sections={[
        {
          title: "Hallazgos generados",
          description: "Listas priorizadas de oportunidades y riesgos detectados en tus datos.",
          skeletons: 4,
        },
        {
          title: "Narrativas destacadas",
          description: "Borradores de storytelling financiero listos para compartir con stakeholders.",
          skeletons: 3,
        },
        {
          title: "Versionado de reportes",
          description: "Historial de publicaciones y comparativo entre versiones de tu dashboard.",
          skeletons: 2,
          layout: "list",
        },
      ]}
    />
  )
}

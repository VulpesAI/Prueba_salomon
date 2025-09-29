import { PlaceholderPage } from "@/components/authenticated/placeholder-page"

export default function AnalyticsCategoriesPage() {
  return (
    <PlaceholderPage
      title="Analítica por categorías"
      description="Profundiza en la distribución y evolución de categorías personalizadas."
      sections={[
        {
          title: "Mapa de calor",
          description: "Cruza categorías con periodos y detecta zonas de alto impacto.",
          skeletons: 3,
        },
        {
          title: "Drill-down",
          description: "Explora subcategorías y transacciones relevantes con un clic.",
          skeletons: 4,
        },
        {
          title: "Recomendaciones de ajuste",
          description: "Propuestas automáticas para reorganizar o fusionar categorías.",
          skeletons: 2,
          layout: "list",
        },
      ]}
    />
  )
}

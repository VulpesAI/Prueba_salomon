import { PlaceholderPage } from "@/components/authenticated/placeholder-page"

export default function AnalyticsForecastsPage() {
  return (
    <PlaceholderPage
      title="Pronósticos financieros"
      description="Configura modelos de predicción, horizontes y métricas de calidad."
      sections={[
        {
          title: "Modelos disponibles",
          description: "Selecciona entre enfoques clásicos, ML o IA generativa para tus series.",
          skeletons: 3,
        },
        {
          title: "Validación de precisión",
          description: "Visualiza métricas, intervalos de confianza y errores históricos.",
          skeletons: 4,
        },
        {
          title: "Programación de ejecuciones",
          description: "Agenda corridas automáticas y gestiona webhooks de entrega.",
          skeletons: 2,
          layout: "list",
        },
      ]}
    />
  )
}

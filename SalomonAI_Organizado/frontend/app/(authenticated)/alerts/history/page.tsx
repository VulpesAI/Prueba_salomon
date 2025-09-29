import { PlaceholderPage } from "@/components/authenticated/placeholder-page"

export default function AlertsHistoryPage() {
  return (
    <PlaceholderPage
      title="Historial de alertas"
      description="Consulta eventos pasados, tiempos de respuesta y seguimiento de acciones."
      sections={[
        {
          title: "Cronología",
          description: "Línea de tiempo con cada alerta, responsable y resultado.",
          skeletons: 3,
        },
        {
          title: "Indicadores de desempeño",
          description: "Métricas de SLA, severidad y resolución por equipo.",
          skeletons: 3,
        },
        {
          title: "Exportación",
          description: "Descarga el historial en formatos compatibles con auditoría.",
          skeletons: 2,
          layout: "list",
        },
      ]}
    />
  )
}

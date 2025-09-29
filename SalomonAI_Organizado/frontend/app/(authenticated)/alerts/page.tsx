import { PlaceholderPage } from "@/components/authenticated/placeholder-page"

export default function AlertsPage() {
  return (
    <PlaceholderPage
      title="Centro de alertas"
      description="Gestiona alertas generadas por IA, reglas personalizadas y estados de resolución."
      sections={[
        {
          title: "Alertas activas",
          description: "Listado priorizado con severidad, fuente y fecha prevista de impacto.",
          skeletons: 4,
        },
        {
          title: "Acciones de respuesta",
          description: "Tareas sugeridas, responsables y notas colaborativas.",
          skeletons: 3,
        },
        {
          title: "Integraciones",
          description: "Conexiones con canales externos como email, Slack o SMS.",
          skeletons: 2,
          layout: "list",
        },
      ]}
    />
  )
}

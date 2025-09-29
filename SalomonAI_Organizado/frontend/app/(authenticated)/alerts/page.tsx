import { FeaturePreview, type FeaturePreviewSection } from "@/components/authenticated/feature-preview"
import { AlertTriangle } from "lucide-react"

const sections: FeaturePreviewSection[] = [
  {
    title: "Alertas activas",
    description: "Listado priorizado con severidad, fuente y fecha prevista de impacto.",
    skeletons: 4,
    variant: "table",
  },
  {
    title: "Acciones de respuesta",
    description: "Tareas sugeridas, responsables y notas colaborativas.",
    skeletons: 3,
    variant: "card",
  },
  {
    title: "Integraciones",
    description: "Conexiones con canales externos como email, Slack o SMS.",
    skeletons: 2,
    layout: "list",
  },
]

export default function AlertsPage() {
  return (
    <FeaturePreview
      icon={AlertTriangle}
      title="Centro de alertas"
      description="Gestiona alertas generadas por IA, reglas personalizadas y estados de resolución."
      cta={{ label: "Configurar integraciones", href: "/integraciones" }}
      sections={sections}
    />
  )
}

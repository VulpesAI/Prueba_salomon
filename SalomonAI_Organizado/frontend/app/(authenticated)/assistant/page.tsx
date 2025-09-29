import { FeaturePreview, type FeaturePreviewSection } from "@/components/authenticated/feature-preview"
import { MessageSquare } from "lucide-react"

const sections: FeaturePreviewSection[] = [
  {
    title: "Conversaciones recientes",
    description: "Historial de chats, resúmenes y accesos rápidos a resultados.",
    skeletons: 3,
    variant: "card",
  },
  {
    title: "Playbooks",
    description: "Flujos automatizados que ejecuta el asistente con tu aprobación.",
    skeletons: 3,
    variant: "table",
  },
  {
    title: "Recursos sugeridos",
    description: "Documentación, reportes y dashboards recomendados según el contexto.",
    skeletons: 2,
    layout: "list",
  },
]

export default function AssistantPage() {
  return (
    <FeaturePreview
      icon={MessageSquare}
      title="Asistente financiero"
      description="Interactúa con el copiloto de IA para obtener respuestas y automatizar acciones."
      cta={{ label: "Probar asistente", href: "/demo" }}
      sections={sections}
    />
  )
}

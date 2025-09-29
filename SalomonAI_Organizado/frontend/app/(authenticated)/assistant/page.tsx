import { PlaceholderPage } from "@/components/authenticated/placeholder-page"

export default function AssistantPage() {
  return (
    <PlaceholderPage
      title="Asistente financiero"
      description="Interactúa con el copiloto de IA para obtener respuestas y automatizar acciones."
      sections={[
        {
          title: "Conversaciones recientes",
          description: "Historial de chats, resúmenes y accesos rápidos a resultados.",
          skeletons: 3,
        },
        {
          title: "Playbooks",
          description: "Flujos automatizados que ejecuta el asistente con tu aprobación.",
          skeletons: 3,
        },
        {
          title: "Recursos sugeridos",
          description: "Documentación, reportes y dashboards recomendados según el contexto.",
          skeletons: 2,
          layout: "list",
        },
      ]}
    />
  )
}

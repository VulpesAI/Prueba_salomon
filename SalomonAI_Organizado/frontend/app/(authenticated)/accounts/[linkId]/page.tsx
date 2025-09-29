import { PlaceholderPage } from "@/components/authenticated/placeholder-page"

export default function AccountDetailPage({
  params,
}: {
  params: { linkId: string }
}) {
  const accountId = decodeURIComponent(params.linkId)

  return (
    <PlaceholderPage
      title={`Detalle de la cuenta ${accountId}`}
      description="Consulta información granular, conexiones y métricas históricas del enlace seleccionado."
      sections={[
        {
          title: "Información principal",
          description: "Datos generales, institución, alias y estado de sincronización.",
          skeletons: 3,
          layout: "list",
        },
        {
          title: "Historial de sincronizaciones",
          description: "Eventos recientes, duración y mensajes de la API.",
          skeletons: 3,
        },
        {
          title: "Reglas aplicadas",
          description: "Automatizaciones, etiquetas y límites configurados para esta cuenta.",
          skeletons: 2,
        },
      ]}
    />
  )
}

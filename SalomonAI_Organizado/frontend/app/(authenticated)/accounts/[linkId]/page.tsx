import { PlaceholderPage } from "@/components/authenticated/placeholder-page"

type AccountDetailPageProps = {
  params: Promise<{ linkId: string }>
}

export default async function AccountDetailPage({
  params,
}: AccountDetailPageProps) {
  const { linkId } = await params
  const accountId = decodeURIComponent(linkId)
  const accountMetadata: Record<
    string,
    { title: string; description: string }
  > = {
    "demo-cuenta": {
      title: "Cuenta corriente demo",
      description:
        "Explora un ejemplo de cuenta bancaria con datos de referencia, gráficas y recomendaciones simuladas.",
    },
  }

  const { title, description } =
    accountMetadata[accountId] ?? {
      title: `Detalle de la cuenta ${accountId}`,
      description:
        "Consulta información granular, conexiones y métricas históricas del enlace seleccionado.",
    }

  return (
    <PlaceholderPage
      title={title}
      description={description}
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

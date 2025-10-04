import { PlaceholderPage } from "@/components/authenticated/placeholder-page"

type GoalDetailPageProps = {
  params: Promise<{ goalId: string }>
}

export default async function GoalDetailPage({
  params,
}: GoalDetailPageProps) {
  const { goalId: encodedGoalId } = await params
  const goalId = decodeURIComponent(encodedGoalId)
  const goalMetadata: Record<string, { title: string; description: string }> = {
    "demo-meta": {
      title: "Meta vacaciones familiares",
      description:
        "Ejemplo de meta de ahorro con proyecciones de aportes mensuales, hitos y recomendaciones personalizadas.",
    },
  }

  const { title, description } =
    goalMetadata[goalId] ?? {
      title: `Meta ${goalId}`,
      description:
        "Consulta el detalle de la meta, sus hitos y plan de aportaciones.",
    }

  return (
    <PlaceholderPage
      title={title}
      description={description}
      sections={[
        {
          title: "Resumen de progreso",
          description: "Porcentaje alcanzado, aportes registrados y objetivo final.",
          skeletons: 3,
        },
        {
          title: "Timeline de hitos",
          description: "Fechas clave, recordatorios y entregables asociados.",
          skeletons: 3,
        },
        {
          title: "Acciones sugeridas",
          description: "Recomendaciones para acelerar el cumplimiento de la meta.",
          skeletons: 2,
          layout: "list",
        },
      ]}
    />
  )
}

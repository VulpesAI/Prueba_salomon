import { PlaceholderPage } from "@/components/authenticated/placeholder-page"

export default function GoalDetailPage({
  params,
}: {
  params: { goalId: string }
}) {
  const goalId = decodeURIComponent(params.goalId)

  return (
    <PlaceholderPage
      title={`Meta ${goalId}`}
      description="Consulta el detalle de la meta, sus hitos y plan de aportaciones."
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

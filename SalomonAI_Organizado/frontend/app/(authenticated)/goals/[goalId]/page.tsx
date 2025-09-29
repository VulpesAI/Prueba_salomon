import { FeaturePreview, type FeaturePreviewSection } from "@/components/authenticated/feature-preview"
import { Flag } from "lucide-react"

type GoalDetailPageProps = {
  params: Promise<{ goalId: string }>
}

const sections: FeaturePreviewSection[] = [
  {
    title: "Resumen de progreso",
    description: "Porcentaje alcanzado, aportes registrados y objetivo final.",
    skeletons: 3,
    variant: "card",
  },
  {
    title: "Timeline de hitos",
    description: "Fechas clave, recordatorios y entregables asociados.",
    skeletons: 3,
    variant: "chart",
  },
  {
    title: "Acciones sugeridas",
    description: "Recomendaciones para acelerar el cumplimiento de la meta.",
    skeletons: 2,
    layout: "list",
  },
]

export default async function GoalDetailPage({ params }: GoalDetailPageProps) {
  const { goalId: encodedGoalId } = await params
  const goalId = decodeURIComponent(encodedGoalId)

  return (
    <FeaturePreview
      icon={Flag}
      title={`Meta ${goalId}`}
      description="Consulta el detalle de la meta, sus hitos y plan de aportaciones."
      cta={{ label: "Editar meta", href: "/goals" }}
      sections={sections}
    />
  )
}

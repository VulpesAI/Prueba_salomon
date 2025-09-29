import { FeaturePreview, type FeaturePreviewSection } from "@/components/authenticated/feature-preview"
import { Brain } from "lucide-react"

const sections: FeaturePreviewSection[] = [
  {
    title: "Motor de reglas",
    description: "Crea y prioriza reglas con acciones sobre categorías, notas o alertas.",
    skeletons: 3,
    variant: "card",
  },
  {
    title: "Revisión asistida",
    description: "Panel para validar sugerencias y mejorar el modelo con feedback.",
    skeletons: 3,
    variant: "table",
  },
  {
    title: "Historial de cambios",
    description: "Auditoría de reglas aplicadas y resultados antes/después.",
    skeletons: 2,
    layout: "list",
  },
]

export default function TransactionsClassificationPage() {
  return (
    <FeaturePreview
      icon={Brain}
      title="Clasificación inteligente"
      description="Automatiza el etiquetado de movimientos y entrena reglas personalizadas."
      cta={{ label: "Entrenar nuevo modelo", href: "/demo" }}
      sections={sections}
    />
  )
}

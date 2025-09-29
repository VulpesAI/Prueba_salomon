import { PlaceholderPage } from "@/components/authenticated/placeholder-page"

export default function TransactionsClassificationPage() {
  return (
    <PlaceholderPage
      title="Clasificación inteligente"
      description="Automatiza el etiquetado de movimientos y entrena reglas personalizadas."
      sections={[
        {
          title: "Motor de reglas",
          description: "Crea y prioriza reglas con acciones sobre categorías, notas o alertas.",
          skeletons: 3,
        },
        {
          title: "Revisión asistida",
          description: "Panel para validar sugerencias y mejorar el modelo con feedback.",
          skeletons: 3,
        },
        {
          title: "Historial de cambios",
          description: "Auditoría de reglas aplicadas y resultados antes/después.",
          skeletons: 2,
          layout: "list",
        },
      ]}
    />
  )
}

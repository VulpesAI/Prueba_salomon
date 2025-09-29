import { FeaturePreview, type FeaturePreviewSection } from "@/components/authenticated/feature-preview"
import { Funnel } from "lucide-react"

const sections: FeaturePreviewSection[] = [
  {
    title: "Constructor visual",
    description: "Arrastra condiciones por monto, categoría, texto libre y metadatos.",
    skeletons: 3,
    variant: "card",
  },
  {
    title: "Segmentos guardados",
    description: "Gestiona búsquedas frecuentes y compártelas con tu equipo.",
    skeletons: 3,
    variant: "card",
  },
  {
    title: "Acciones masivas",
    description: "Clasificación, etiquetas y exportación sobre el resultado filtrado.",
    skeletons: 2,
    layout: "list",
  },
]

export default function TransactionsAdvancedSearchPage() {
  return (
    <FeaturePreview
      icon={Funnel}
      title="Búsqueda avanzada"
      description="Construye consultas complejas con reglas condicionales y guardado de vistas."
      cta={{ label: "Crear nueva vista", href: "/transactions" }}
      sections={sections}
    />
  )
}

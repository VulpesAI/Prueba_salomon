import { FeaturePreview, type FeaturePreviewSection } from "@/components/authenticated/feature-preview"
import { Target } from "lucide-react"

const sections: FeaturePreviewSection[] = [
  {
    title: "Metas activas",
    description: "Visualiza progreso, fecha estimada y aportes pendientes.",
    skeletons: 4,
    variant: "card",
  },
  {
    title: "Sugerencias automáticas",
    description: "Propuestas de metas según tu historial de transacciones.",
    skeletons: 3,
    variant: "card",
  },
  {
    title: "Acciones rápidas",
    description: "Ajusta montos, vincula cuentas de ahorro y registra logros.",
    skeletons: 2,
    layout: "list",
  },
]

export default function GoalsPage() {
  return (
    <FeaturePreview
      icon={Target}
      title="Metas financieras"
      description="Crea, prioriza y monitorea objetivos de ahorro o inversión."
      cta={{ label: "Explorar plantillas", href: "/demo" }}
      sections={sections}
    />
  )
}

import { FeaturePreview, type FeaturePreviewSection } from "@/components/authenticated/feature-preview"
import { PieChart } from "lucide-react"

const sections: FeaturePreviewSection[] = [
  {
    title: "Resumen mensual",
    description: "Comparativo mes a mes con variaciones porcentuales y metas.",
    skeletons: 3,
    variant: "chart",
  },
  {
    title: "Desglose por categoría",
    description: "Visualiza aportes de cada categoría y detecta desviaciones relevantes.",
    skeletons: 4,
    variant: "card",
  },
  {
    title: "Compartir reportes",
    description: "Exporta resúmenes en PDF o publica snapshots para stakeholders.",
    skeletons: 2,
    layout: "list",
  },
]

export default function TransactionsSummariesPage() {
  return (
    <FeaturePreview
      icon={PieChart}
      title="Resúmenes de transacciones"
      description="Genera reportes agregados por categoría, periodo y canal de pago."
      cta={{ label: "Descargar plantilla", href: "/demo" }}
      sections={sections}
    />
  )
}

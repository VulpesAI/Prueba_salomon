import { FeaturePreview, type FeaturePreviewSection } from "@/components/authenticated/feature-preview"
import { TrendingUp } from "lucide-react"

const sections: FeaturePreviewSection[] = [
  {
    title: "Resumen histórico",
    description: "Serie temporal consolidada con intervalos personalizables.",
    skeletons: 3,
    variant: "chart",
  },
  {
    title: "Comparativo entre cuentas",
    description: "Visualiza la participación porcentual de cada cuenta en tu patrimonio.",
    skeletons: 4,
    variant: "card",
  },
  {
    title: "Alertas de variación",
    description: "Configura umbrales para detectar cambios abruptos en saldos.",
    skeletons: 2,
    layout: "list",
  },
]

export default function AccountBalancesPage() {
  return (
    <FeaturePreview
      icon={TrendingUp}
      title="Evolución de saldos"
      description="Analiza tendencias de saldos y proyecciones por institución o cuenta."
      cta={{ label: "Configurar umbrales", href: "/integraciones" }}
      sections={sections}
    />
  )
}

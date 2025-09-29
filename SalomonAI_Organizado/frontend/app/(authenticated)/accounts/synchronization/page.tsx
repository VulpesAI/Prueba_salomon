import { FeaturePreview, type FeaturePreviewSection } from "@/components/authenticated/feature-preview"
import { RefreshCcw } from "lucide-react"

const sections: FeaturePreviewSection[] = [
  {
    title: "Estados por institución",
    description: "Tabla con última actualización, latencia y token vigente.",
    skeletons: 3,
    variant: "table",
  },
  {
    title: "Jobs recientes",
    description: "Detalle de sincronizaciones exitosas, fallidas y reintentos en cola.",
    skeletons: 4,
    variant: "card",
  },
  {
    title: "Diagnóstico y soporte",
    description: "Checklist de verificación, logs y contacto directo con soporte.",
    skeletons: 2,
    layout: "list",
  },
]

export default function AccountSynchronizationPage() {
  return (
    <FeaturePreview
      icon={RefreshCcw}
      title="Sincronización de cuentas"
      description="Monitorea el estado de cada enlace, los jobs ejecutados y los próximos pasos."
      cta={{ label: "Revisar documentación", href: "/demo" }}
      sections={sections}
    />
  )
}

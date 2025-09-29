import { FeaturePreview, type FeaturePreviewSection } from "@/components/authenticated/feature-preview"
import { Building2 } from "lucide-react"

const sections: FeaturePreviewSection[] = [
  {
    title: "Instituciones",
    description: "Listado de bancos, wallets y emisores conectados al espacio financiero.",
    skeletons: 4,
    variant: "table",
  },
  {
    title: "Resumen por tipo",
    description: "Vista agrupada por cuentas corrientes, ahorro, crédito y otros productos.",
    skeletons: 3,
    variant: "card",
  },
  {
    title: "Acciones rápidas",
    description: "Sincronización, desvinculación y validación de tokens.",
    skeletons: 2,
    layout: "list",
  },
]

export default function AccountsPage() {
  return (
    <FeaturePreview
      icon={Building2}
      title="Cuentas vinculadas"
      description="Administra instituciones conectadas, estados y saldos agregados."
      cta={{ label: "Agregar nueva cuenta", href: "/integraciones" }}
      sections={sections}
    />
  )
}

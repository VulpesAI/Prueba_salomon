import { FeaturePreview, type FeaturePreviewSection } from "@/components/authenticated/feature-preview"
import { CreditCard } from "lucide-react"

type AccountDetailPageProps = {
  params: Promise<{ linkId: string }>
}

const sections: FeaturePreviewSection[] = [
  {
    title: "Información principal",
    description: "Datos generales, institución, alias y estado de sincronización.",
    skeletons: 3,
    layout: "list",
  },
  {
    title: "Historial de sincronizaciones",
    description: "Eventos recientes, duración y mensajes de la API.",
    skeletons: 3,
    variant: "table",
  },
  {
    title: "Reglas aplicadas",
    description: "Automatizaciones, etiquetas y límites configurados para esta cuenta.",
    skeletons: 2,
    variant: "card",
  },
]

export default async function AccountDetailPage({ params }: AccountDetailPageProps) {
  const { linkId } = await params
  const accountId = decodeURIComponent(linkId)

  return (
    <FeaturePreview
      icon={CreditCard}
      title={`Detalle de la cuenta ${accountId}`}
      description="Consulta información granular, conexiones y métricas históricas del enlace seleccionado."
      cta={{ label: "Volver a cuentas", href: "/accounts" }}
      sections={sections}
    />
  )
}

import { FeaturePreview, type FeaturePreviewSection } from "@/components/authenticated/feature-preview"
import { ReceiptText } from "lucide-react"

const sections: FeaturePreviewSection[] = [
  {
    title: "Listado principal",
    description: "Tabla con paginación, filtros por monto, categoría y etiquetas personalizadas.",
    skeletons: 4,
    variant: "table",
  },
  {
    title: "Insights inmediatos",
    description: "Tarjetas con resumen de gasto e ingreso por periodo seleccionado.",
    skeletons: 3,
    variant: "card",
  },
  {
    title: "Exportaciones",
    description: "Genera archivos CSV, XLSX o conexiones directas a BI.",
    skeletons: 2,
    layout: "list",
  },
]

export default function TransactionsPage() {
  return (
    <FeaturePreview
      icon={ReceiptText}
      title="Transacciones"
      description="Consulta el historial completo de movimientos y aplica filtros combinados."
      cta={{ label: "Ver ejemplos de API", href: "/demo" }}
      sections={sections}
    />
  )
}

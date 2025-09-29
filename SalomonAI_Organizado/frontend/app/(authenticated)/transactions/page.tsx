import { PlaceholderPage } from "@/components/authenticated/placeholder-page"

export default function TransactionsPage() {
  return (
    <PlaceholderPage
      title="Transacciones"
      description="Consulta el historial completo de movimientos y aplica filtros combinados."
      sections={[
        {
          title: "Listado principal",
          description: "Tabla con paginación, filtros por monto, categoría y etiquetas personalizadas.",
          skeletons: 4,
        },
        {
          title: "Insights inmediatos",
          description: "Tarjetas con resumen de gasto e ingreso por periodo seleccionado.",
          skeletons: 3,
        },
        {
          title: "Exportaciones",
          description: "Genera archivos CSV, XLSX o conexiones directas a BI.",
          skeletons: 2,
          layout: "list",
        },
      ]}
    />
  )
}

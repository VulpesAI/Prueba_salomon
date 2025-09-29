import { PlaceholderPage } from "@/components/authenticated/placeholder-page"

export default function TransactionsSummariesPage() {
  return (
    <PlaceholderPage
      title="Resúmenes de transacciones"
      description="Genera reportes agregados por categoría, periodo y canal de pago."
      sections={[
        {
          title: "Resumen mensual",
          description: "Comparativo mes a mes con variaciones porcentuales y metas.",
          skeletons: 3,
        },
        {
          title: "Desglose por categoría",
          description: "Visualiza aportes de cada categoría y detecta desviaciones relevantes.",
          skeletons: 4,
        },
        {
          title: "Compartir reportes",
          description: "Exporta resúmenes en PDF o publica snapshots para stakeholders.",
          skeletons: 2,
          layout: "list",
        },
      ]}
    />
  )
}

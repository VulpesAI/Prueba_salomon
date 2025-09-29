import { PlaceholderPage } from "@/components/authenticated/placeholder-page"

export default function AccountBalancesPage() {
  return (
    <PlaceholderPage
      title="Evolución de saldos"
      description="Analiza tendencias de saldos y proyecciones por institución o cuenta."
      sections={[
        {
          title: "Resumen histórico",
          description: "Serie temporal consolidada con intervalos personalizables.",
          skeletons: 3,
        },
        {
          title: "Comparativo entre cuentas",
          description: "Visualiza la participación porcentual de cada cuenta en tu patrimonio.",
          skeletons: 4,
        },
        {
          title: "Alertas de variación",
          description: "Configura umbrales para detectar cambios abruptos en saldos.",
          skeletons: 2,
          layout: "list",
        },
      ]}
    />
  )
}

import { PlaceholderPage } from "@/components/authenticated/placeholder-page"

export default function AccountsPage() {
  return (
    <PlaceholderPage
      title="Cuentas vinculadas"
      description="Administra instituciones conectadas, estados y saldos agregados."
      sections={[
        {
          title: "Instituciones",
          description: "Listado de bancos, wallets y emisores conectados al espacio financiero.",
          skeletons: 4,
        },
        {
          title: "Resumen por tipo",
          description: "Vista agrupada por cuentas corrientes, ahorro, crédito y otros productos.",
          skeletons: 3,
        },
        {
          title: "Acciones rápidas",
          description: "Sincronización, desvinculación y validación de tokens.",
          skeletons: 2,
          layout: "list",
        },
      ]}
    />
  )
}

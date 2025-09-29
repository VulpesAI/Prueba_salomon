import { PlaceholderPage } from "@/components/authenticated/placeholder-page"

export default function AccountSynchronizationPage() {
  return (
    <PlaceholderPage
      title="Sincronización de cuentas"
      description="Monitorea el estado de cada enlace, los jobs ejecutados y los próximos pasos."
      sections={[
        {
          title: "Estados por institución",
          description: "Tabla con última actualización, latencia y token vigente.",
          skeletons: 3,
        },
        {
          title: "Jobs recientes",
          description: "Detalle de sincronizaciones exitosas, fallidas y reintentos en cola.",
          skeletons: 4,
        },
        {
          title: "Diagnóstico y soporte",
          description: "Checklist de verificación, logs y contacto directo con soporte.",
          skeletons: 2,
          layout: "list",
        },
      ]}
    />
  )
}

import { PlaceholderPage } from "@/components/authenticated/placeholder-page"

export default function SettingsNotificationsPage() {
  return (
    <PlaceholderPage
      title="Notificaciones"
      description="Personaliza recordatorios, resúmenes periódicos y canales de comunicación."
      sections={[
        {
          title: "Resúmenes programados",
          description: "Define frecuencia y contenido de los reportes automáticos.",
          skeletons: 3,
        },
        {
          title: "Canales",
          description: "Activa o desactiva email, push, SMS y notificaciones in-app.",
          skeletons: 3,
        },
        {
          title: "Plantillas",
          description: "Edita el contenido base de tus comunicaciones recurrentes.",
          skeletons: 2,
          layout: "list",
        },
      ]}
    />
  )
}

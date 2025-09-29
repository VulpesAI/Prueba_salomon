import { PlaceholderPage } from "@/components/authenticated/placeholder-page"

export default function AlertsPreferencesPage() {
  return (
    <PlaceholderPage
      title="Preferencias de alertas"
      description="Configura canales, horarios y reglas automáticas para notificaciones."
      sections={[
        {
          title: "Canales configurados",
          description: "Email, push, SMS y webhooks con su estado actual.",
          skeletons: 3,
        },
        {
          title: "Ventanas de silencio",
          description: "Horarios en los que no se envían notificaciones automáticas.",
          skeletons: 3,
        },
        {
          title: "Reglas personalizadas",
          description: "Crea condiciones y niveles de severidad por tipo de evento.",
          skeletons: 2,
          layout: "list",
        },
      ]}
    />
  )
}

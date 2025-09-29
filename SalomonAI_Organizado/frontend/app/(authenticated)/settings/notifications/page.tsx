import { FeaturePreview, type FeaturePreviewSection } from "@/components/authenticated/feature-preview"
import { Bell } from "lucide-react"

const sections: FeaturePreviewSection[] = [
  {
    title: "Resúmenes programados",
    description: "Define frecuencia y contenido de los reportes automáticos.",
    skeletons: 3,
    variant: "card",
  },
  {
    title: "Canales",
    description: "Activa o desactiva email, push, SMS y notificaciones in-app.",
    skeletons: 3,
    variant: "table",
  },
  {
    title: "Plantillas",
    description: "Edita el contenido base de tus comunicaciones recurrentes.",
    skeletons: 2,
    layout: "list",
  },
]

export default function SettingsNotificationsPage() {
  return (
    <FeaturePreview
      icon={Bell}
      title="Notificaciones"
      description="Personaliza recordatorios, resúmenes periódicos y canales de comunicación."
      cta={{ label: "Crear plantilla", href: "/notifications" }}
      sections={sections}
    />
  )
}

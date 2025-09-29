import { FeaturePreview, type FeaturePreviewSection } from "@/components/authenticated/feature-preview"
import { SlidersHorizontal } from "lucide-react"

const sections: FeaturePreviewSection[] = [
  {
    title: "Canales configurados",
    description: "Email, push, SMS y webhooks con su estado actual.",
    skeletons: 3,
    variant: "card",
  },
  {
    title: "Ventanas de silencio",
    description: "Horarios en los que no se envían notificaciones automáticas.",
    skeletons: 3,
    variant: "card",
  },
  {
    title: "Reglas personalizadas",
    description: "Crea condiciones y niveles de severidad por tipo de evento.",
    skeletons: 2,
    layout: "list",
  },
]

export default function AlertsPreferencesPage() {
  return (
    <FeaturePreview
      icon={SlidersHorizontal}
      title="Preferencias de alertas"
      description="Configura canales, horarios y reglas automáticas para notificaciones."
      cta={{ label: "Agregar nuevo canal", href: "/integraciones" }}
      sections={sections}
    />
  )
}

import { FeaturePreview, type FeaturePreviewSection } from "@/components/authenticated/feature-preview"
import { UserRound } from "lucide-react"

const sections: FeaturePreviewSection[] = [
  {
    title: "Información básica",
    description: "Nombre, correo, foto y datos fiscales opcionales.",
    skeletons: 3,
    layout: "list",
  },
  {
    title: "Preferencias de producto",
    description: "Selecciona moneda predeterminada, idioma y formato de fechas.",
    skeletons: 3,
    variant: "card",
  },
  {
    title: "Integraciones personales",
    description: "Conecta herramientas externas como calendarios o CRMs.",
    skeletons: 2,
    variant: "card",
  },
]

export default function SettingsProfilePage() {
  return (
    <FeaturePreview
      icon={UserRound}
      title="Perfil y preferencias"
      description="Actualiza tus datos personales, idioma, zona horaria y preferencias generales."
      cta={{ label: "Editar perfil", href: "/settings/profile" }}
      sections={sections}
    />
  )
}

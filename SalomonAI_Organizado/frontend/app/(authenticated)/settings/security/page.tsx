import { FeaturePreview, type FeaturePreviewSection } from "@/components/authenticated/feature-preview"
import { ShieldCheck } from "lucide-react"

const sections: FeaturePreviewSection[] = [
  {
    title: "Autenticación",
    description: "Configura contraseñas, MFA y proveedores sociales.",
    skeletons: 3,
    variant: "card",
  },
  {
    title: "Dispositivos y sesiones",
    description: "Revisa sesiones activas y revoca accesos sospechosos.",
    skeletons: 3,
    variant: "table",
  },
  {
    title: "Registros de actividad",
    description: "Auditoría de accesos, cambios y acciones críticas.",
    skeletons: 2,
    layout: "list",
  },
]

export default function SettingsSecurityPage() {
  return (
    <FeaturePreview
      icon={ShieldCheck}
      title="Seguridad"
      description="Administra autenticación, dispositivos autorizados y actividad reciente."
      cta={{ label: "Actualizar MFA", href: "/settings/security" }}
      sections={sections}
    />
  )
}

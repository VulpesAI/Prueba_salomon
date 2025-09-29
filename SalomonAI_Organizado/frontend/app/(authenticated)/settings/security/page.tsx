import { PlaceholderPage } from "@/components/authenticated/placeholder-page"

export default function SettingsSecurityPage() {
  return (
    <PlaceholderPage
      title="Seguridad"
      description="Administra autenticación, dispositivos autorizados y actividad reciente."
      sections={[
        {
          title: "Autenticación",
          description: "Configura contraseñas, MFA y proveedores sociales.",
          skeletons: 3,
        },
        {
          title: "Dispositivos y sesiones",
          description: "Revisa sesiones activas y revoca accesos sospechosos.",
          skeletons: 3,
        },
        {
          title: "Registros de actividad",
          description: "Auditoría de accesos, cambios y acciones críticas.",
          skeletons: 2,
          layout: "list",
        },
      ]}
    />
  )
}

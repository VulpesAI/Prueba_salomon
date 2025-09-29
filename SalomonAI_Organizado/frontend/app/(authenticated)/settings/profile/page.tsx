import { PlaceholderPage } from "@/components/authenticated/placeholder-page"

export default function SettingsProfilePage() {
  return (
    <PlaceholderPage
      title="Perfil y preferencias"
      description="Actualiza tus datos personales, idioma, zona horaria y preferencias generales."
      sections={[
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
        },
        {
          title: "Integraciones personales",
          description: "Conecta herramientas externas como calendarios o CRMs.",
          skeletons: 2,
        },
      ]}
    />
  )
}

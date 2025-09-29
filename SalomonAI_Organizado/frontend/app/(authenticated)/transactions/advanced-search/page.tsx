import { PlaceholderPage } from "@/components/authenticated/placeholder-page"

export default function TransactionsAdvancedSearchPage() {
  return (
    <PlaceholderPage
      title="Búsqueda avanzada"
      description="Construye consultas complejas con reglas condicionales y guardado de vistas."
      sections={[
        {
          title: "Constructor visual",
          description: "Arrastra condiciones por monto, categoría, texto libre y metadatos.",
          skeletons: 3,
        },
        {
          title: "Segmentos guardados",
          description: "Gestiona búsquedas frecuentes y compártelas con tu equipo.",
          skeletons: 3,
        },
        {
          title: "Acciones masivas",
          description: "Clasificación, etiquetas y exportación sobre el resultado filtrado.",
          skeletons: 2,
          layout: "list",
        },
      ]}
    />
  )
}

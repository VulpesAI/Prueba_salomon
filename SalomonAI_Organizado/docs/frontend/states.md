# Gestión de estados de UI

Todas las pantallas de la app deben contemplar los cuatro estados base para una experiencia consistente:

- **Loading**: utiliza `Skeleton` específicos para el tipo de componente que se renderizará (tablas, tarjetas o gráficos). La página de transacciones (`frontend/app/(authenticated)/transactions/page.tsx`) ejemplifica cómo mostrar filas de tabla mientras se ejecuta la consulta.
- **Empty**: muestra `EmptyState` con icono, título, descripción y una acción clara. El historial de notificaciones (`frontend/app/(authenticated)/notifications/page.tsx`) enseña cómo invitar a configurar canales cuando no hay datos.
- **Error**: presenta `ErrorBanner` con mensaje legible y un botón de reintento conectado al `QueryClient`. El dashboard principal (`frontend/app/(authenticated)/dashboard/overview/page.tsx`) maneja errores de React Query sin duplicar lógica.
- **Success**: renderiza la UI final y, cuando existe refresco manual, aprovecha `isFetching` para mostrar estados sutiles sin bloquear la interacción.

## Componentes reutilizables

- `frontend/components/ui/empty-state.tsx`: encapsula el estado vacío y acepta CTA opcional.
- `frontend/components/ui/error-banner.tsx`: formatea errores provenientes de React Query y expone una acción de reintento.
- `frontend/components/authenticated/feature-preview.tsx`: reemplaza al antiguo `PlaceholderPage` y mantiene ejemplos de skeletons para secciones clave (tablas, tarjetas y gráficos).

Al implementar nuevas vistas, toma como referencia los ejemplos anteriores para asegurar coherencia entre loading, empty, error y success. Usa `QueryClient.invalidateQueries` para refrescar datos desde las páginas en vez de duplicar lógica dentro de los hooks.

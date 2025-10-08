# Página de Movimientos

Esta sección implementa la experiencia final de la página de movimientos utilizando datos simulados
que respetan el contrato real del backend.

## API simulada

- **Endpoint:** `GET /api/movements`
- **Parámetros soportados:**
  - `from` y `to` (ISO `YYYY-MM-DD`) para filtrar por rango de fechas inclusivo.
  - `category` (slug normalizado) para limitar a una categoría.
  - `q` para búsqueda de texto libre en el comercio y categoría.
  - `cursor` y `limit` para la paginación infinita.
- **Respuesta:** objeto `MovementsPage` con los campos `items`, `nextCursor` y `totalMatched`.
- **Contrato de item:** ver `@/types/movements`.

Los datos provienen de `@/lib/adapters/movements`, que genera un dataset determinista y maneja los
filtros, orden y cursores. Al conectar el backend real basta con reemplazar el adaptador/endpoint
sin tocar la UI.

## Componentes clave

- `MovementsToolbar` maneja filtros accesibles con teclado y aplica debounce a la búsqueda.
- `MovementsList` usa `useInfiniteQuery` + `IntersectionObserver` para el scroll infinito.
- `MovementItem` formatea fecha y monto según `es-CL` y colorea ingresos/gastos.

## Utilidades

- Formatos localizados en `@/lib/utils/currency` y `@/lib/utils/date`.
- Hook de datos en `@/lib/hooks/useMovementsInfinite`.

## Pruebas

Se añadieron pruebas unitarias y de hooks en `vitest` para garantizar:

- Formateo de moneda/fecha.
- Lógica de `useMovementsInfinite`, incluyendo `getNextPageParam` y manejo de `cursor`.

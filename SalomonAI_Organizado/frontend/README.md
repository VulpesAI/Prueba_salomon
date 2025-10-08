# Frontend SalomonAI

Este paquete contiene la aplicación Next.js (v15) que sirve el dashboard de SalomonAI.

## Requisitos

- Node.js 18.18 o superior.
- PNPM (recomendado) o npm para instalar dependencias.

## Variables de entorno

La aplicación valida las variables de entorno mediante `zod` en `env.ts`. Para entornos locales puedes definir un archivo `.env` con:

```bash
NEXT_PUBLIC_API_BASE=https://api-demo.local
```

En Vercel o producción asegúrate de definir `NEXT_PUBLIC_API_BASE` (puede ser una URL dummy durante las demos) para evitar errores de compilación.

## Scripts útiles

Los comandos deben ejecutarse desde la raíz del repositorio utilizando PNPM con la opción `-C frontend`:

```bash
pnpm -C frontend install
pnpm -C frontend dev
pnpm -C frontend lint
pnpm -C frontend typecheck
pnpm -C frontend build
pnpm -C frontend start
```

- `dev`: levanta el entorno de desarrollo en `http://localhost:3000`.
- `lint`: ejecuta las reglas de ESLint.
- `typecheck`: corre TypeScript en modo estricto (`tsc --noEmit`).
- `build`: compila la aplicación (SSR + rutas estáticas).
- `start`: arranca la app compilada.

Las pruebas unitarias se ejecutan con:

```bash
pnpm -C frontend test
```

## Notas sobre SSR e hidratación

Los componentes que dependen de `recharts` (`FluxChart` y `CategoriesDonut`) se cargan dinámicamente con `ssr: false` para evitar errores de hidratación en Vercel. Cualquier nuevo gráfico que use la librería debe seguir el mismo patrón (`components/charts/*`).

## Dashboard `/dashboard/overview`

- KPIs, gráfico de flujo con proyección y donut de categorías utilizan datos obtenidos mediante `@tanstack/react-query` y el hook `useDashboardOverview`.
- Mientras llega la integración con la API real se utilizan mocks en `mocks/overview-*.json`.
- Se incluyen estados de carga (`Skeletons`) y de error con opción de reintento.
- El layout soporta modo claro/oscuro mediante clases de Tailwind (`bg-background`, `text-foreground`).

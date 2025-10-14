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

## Supabase ENV

- **Variables requeridas (cliente)**: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Variables sólo servidor**: `SUPABASE_SERVICE_ROLE_KEY`, `SB_PUBLISHABLE_KEY` y `SB_SECRET_KEY`. No deben importarse en componentes cliente.
- **Dónde encontrarlas**: en tu proyecto de Supabase ve a **Settings → API** y copia el **Project URL**, la **anon public key**, la **service role key** y el resto de claves de tu integración.
- **Entorno local**: copia `.env.local.example` a `.env.local` y rellena tus valores antes de ejecutar la app.
- **Validación**: el helper `lib/env.ts` expone `hasClientEnv()` que permite verificar si las variables públicas están presentes y `EnvGuard` muestra una pantalla de error amable mientras no se configuren.

### Configurar Supabase & Vercel

En Vercel, dentro de **Settings → Environment Variables**, define las siguientes variables en los entornos **Production** y **Preview**:

- `NEXT_PUBLIC_SUPABASE_URL` = URL del proyecto Supabase (por ejemplo, `https://<project>.supabase.co`).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = clave **anon public**.
- `SUPABASE_SERVICE_ROLE_KEY` = clave **service role** (no exponer en el cliente).
- `SB_PUBLISHABLE_KEY` = clave publicable de Stripe (u otro proveedor si aplica).
- `SB_SECRET_KEY` = clave secreta del proveedor correspondiente.

Después de guardarlas, ejecuta un redeploy para que el cliente tome los `NEXT_PUBLIC_*`.

### Prueba local en modo producción

```bash
cd SalomonAI_Organizado/frontend
cp .env.local.example .env.local   # completa tus valores
pnpm i
pnpm build
pnpm start
# abrir http://localhost:3000 (no debe verse la pantalla de "Algo falló")
```

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

## Pronósticos `/pronosticos`

- La página consume `/api/forecasts?horizon=7|30|90`, implementado en `app/api/forecasts/route.ts`, que responde con `ForecastResponse` (definido en `types/forecasts.ts`).
- El adaptador `lib/adapters/forecasts.ts` genera una serie histórica de 90 días más el horizonte solicitado, incluyendo bandas de incertidumbre (`lo`/`hi`) para los puntos proyectados.
- La UI obtiene los datos mediante `useForecast` (`lib/hooks/useForecast.ts`) usando React Query. Para conectar el backend real basta con actualizar el route handler para que proxyee el endpoint definitivo o sustituir la implementación de `getForecast`; los componentes de `app/pronosticos` no requieren cambios.

## Informe de estabilización (abril 2025)

- **Causa de la excepción**: varios componentes del App Router dependientes de estado y efectos se renderizaban como Server Components (faltaba la directiva `"use client"`) y accedían a APIs del navegador (`window`, `document`, `localStorage`) durante el render SSR, lo que generaba `ReferenceError` en producción.
- **Acciones aplicadas**:
  - Se etiquetaron como cliente todos los componentes interactivos (`app/ui/*`, `components/ui/*`, formularios y tablas).
  - Se aislaron las referencias a `window`/`document` con guardas en `useEffect` y handlers (sidebar, scroll infinito, drawer táctil, CTA del héroe).
  - Se centralizó el acceso a variables públicas en `src/config/env.ts` y se sustituyeron los `process.env.NEXT_PUBLIC_*` directos en hooks/servicios.
  - Se añadieron los error boundaries de App Router (`app/error.tsx`, `app/global-error.tsx`) y se habilitaron `productionBrowserSourceMaps`.
- **Archivos clave actualizados**: componentes de UI (`app/ui/*`, `components/ui/*`), navegación (`components/navigation/SidebarDrawer.tsx`), hooks (`hooks/use-*`), servicios (`lib/api-client.ts`, `lib/hooks-statements.ts`, `lib/supabase.ts`), configuración (`next.config.js`, `tsconfig.json`) y nuevo `src/config/env.ts`.
- **Validación local**:
  1. `pnpm install`
  2. `pnpm build`
  3. `pnpm start` y revisar `http://localhost:3000`
- **Despliegue**: con estas correcciones el build es determinista y la UI hidrata sin excepciones; tras aplicar los cambios se puede redeplegar en Vercel apuntando a `SalomonAI_Organizado/frontend` con los `NEXT_PUBLIC_*` configurados.

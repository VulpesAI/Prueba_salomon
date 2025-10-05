# Guía de plataforma SalomonAI

> Consulta también la [guía rápida de estilo y contraste](./style-guide.md) para aplicar la paleta y gradientes oficiales en nuevos componentes.

## 1. Autenticación con Supabase
- `frontend/lib/supabase.ts` crea un cliente de Supabase en el navegador y exige que las variables públicas `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` estén definidas para evitar inicializaciones silenciosas.【F:frontend/lib/supabase.ts†L1-L14】
- `AuthProvider` obtiene la sesión actual al montar el contexto, normaliza los metadatos del usuario y escucha `onAuthStateChange` para mantener sincronizados `user`, `session` e `isLoading` en cada transición.【F:frontend/context/AuthContext.tsx†L66-L113】
- Las acciones `login`, `signup`, `resetPassword` y `logout` delegan en las APIs oficiales de Supabase y propagan los errores para que la interfaz muestre retroalimentación precisa cuando una operación falla.【F:frontend/context/AuthContext.tsx†L115-L181】
- `useAuthenticatedFetch` refresca el `access_token` antes de cada llamada protegida y, si la lectura falla, reutiliza la sesión en memoria para no bloquear la petición.【F:frontend/hooks/useAuthenticatedFetch.ts†L8-L53】
- `AuthenticatedShell` espera a que la autenticación termine de cargar, redirige a `/login` si no existe sesión y envuelve las vistas internas con la navegación del dashboard y el menú de usuario.【F:frontend/components/authenticated/authenticated-shell.tsx†L45-L117】
- `TopbarActions` compone el menú del usuario autenticado y maneja el cierre de sesión de forma asíncrona para evitar estados inconsistentes en la UI.【F:frontend/components/authenticated/topbar-actions.tsx†L22-L123】

## 2. Variables `NEXT_PUBLIC_*`
- El archivo `.env.local.example` documenta los valores públicos mínimos: URL y clave anónima de Supabase más las bases REST/WebSocket del backend, motor conversacional y pasarela de voz.【F:frontend/.env.local.example†L1-L10】
- Para el entorno actual utiliza las credenciales públicas entregadas por Supabase:
  ```env
  NEXT_PUBLIC_SUPABASE_URL=https://yyfyhjxjofgrfywawlme.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5Znloanhqb2ZncmZ5d2F3bG1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNTUyNjcsImV4cCI6MjA3NDkzMTI2N30.Pw_AxMp8YOYXhHOUJlRN_wTmRjHSh6Tfa22BsIJwTj0
  ```

## 3. Hooks principales
- `useConversationEngine` mantiene el historial de mensajes, procesa eventos de streaming (`intent`, `token`, `insight`, `summary`) y expone `sendMessage`/`cancelStreaming` para controlar la conversación con el motor externo.【F:frontend/hooks/useConversationEngine.ts†L60-L210】
- `useFinancialSummary` carga el resumen financiero de la sesión actual, controla estados de carga/error y permite refrescar o sobrescribir el resumen desde otros componentes.【F:frontend/hooks/useFinancialSummary.ts†L6-L43】
- `useVoiceGateway` abstrae las interacciones con el gateway de voz: abre el WebSocket, distribuye transcripciones parciales/finales, sintetiza audio vía REST y reporta errores de conexión.【F:frontend/hooks/useVoiceGateway.ts†L21-L142】

## 4. Panel de overview y alertas
- `DashboardOverviewPage` combina `useDashboardOverview`, `useDashboardIntelligence` y `useDashboardNotifications` para generar tarjetas resumidas, actividad reciente, alertas predictivas y pestañas filtrables; cada sección puede refrescarse de forma independiente para mantener los datos al día.【F:frontend/app/(authenticated)/dashboard/overview/page.tsx†L90-L200】

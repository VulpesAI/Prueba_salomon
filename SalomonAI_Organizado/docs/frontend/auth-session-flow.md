# Auth Session Flow

Este documento describe el flujo de autenticación cliente-backend en el frontend de SalomonAI, incluyendo el _happy path_, la renovación de sesión y el manejo de errores 401/403.

## Componentes principales

- **AuthProvider (`@/context/AuthContext`)**: escucha el estado de Firebase Auth, intercambia `idToken` por una sesión del backend y expone la sesión tipada (`AuthSession`) a todos los módulos post-login.
- **Handler `/api/auth/session`**: persiste el `accessToken` y el `refreshToken` como cookies `HttpOnly`, cifrando el refresh cuando existe `REFRESH_TOKEN_COOKIE_SECRET`.
- **Middleware (`frontend/middleware.ts`)**: valida la cookie `token` en cada navegación protegida y redirige a `/login` cuando falta.
- **Hook `useAuthenticatedFetch`**: construye _headers_ con `Authorization`, permite forzar un refresh y centraliza la telemetría de errores en peticiones autenticadas.

## Happy path

1. El usuario inicia sesión en Firebase (email/password o Google). `AuthProvider` recibe el `FirebaseUser` y llama a `exchangeFirebaseUser`.
2. Se obtiene un `idToken` y se envía a `POST /auth/firebase/login`. El backend responde con `accessToken`, `refreshToken`, expiraciones y `backendUser`.
3. `applyBackendSession` normaliza la respuesta, agenda el refresco (`/auth/token/refresh`) con un _timer_ y actualiza `sessionRef`/`session`.
4. `AuthProvider` informa al handler `/api/auth/session` para guardar la cookie `HttpOnly` y propaga `backendUser` y tokens a todo el árbol React.
5. El middleware detecta `token` en cada navegación a rutas protegidas (`/dashboard`, `/accounts`, etc.) y deja pasar la petición.
6. `useAuthenticatedFetch` agrega `Authorization: <tokenType> <accessToken>` automáticamente. Si la petición lo requiere, puede invocarse `forceRefresh` para sincronizar los tokens con el backend antes de enviar la solicitud.

## Renovación automática

- 60 segundos antes de `expiresAt`, el `AuthProvider` dispara `refreshSession`, que llama a `POST /auth/token/refresh` con el `refreshToken` actual.
- Al recibir una respuesta válida, se actualiza la sesión, el temporizador y las cookies `HttpOnly`.
- Los módulos que usen `sessionRef` (por ejemplo, `useAuthenticatedFetch`) siempre tendrán acceso al token más reciente sin esperar a un re-render.

## Errores 401/403

- Si `POST /auth/token/refresh` devuelve 401, `handleUnauthorizedSession` limpia estado/cookies, emite `auth.session.invalidated` y redirige a `/login`.
- `useAuthenticatedFetch` detecta respuestas 401/403 en cualquier llamada autenticada, emite `auth.fetch.unauthorized`, intenta un refresh y, si persiste el fallo, registra `auth.fetch.session_invalid` antes de invalidar la sesión.
- Fallos al informar el cierre de sesión (`/auth/logout`) generan telemetría `auth.logout.backend_failed` o `auth.logout.backend_error` para facilitar la observabilidad.

## Notas operativas

- Nuevos providers (React Query, Analytics, etc.) deben añadirse al componente `frontend/app/providers.tsx` para compartir estado por encima de las rutas protegidas.
- Los eventos de telemetría se despachan como `CustomEvent("telemetry", { detail })` en el navegador y se registran en consola en entornos no productivos.

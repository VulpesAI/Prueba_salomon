# Guía de plataforma SalomonAI

## 1. Flujo de autenticación y variables públicas de Next.js

### AuthProvider y ciclo de vida de sesión
- `AuthProvider` inicializa Firebase en el cliente, escucha `onAuthStateChanged` y sincroniza `user`, `session` e `isLoading` en cada cambio. Si el usuario de Firebase desaparece limpia el estado y corta la suscripción al desmontar.【F:frontend/context/AuthContext.tsx†L112-L293】
- Siempre que existe un usuario de Firebase nuevo, el proveedor solicita un `idToken`, lo intercambia contra `POST /auth/firebase-login` y almacena el `accessToken` interno junto con los datos del backend en memoria para futuras llamadas.【F:frontend/context/AuthContext.tsx†L176-L208】
- El contexto configura el cliente Axios global para que cada request adjunte el token actual y, ante un `401`, fuerce el cierre de sesión y redireccione a `/login`.【F:frontend/context/AuthContext.tsx†L146-L174】
- Las acciones `login`, `signup`, `loginWithGoogle`, `resetPassword` y `logout` resuelven dinámicamente la instancia de Firebase antes de operar y garantizan que, si el intercambio con el backend falla, se revierte la sesión local.【F:frontend/context/AuthContext.tsx†L295-L402】
- Cualquier hook o componente que dependa de la sesión debe consumir `useAuth()`, que valida que el contexto se utilice dentro del árbol de `AuthProvider` para evitar estados inconsistentes.【F:frontend/context/AuthContext.tsx†L419-L424】

### Carga dinámica del SDK de Firebase
- `frontend/lib/firebase.ts` realiza la carga diferida del SDK compat de Firebase insertando etiquetas `<script>` sólo en entorno de navegador y reutilizándolas si ya existen. El helper `ensureFirebaseNamespace()` serializa la carga de scripts y reutiliza la misma promesa para evitar condiciones de carrera.【F:frontend/lib/firebase.ts†L69-L156】
- Antes de inicializar una app se valida que la configuración cuente con todas las claves obligatorias; si faltan se lanza un error explícito. De esta forma se evitan inicializaciones parciales y se loguea una advertencia para diagnósticos en ambientes incompletos.【F:frontend/lib/firebase.ts†L158-L209】
- Los helpers `getFirebaseApp`, `getFirebaseAuth` y `getGoogleAuthProvider` aseguran que las APIs sólo se usen en el navegador y que la instancia se cree una vez. Las llamadas repetidas reutilizan la instancia almacenada en memoria.【F:frontend/lib/firebase.ts†L218-L247】
- La inicialización de Analytics se maneja de forma opcional: sólo se carga el script cuando la función es invocada y cualquier error durante la carga deja la función resolviendo `null` para no bloquear el resto del flujo.【F:frontend/lib/firebase.ts†L249-L281】

### Variables `NEXT_PUBLIC_*`
- `NEXT_PUBLIC_FIREBASE_*` define las credenciales del proyecto y se combinan con un `fallbackConfig` para ambientes de demo. Todas las claves críticas (`apiKey`, `authDomain`, etc.) deben estar presentes para que `ensureFirebaseApp` funcione.【F:frontend/lib/firebase.ts†L158-L209】
- `NEXT_PUBLIC_CONVERSATION_ENGINE_URL` centraliza la URL del motor conversacional usado tanto por `useConversationEngine` como por `useFinancialSummary`. Si no está definida, ambos hooks apuntan a `http://localhost:8002` durante el desarrollo.【F:frontend/hooks/useConversationEngine.ts†L77-L206】【F:frontend/hooks/useFinancialSummary.ts†L11-L35】
- `NEXT_PUBLIC_VOICE_GATEWAY_URL` fija la base REST/WebSocket del gateway de voz, con fallback a `http://localhost:8100` para entornos locales.【F:frontend/hooks/useVoiceGateway.ts†L27-L134】
- `NEXT_PUBLIC_API_URL` y `NEXT_PUBLIC_FINANCIAL_PROVIDER` controlan el dashboard: la primera señala al backend core (`http://localhost:3000` por defecto) y la segunda decide qué integración financiera se habilita (actualmente sólo Belvo).【F:frontend/app/dashboard/page.tsx†L205-L402】【F:frontend/app/dashboard/page.tsx†L498-L590】

## 2. Hooks principales: orquestación, streaming y errores

### `useConversationEngine`
- Mantiene el historial de mensajes y un mensaje asistente activo al que se le van anexando tokens de streaming. Cada envío aborta cualquier stream previo, crea un `AbortController` y publica la solicitud `POST /chat/stream` en el motor conversacional usando la URL pública configurada.【F:frontend/hooks/useConversationEngine.ts†L60-L206】
- El stream se procesa chunk a chunk dividiendo por saltos de línea. Cada fragmento se parsea como JSON y se despacha por tipo de evento: `intent` actualiza la intención y etiqueta el mensaje, `token` concatena texto incremental, `insight` agrega o reemplaza insights únicos por etiqueta, `metadata` guarda datos adicionales, `summary` emite el callback opcional, `done` limpia el estado de streaming y `error` expone el mensaje al UI.【F:frontend/hooks/useConversationEngine.ts†L111-L165】【F:frontend/hooks/useConversationEngine.ts†L220-L242】
- Los errores de red o parseo no bloquean el loop: los chunks inválidos se registran con `console.warn`, mientras que fallos del fetch (distintos a abortos voluntarios) detienen el streaming y exponen la razón al consumidor mediante `error`.【F:frontend/hooks/useConversationEngine.ts†L173-L242】

### `useFinancialSummary`
- Obtiene la foto financiera con `GET /context/summary` para una sesión dada, controlando los estados `isLoading`, `summary` y `error`. Cualquier fallo marca el error pero asegura que el indicador de carga se restablezca en el bloque `finally`.【F:frontend/hooks/useFinancialSummary.ts†L6-L35】
- Expone `refresh` para reintentar manualmente la lectura y `updateSummary` para permitir que otros componentes (por ejemplo, `useConversationEngine` tras un evento `summary`) sincronicen la vista sin llamar a la API.【F:frontend/hooks/useFinancialSummary.ts†L15-L43】

### `useVoiceGateway`
- Deriva las URLs REST/WS a partir de la variable pública y la `sessionId`. Abre un `WebSocket` cuando `start()` es invocado, envía el evento `start` y actualiza el `status` mientras escucha mensajes de estado, transcripciones parciales/finales y errores del gateway.【F:frontend/hooks/useVoiceGateway.ts†L27-L103】
- `stop()` cierra explícitamente la sesión, mientras que `cleanup()` también se ejecuta al desmontar para limpiar timeouts y sockets abiertos. La transcripción se entrega a callbacks externos, permitiendo sincronizar UI o disparar otras acciones en tiempo real.【F:frontend/hooks/useVoiceGateway.ts†L36-L109】
- `speak()` realiza una petición `POST /voice/speech` para sintetizar audio, reproduce el resultado en el navegador y captura errores devolviéndolos a través del estado `error` sin interrumpir la conexión principal.【F:frontend/hooks/useVoiceGateway.ts†L110-L141】

## 3. Pantalla de dashboard: estados, filtros, Belvo y dependencias

### Administración de estado y ciclos de carga
- El dashboard mantiene estados diferenciados para totales, cuentas, transacciones, categorías, insights, pronósticos, alertas, recomendaciones y notificaciones, cada uno con sus propias banderas de carga y error para granularidad en la UI.【F:frontend/app/dashboard/page.tsx†L175-L292】
- `fetchSummaryAndAccounts()` centraliza la carga inicial y los refrescos de totales, transacciones, desglose por categoría y cuentas conectadas. Maneja cancelaciones mediante `AbortController`, normaliza respuestas parciales y reestablece los estados de error cuando corresponde.【F:frontend/app/dashboard/page.tsx†L292-L421】
- `refreshAccountsAndTransactions()` encapsula la obtención del token de Firebase y reutiliza la función anterior para forzar un refresco tras acciones como la conexión bancaria.【F:frontend/app/dashboard/page.tsx†L422-L456】

### Filtros y búsqueda de transacciones
- Los filtros controlan rangos de fechas, categoría y montos, además de una búsqueda textual. La lista filtrada se recalcula con `useMemo`, aplicando los filtros activos y validando que las fechas y montos sean correctos antes de incluir cada transacción.【F:frontend/app/dashboard/page.tsx†L1208-L1347】
- El diálogo de filtros permite editar campos, limpiar todos los criterios y aplicar los cambios sin hacer una llamada extra; el filtrado ocurre localmente sobre `recentTransactions`. La exportación reutiliza los filtros activos para construir la query que se envía al backend.【F:frontend/app/dashboard/page.tsx†L1348-L1459】

### Conexión con Belvo y refresco posterior
- `handleConnectAccount()` detecta el proveedor configurado, solicita un token de widget al backend protegido (`POST /api/v1/belvo/widget/token`), carga el SDK de Belvo dinámicamente y construye el widget con callbacks para registrar la conexión y refrescar los datos al completarse.【F:frontend/app/dashboard/page.tsx†L464-L590】
- Tras registrar exitosamente un enlace (`POST /api/v1/belvo/widget/connections`), se invoca `refreshAccountsAndTransactions()` para rehidratar totales, cuentas y transacciones con los datos recién vinculados.【F:frontend/app/dashboard/page.tsx†L561-L590】
- Los manejadores de error del widget aseguran mensajes claros tanto para fallos técnicos como para salidas del usuario, restableciendo el estado de carga y mostrando retroalimentación en pantalla.【F:frontend/app/dashboard/page.tsx†L520-L590】

### Dependencias de backend
- Todas las funciones de datos consumen endpoints REST del backend core usando la URL `NEXT_PUBLIC_API_URL`, por ejemplo: `GET /dashboard/summary`, `GET /dashboard/accounts`, `GET /dashboard/insights`, `GET /alerts/predictive`, `GET /dashboard/recommendations/personalized`, `GET /notifications`, `GET /notifications/preferences`, `POST /dashboard/recommendations/feedback` y `GET /dashboard/transactions/export`. Cada solicitud adjunta el `Bearer` token del usuario autenticado.【F:frontend/app/dashboard/page.tsx†L292-L1449】
- Las secciones de alertas, preferencias y recomendaciones utilizan `useEffect` con abortos y banderas de carga independientes para que el fallo de un módulo no afecte a los demás. Cualquier error se registra en consola y se almacena en su estado de error específico para informar al usuario.【F:frontend/app/dashboard/page.tsx†L600-L1186】

## 4. Guías de extensión y pruebas

### Extensión de componentes UI
- Los componentes visuales se basan en la librería localizada en `frontend/components/ui`. Al añadir variantes o nuevos elementos, reutiliza los componentes existentes (`Button`, `Card`, `Dialog`, etc.) y respeta el patrón de props controladas utilizado en el dashboard (por ejemplo, pasar `isLoading`, `error` y callbacks específicos). Mantén la lógica de estado en hooks o páginas y deja que los componentes UI se mantengan presentacionales.【F:frontend/app/dashboard/page.tsx†L1459-L2478】
- Para componentes que reaccionan a streams o sockets (como el asistente), encapsula la lógica en hooks siguiendo el modelo de `useConversationEngine` y propaga únicamente datos normalizados y handlers al componente visual.

### Pruebas end-to-end
- Ejecuta la aplicación con las variables `NEXT_PUBLIC_*` configuradas y utiliza herramientas como Playwright o Cypress apuntando al dominio local. Prioriza escenarios críticos: autenticación (incluyendo errores de credenciales), flujo de conversación con streaming activo, conexión bancaria vía Belvo (usando entornos sandbox) y exportación de transacciones con filtros aplicados.
- Simula respuestas del backend cuando sea necesario levantando servicios mock o interceptando requests en el runner de E2E para cubrir estados de error (por ejemplo, fallos en `/dashboard/summary` o `POST /voice/speech`).

### Configuración de entornos
- **Desarrollo local:** define `NEXT_PUBLIC_FIREBASE_*`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CONVERSATION_ENGINE_URL`, `NEXT_PUBLIC_VOICE_GATEWAY_URL` y `NEXT_PUBLIC_FINANCIAL_PROVIDER`. Los hooks proveen valores por defecto (`localhost`) para acelerar la configuración, pero la autenticación sólo funcionará correctamente con credenciales válidas.【F:frontend/lib/firebase.ts†L158-L281】【F:frontend/hooks/useConversationEngine.ts†L77-L206】【F:frontend/hooks/useVoiceGateway.ts†L27-L141】
- **QA/Staging:** utiliza proyectos de Firebase y endpoints de backend separados. Habilita Analytics llamando a `getFirebaseAnalytics()` dentro de `_app.tsx` o un efecto global si necesitas telemetría. Verifica que el dominio permita cargar el SDK de Belvo.
- **Producción:** asegura que todas las variables `NEXT_PUBLIC_*` estén definidas en el entorno de despliegue (por ejemplo, variables de entorno en Vercel o contenedores). Configura HTTPS en los endpoints del motor conversacional y voice gateway para evitar bloqueos del navegador, y revisa los orígenes permitidos por Belvo.

---
Esta guía centraliza los puntos clave para operar y extender la experiencia web de SalomonAI, manteniendo alineados los flujos de autenticación, conversación, voz y analítica financiera.

# Dependencias para habilitar el frontend post-login

Este documento lista los servicios y recursos que deben estar activos para ejecutar el plan de integración post-login descrito en `docs/frontend/platform-overview.md` y en el roadmap de módulos.

## 1. Servicios obligatorios

| Servicio / recurso | Cómo se levanta | Módulos que dependen | Notas |
|--------------------|-----------------|----------------------|-------|
| `core-api` (NestJS) | `docker compose up core-api` | Autenticación unificada, dashboard, cuentas, transacciones, metas, alertas, asistente, configuración | Expone los endpoints REST consumidos por React Query y gestiona la sesión JWT. |
| Supabase (PostgreSQL gestionado) | Configura `.env` con la URL remota | Todos los módulos | Base de datos principal alojada en Supabase; usa el pool transaccional (`6543`) con `?sslmode=require`. |
| `qdrant` | `docker compose up qdrant` | Dashboard (insights), recomendaciones, analítica | Almacena embeddings usados por recomendaciones y alertas inteligentes. |
| `kafka` + `zookeeper` | `docker compose up kafka` | Ingesta de documentos, sincronización Belvo | Necesario para que `parsing-engine` procese eventos emitidos desde `core-api`. |
| `parsing-engine` | `docker compose up parsing-engine` | Alertas, documentos enriquecidos en dashboard | Consume eventos de Kafka y escribe resultados en `/uploads`. |
| `recommendation-engine` | `docker compose up recommendation-engine` | Dashboard (recomendaciones), analítica, asistente | Devuelve recomendaciones personalizadas y recibe feedback del usuario. |
| `financial-connector` | `docker compose up financial-connector` | Dashboard, cuentas, transacciones, configuración | Gestiona la sincronización con Belvo y los flujos de importación manual. |
| `forecasting-engine` | `docker compose up forecasting-engine` | Dashboard (pronósticos), analítica/forecasts | Calcula escenarios financieros y requiere la cadena `FORECASTING_DATABASE_URL` apuntando a Supabase. |
| `conversation-engine` | `docker compose up conversation-engine` | Asistente, resumen financiero | Provee endpoints `/chat` y `/context/summary` consumidos por los hooks `useConversationEngine` y `useFinancialSummary`. |
| `voice-gateway` | `docker compose up voice-gateway` | Asistente (voz) | Publica sockets y endpoints de TTS/STT usados por `useVoiceGateway`. |
| `frontend` (Next.js) | `docker compose up frontend` | Interfaz completa | Depende de las URLs públicas (`NEXT_PUBLIC_*`) para comunicarse con los servicios anteriores. |

> **Sugerencia:** utiliza `docker compose up --build frontend core-api financial-connector recommendation-engine forecasting-engine conversation-engine voice-gateway parsing-engine kafka zookeeper qdrant` para levantar todos los componentes necesarios en desarrollo.

## 2. Variables de entorno mínimas

Configura el archivo `.env` (usado por los contenedores backend) con los siguientes bloques:

- **Base de datos:** `POSTGRES_*` apuntando a Supabase (host pooler, puerto 6543) y `FORECASTING_DATABASE_URL` con `?sslmode=require`.
- **Servicios internos:** `FINANCIAL_CONNECTOR_URL`, `RECOMMENDATION_ENGINE_URL`, `FORECASTING_ENGINE_URL`, `CORE_API_URL`.
- **Mensajería:** `KAFKA_BROKER`, `KAFKA_TOPIC`, `KAFKA_CLIENT_ID`, `KAFKA_GROUP_ID`.
- **Autenticación:** `JWT_SECRET`, `API_KEY_SECRET`, credenciales de Firebase cuando se valide el token del frontend.

Para el frontend (`frontend/.env.local`):

- `SUPABASE_URL` y `SUPABASE_ANON_KEY` si el frontend interactúa con servicios directos de Supabase (por ejemplo, Auth).

- `NEXT_PUBLIC_API_URL` apuntando a `http://localhost:3000` (expuesto por `core-api`).
- `NEXT_PUBLIC_CONVERSATION_ENGINE_URL` con `http://localhost:8002`.
- `NEXT_PUBLIC_VOICE_GATEWAY_URL` con `http://localhost:8100`.
- Credenciales `NEXT_PUBLIC_FIREBASE_*` válidas para completar el intercambio de sesión.

## 3. Secuencia recomendada de arranque

1. Crear/actualizar `.env` y `.env.local` con los valores descritos.
2. Si usas Supabase, asegúrate de que la base remota esté accesible y que tus credenciales del pool estén activas.
3. `docker compose up -d core-api financial-connector recommendation-engine forecasting-engine parsing-engine conversation-engine voice-gateway`.
4. Confirmar healthchecks (`docker compose ps` o `curl http://localhost:<puerto>/health`).
5. `docker compose up frontend` y acceder a `http://localhost:3001`.

## 4. Validaciones posteriores

- Desde el dashboard verifica que cuentas, transacciones, recomendaciones, alertas y notificaciones muestren datos reales.
- Ejecuta el asistente para confirmar acceso al motor conversacional y al gateway de voz.
- Revisa los logs de `financial-connector` para asegurar que los flujos de sincronización con Belvo se disparan tras login o acciones de usuario.

Mantén este listado actualizado si se incorporan nuevos microservicios (por ejemplo, `nlp-engine`, `risk-engine`, `tax-engine`).

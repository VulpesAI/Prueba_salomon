# Core API Domain Overview

Este documento describe los módulos clave del servicio **core-api** y detalla sus endpoints, objetos de transferencia de datos (DTO), flujos operativos y dependencias externas.

## Módulo `auth`

### Endpoints principales

| Método | Ruta | Guardias | Descripción | DTO asociado |
| --- | --- | --- | --- | --- |
| `POST` | `/api/v1/auth/register` | — | Registra un usuario interno y devuelve el perfil sanitizado. | `CreateUserDto` (email, password, fullName). |
| `POST` | `/api/v1/auth/login` | `LocalAuthGuard` | Valida credenciales y MFA para emitir un par de tokens JWT/refresh. | `LoginUserDto` (email, password, totp opcional). |
| `POST` | `/api/v1/auth/token/refresh` | — | Rota un refresh token válido y entrega un nuevo par de tokens. | `RefreshTokenDto` (refreshToken). |
| `POST` | `/api/v1/auth/mfa/setup` | `JwtAuthGuard` | Genera secreto temporal y URL OTP para enrolamiento MFA. | — |
| `POST` | `/api/v1/auth/mfa/verify` | `JwtAuthGuard` | Confirma MFA usando TOTP/códigos de respaldo y devuelve códigos generados. | `VerifyMfaDto` (token). |
| `POST` | `/api/v1/auth/mfa/disable` | `JwtAuthGuard` | Desactiva MFA validando TOTP o código de respaldo. | `DisableMfaDto` (token, backupCode). |
| `POST` | `/api/v1/auth/firebase/login` | — | Intercambia un token Firebase por sesión JWT interna. | Header `Authorization: Bearer <firebaseIdToken>`. |
| `POST` | `/api/v1/auth/firebase/verify` | — | Valida un token Firebase y retorna datos del usuario sincronizado. | Header `Authorization: Bearer <firebaseIdToken>`. |

### Flujos destacados

1. **Autenticación local**: `LocalAuthGuard` invoca `AuthService.validateUser`, que verifica password con bcrypt, exige MFA cuando corresponde y genera eventos SIEM según resultado (`AUTH_LOGIN_FAILED`, `AUTH_MFA_REQUIRED`, etc.).【F:services/core-api/src/auth/auth.controller.ts†L33-L65】【F:services/core-api/src/auth/auth.service.ts†L24-L126】
2. **Emisión de tokens**: `AuthService.login` utiliza `TokenService.issueTokenPair` para crear access/refresh tokens, registrando actividad en el SIEM (`AUTH_TOKENS_ISSUED`). Los refresh tokens se almacenan con hash y rotación controlada.【F:services/core-api/src/auth/auth.service.ts†L128-L152】【F:services/core-api/src/auth/token.service.ts†L21-L136】
3. **MFA**: El enrolamiento genera un secreto base32, URL OTP y códigos de respaldo; la verificación mueve el secreto temporal a definitivo y persiste códigos hasheados. Deshabilitar MFA exige token o backup code válido.【F:services/core-api/src/auth/auth.service.ts†L154-L225】
4. **Federación Firebase**: Los endpoints `firebase/login` y `firebase/verify` usan `FirebaseAdminService` para validar tokens y sincronizar usuarios (`UsersService.syncWithFirebase`), devolviendo un JWT interno para acceso subsecuente.【F:services/core-api/src/auth/auth.controller.ts†L67-L165】【F:services/core-api/src/users/users.service.ts†L52-L114】

### Requisitos de autenticación

- Endpoints de MFA y refresco requieren JWT emitido por la plataforma (header `Authorization: Bearer <token>`).
- `auth/login` espera credenciales básicas y, si MFA está activo, el campo `totp`.
- Integraciones Firebase requieren tokens ID firmados por Firebase en el header `Authorization`.

### Ejemplos

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Secr3t123",
  "totp": "123456"
}
```

Respuesta exitosa:

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<id.secret>",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "refreshTokenExpiresAt": "2024-05-20T03:00:00.000Z",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "roles": ["user"],
    "mfaEnabled": true
  }
}
```

## Módulo `users`

### Endpoints principales

| Método | Ruta | Guardias | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/v1/users/profile` | `JwtAuthGuard` | Devuelve el perfil del usuario autenticado. |
| `PATCH` | `/api/v1/users/profile` | `JwtAuthGuard` | Permite actualizar campos editables del perfil (se excluyen id, email, roles). |
| `DELETE` | `/api/v1/users/profile` | `JwtAuthGuard` | Desactiva la cuenta del usuario autenticado. |
| `GET` | `/api/v1/users/:id` | `ApiKeyGuard` | Obtiene usuario por ID para integraciones administrativas. |
| `GET` | `/api/v1/users` | `ApiKeyGuard` | Lista usuarios con paginación (parámetros `limit`, `offset`). |
| `PATCH` | `/api/v1/users/:id` | `ApiKeyGuard` | Actualiza atributos del usuario indicado. |
| `POST` | `/api/v1/users/:id/activate` | `ApiKeyGuard` | Reactiva usuarios suspendidos. |
| `POST` | `/api/v1/users/:id/deactivate` | `ApiKeyGuard` | Suspende usuarios. |

### Flujos destacados

- Los endpoints de autogestión usan `UsersService` para cargar y persistir entidades `User`, limitando los campos que el propio usuario puede modificar.【F:services/core-api/src/users/users.controller.ts†L24-L88】
- Las operaciones administrativas requieren API key (header `x-api-key`) validada por `ApiKeyGuard`. Pueden gestionar estado (`isActive`) y editar metadatos completos.【F:services/core-api/src/users/users.controller.ts†L57-L88】
- `UsersService` soporta sincronización con Firebase y operaciones masivas (`findAll`) reutilizadas por tareas programadas como la generación de pronósticos.【F:services/core-api/src/users/users.service.ts†L7-L149】

### Ejemplo

```http
PATCH /api/v1/users/profile
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "displayName": "María Pérez",
  "preferences": { "currency": "CLP" }
}
```

Respuesta:

```json
{
  "id": "uuid",
  "email": "maria@example.com",
  "displayName": "María Pérez",
  "preferences": {
    "currency": "CLP",
    "timezone": "America/Santiago",
    "language": "es",
    "notifications": { "email": true, "push": true, "sms": false },
    "privacy": { "shareData": false, "analytics": true }
  },
  "isActive": true
}
```

## Módulo `belvo`

### Endpoints principales

Todos los endpoints requieren JWT y operan en nombre del usuario autenticado.

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/v1/belvo/institutions` | Lista instituciones disponibles filtradas por país (`country`, defecto `CL`). |
| `POST` | `/api/v1/belvo/connections` | Crea una conexión bancaria usando credenciales directas (`institution`, `username`, `password`). |
| `POST` | `/api/v1/belvo/widget/token` | Solicita token temporal para el widget de conexión. |
| `POST` | `/api/v1/belvo/widget/connections` | Registra conexión creada vía widget usando `linkId`. |
| `GET` | `/api/v1/belvo/connections` | Devuelve conexiones activas del usuario. |
| `GET` | `/api/v1/belvo/connections/:id` | Obtiene detalles y metadatos extendidos de una conexión. |
| `POST` | `/api/v1/belvo/connections/:id/sync` | Dispara sincronización de transacciones (query `days`, defecto 30). |
| `POST` | `/api/v1/belvo/connections/:id/status` | Consulta estado de la conexión (errores, último acceso). |
| `DELETE` | `/api/v1/belvo/connections/:id` | Elimina la conexión (HTTP 204). |
| `POST` | `/api/v1/belvo/sync-all` | Sincroniza todas las conexiones del usuario y devuelve resumen. |
| `GET` | `/api/v1/belvo/stats` | Estadísticas agregadas de conexiones. |
| `GET` | `/api/v1/belvo/connections/:id/accounts` | Lista cuentas asociadas a la conexión. |
| `GET` | `/api/v1/belvo/connections/:id/balances` | Devuelve balances actuales por cuenta. |

### DTOs y flujos

- `CreateBankConnectionDto` encapsula `userId`, `institution`, `username`, `password`; `BankConnectionService.createConnection` crea link en Belvo, persiste `BankConnection` y sincroniza cuentas iniciales.【F:services/core-api/src/belvo/bank-connection.service.ts†L10-L80】
- El flujo de widget valida `linkId`, recupera estado desde Belvo y almacena metadatos enriquecidos (logo, website).【F:services/core-api/src/belvo/bank-connection.service.ts†L82-L153】
- `syncConnection` y `syncAllConnections` usan `FinancialMovementsService` para crear movimientos transaccionales a partir de transacciones Belvo, consolidando errores y conteos en `SyncResult`.【F:services/core-api/src/belvo/belvo.controller.ts†L94-L209】【F:services/core-api/src/belvo/bank-connection.service.ts†L155-L259】
- `BelvoService` aplica autenticación Basic usando `BELVO_SECRET_ID`/`BELVO_SECRET_PASSWORD` y selecciona endpoint sandbox o producción según `BELVO_ENVIRONMENT`.【F:services/core-api/src/belvo/belvo.service.ts†L1-L118】

### Ejemplo

```http
POST /api/v1/belvo/widget/connections
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "linkId": "d4d7d9f4-connection"
}
```

Respuesta:

```json
{
  "connection": {
    "id": "uuid",
    "institutionName": "Banco Demo",
    "status": "valid",
    "accountsCount": 3,
    "lastSyncAt": "2024-05-10T12:00:00.000Z",
    "metadata": {
      "logo": "https://belvo.com/logo.png",
      "primaryColor": "#0050b3"
    }
  }
}
```

## Módulo `financial-movements`

### Endpoints principales

| Método | Ruta | Guardias | Descripción |
| --- | --- | --- | --- |
| `POST` | `/api/v1/financial-movements` | `ApiKeyGuard` | Inserta movimientos históricos desde integraciones externas. |
| `POST` | `/api/v1/financial-movements/classify` | `JwtAuthGuard` | Clasifica un movimiento nuevo usando embeddings y similitud en Qdrant. |
| `GET` | `/api/v1/financial-movements` | `JwtAuthGuard` | Lista movimientos del usuario con filtros de fecha y paginación. |
| `GET` | `/api/v1/financial-movements/summary` | `JwtAuthGuard` | Resume gastos por categoría dentro de un rango (`startDate`, `endDate`). |
| `GET` | `/api/v1/financial-movements/savings-potential` | `JwtAuthGuard` | Calcula potencial de ahorro mensual por categoría (últimos 6 meses). |
| `PATCH` | `/api/v1/financial-movements/:movementId` | `JwtAuthGuard` | Actualiza categoría de un movimiento existente. |

### DTOs y flujos

- `CreateFinancialMovementDto` acepta `description`, `amount`, `transactionDate`, `userId`, `category` opcional y `embedding` (vector numérico). Los embeddings se almacenan en Qdrant tras persistir en PostgreSQL.【F:services/core-api/src/financial-movements/dto/create-financial-movement.dto.ts†L1-L34】【F:services/core-api/src/financial-movements/financial-movements.service.ts†L32-L62】
- `ClassifyMovementDto` y `FinancialMovementsService.classifyBySimilarity` consultan Qdrant (`financial_movements`) con `score_threshold` 0.8 para reutilizar categorías de transacciones similares.【F:services/core-api/src/financial-movements/dto/classify-movement.dto.ts†L1-L11】【F:services/core-api/src/financial-movements/financial-movements.service.ts†L64-L90】
- `FindFinancialMovementsQueryDto` implementa paginación y filtros ISO8601; la respuesta incluye metadatos (`total`, `page`, `lastPage`).【F:services/core-api/src/financial-movements/dto/find-financial-movements-query.dto.ts†L1-L25】【F:services/core-api/src/financial-movements/financial-movements.service.ts†L92-L134】
- `UpdateFinancialMovementDto` permite corregir categoría, actualizando también el vector en Qdrant para mejorar futuras clasificaciones.【F:services/core-api/src/financial-movements/dto/update-financial-movement.dto.ts†L1-L11】【F:services/core-api/src/financial-movements/financial-movements.service.ts†L162-L206】

### Ejemplo

```http
POST /api/v1/financial-movements/classify
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "description": "Pago supermercado",
  "amount": -45000,
  "embedding": [0.12, -0.03, 0.44, ...]
}
```

Respuesta:

```json
{ "category": "Supermercado" }
```

## Módulo `dashboard`

### Endpoints principales (requieren JWT)

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/v1/dashboard/summary` | Consolida ingresos, gastos, balance, movimientos recientes y estado de metas del último mes. |
| `GET` | `/api/v1/dashboard/goals` | Devuelve vista rápida de metas activas. |
| `GET` | `/api/v1/dashboard/movements` | Lista movimientos paginados y permite filtros por categoría/fechas. |
| `GET` | `/api/v1/dashboard/forecasts` | Obtiene resumen de proyecciones financieras (modelo, tendencia, horizonte). |
| `GET` | `/api/v1/dashboard/recommendations/personalized` | Recupera recomendaciones personalizadas; query `refresh=true` fuerza recálculo. |
| `POST` | `/api/v1/dashboard/recommendations/feedback` | Envía retroalimentación de usuario (`SubmitRecommendationFeedbackDto`). |
| `GET` | `/api/v1/dashboard/spending-analysis` | Analiza gastos por categoría en una ventana de `months` (defecto 3). |

### Flujos

- `DashboardController` orquesta servicios de movimientos, pronósticos, metas y recomendaciones para producir vistas agregadas (totales, breakdown por categoría, tendencias semanales).【F:services/core-api/src/dashboard/dashboard.controller.ts†L1-L206】
- El análisis de gastos agrupa transacciones negativas, calcula totales/promedios y genera `topCategories` ordenado por gasto total.【F:services/core-api/src/dashboard/dashboard.controller.ts†L208-L274】
- Feedback de recomendaciones usa `SubmitRecommendationFeedbackDto` (campos `recommendationId`, `score` 0-1, `comment` opcional).【F:services/core-api/src/dashboard/dto/submit-recommendation-feedback.dto.ts†L1-L15】

### Ejemplo

```http
GET /api/v1/dashboard/summary
Authorization: Bearer <jwt>
```

Respuesta (resumida):

```json
{
  "summary": {
    "totalIncome": 1500000,
    "totalExpenses": 900000,
    "balance": 600000,
    "transactionCount": 42,
    "period": { "from": "2024-04-12T...", "to": "2024-05-12T..." }
  },
  "categories": {
    "Supermercado": { "total": 250000, "count": 6, "type": "expense" }
  },
  "trends": [ { "week": "2024-05-06", "income": 250000, "expenses": 180000, "transactions": 9 } ],
  "goals": { ... },
  "recentTransactions": [ { "id": "uuid", "description": "Pago tarjeta", "amount": -75000 } ]
}
```

## Módulo `financial-forecasts`

### Componentes clave

- **Servicio**: `FinancialForecastsService` consume un motor externo vía HTTP (`engineUrl`) para generar proyecciones, persistiendo los resultados en la tabla `financial_forecasts`. Expone métodos `refreshForecastsForUser`, `getForecastSummary` y `getForecastSeries` usados por el dashboard y otros servicios.【F:services/core-api/src/financial-forecasts/financial-forecasts.service.ts†L1-L164】
- **Scheduler**: `FinancialForecastsScheduler` ejecuta un cron diario (01:00) que recorre usuarios activos y refresca proyecciones según el horizonte configurado.【F:services/core-api/src/financial-forecasts/financial-forecasts.scheduler.ts†L1-L37】
- **Entidad**: Define columnas `forecastDate`, `predictedValue`, `modelType`, `metadata` para almacenar trazabilidad del modelo y resultados.【F:services/core-api/src/financial-forecasts/entities/financial-forecast.entity.ts†L1-L45】

### Flujos

1. **Refresco**: Se consulta el motor con parámetros `horizon` y `model`, se guarda la serie y se emite evento `metrics.updated` para monitoreo/BI.【F:services/core-api/src/financial-forecasts/financial-forecasts.service.ts†L34-L90】
2. **Transformación**: `toSummary` calcula tendencia (`upward`, `downward`, `stable`) midiendo cambio porcentual entre primer y último punto.【F:services/core-api/src/financial-forecasts/financial-forecasts.service.ts†L116-L164】
3. **Consumo en dashboard**: `GET /dashboard/forecasts` retorna el último resumen o un objeto vacío si no hay datos, permitiendo a front-end manejar estados iniciales.【F:services/core-api/src/dashboard/dashboard.controller.ts†L121-L171】

### Ejemplo de respuesta del dashboard

```json
{
  "modelType": "prophet",
  "generatedAt": "2024-05-12T01:00:00.000Z",
  "horizonDays": 30,
  "historyDays": 120,
  "forecasts": [
    { "date": "2024-05-13", "amount": 520000 },
    { "date": "2024-05-14", "amount": 518500 }
  ],
  "trend": { "direction": "downward", "change": -15000, "changePercentage": -2.8 }
}
```

## Dependencias externas y configuración

| Dependencia | Uso | Configuración relevante |
| --- | --- | --- |
| **Firebase Admin** | Validar tokens ID, sincronizar usuarios, enviar notificaciones push. | Se inicializa con credenciales del servicio (`FIREBASE_SERVICE_ACCOUNT_KEY` o variables individuales) en `FirebaseAdminService`.【F:services/core-api/src/firebase/firebase-admin.service.ts†L1-L47】 |
| **Belvo API** | Conexión a instituciones financieras, extracción de cuentas/transacciones. | `BelvoService` selecciona sandbox/producción vía `BELVO_ENVIRONMENT` y usa `BELVO_SECRET_ID`/`BELVO_SECRET_PASSWORD` para autenticación Basic. |【F:services/core-api/src/belvo/belvo.service.ts†L1-L118】|
| **Qdrant** | Almacenamiento vectorial para clasificar movimientos y reglas. | `createQdrantConfig` define `QDRANT_URL`/`collectionName` y `QdrantService` inicializa el cliente REST verificando conectividad en `onModuleInit`. |【F:services/core-api/src/config/app.config.ts†L18-L33】【F:services/core-api/src/qdrant/qdrant.service.ts†L1-L47】|
| **Forecasting engine** | Generación de series temporales y tendencias financieras. | `configuration.ts` carga `FORECASTING_ENGINE_URL` y `FORECASTING_DEFAULT_HORIZON_DAYS`, usados por `FinancialForecastsService` y el scheduler. |【F:services/core-api/src/config/configuration.ts†L1-L33】【F:services/core-api/src/financial-forecasts/financial-forecasts.service.ts†L34-L63】|
| **SIEM externo** | Auditoría de eventos de seguridad (login, MFA, rotación tokens). | `SiemLoggerService` envía eventos al endpoint `SIEM_ENDPOINT` con token opcional `SIEM_TOKEN`. |【F:services/core-api/src/security/siem-logger.service.ts†L1-L40】|

## Eventos de seguridad y SIEM

- El módulo `auth` registra eventos de intentos fallidos, éxitos, enrolamiento MFA y revocación de tokens, permitiendo monitoreo de amenazas y cumplimiento SOC2/ISO 27001.【F:services/core-api/src/auth/auth.service.ts†L26-L219】【F:services/core-api/src/auth/token.service.ts†L94-L136】
- Otros servicios pueden reutilizar `SiemLoggerService` al importar `SecurityModule`, asegurando consistencia en formato y metadatos (timestamp, entorno, servicio).【F:services/core-api/src/security/security.module.ts†L1-L9】

## Pautas para extender a nuevos dominios

1. **Definir controladores y DTOs** siguiendo el patrón descrito: validar entrada con `class-validator`, aplicar guardias (`JwtAuthGuard`, `ApiKeyGuard`) y retornar respuestas normalizadas.
2. **Orquestar servicios reutilizando dependencias comunes** (p. ej., `QdrantService` para clasificación, `SiemLoggerService` para auditoría).
3. **Registrar configuración** en `configuration.ts` y `default.config.ts`, exponiendo valores por entorno via `ConfigService`.
4. **Documentar eventos críticos** y, si aplica, invocar `SiemLoggerService.logSecurityEvent` para trazabilidad de seguridad.
5. **Proveer endpoints agregados** en módulos de experiencia (como `dashboard`) para evitar sobrecarga de llamadas desde clientes.

## Requisitos de autenticación resumidos

- **JWT Bearer**: mayoría de endpoints para usuarios finales (`users`, `financial-movements`, `dashboard`, `belvo`).
- **API Key**: operaciones administrativas o integraciones de backend (`users`, `financial-movements`).
- **Firebase ID Token**: rutas especiales de federación (`/auth/firebase/*`).
- **Credenciales Belvo**: proporcionadas por el usuario o widget; la API las transmite de forma segura al proveedor.

## Referencias cruzadas

- Entidades y servicios relacionados con cumplimiento se detallan adicionalmente en `docs/compliance/ISO27001.md` y `docs/compliance/SOC2.md`.

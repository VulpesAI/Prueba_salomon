# Core API Service

This directory contains the backend Core API service for the SalomonAI platform. It is a Node.js application built with NestJS and intended to be deployed in containerized environments.

## Deployment

When deploying this service to managed platforms (for example Supabase Edge Functions, Cloud Run or Firebase App Hosting), ensure the server listens on the port defined by the `PORT` environment variable provided by the hosting platform. These services inject `PORT=8080` into the runtime, so the application must not hard-code an alternative port.

Example command to start the compiled application locally in a way that matches these platforms:

```bash
PORT=8080 node dist/main.js
```

Configure your process manager or container entrypoint to use this pattern so the service respects the dynamic port assignment when running in production.

## Environment strictness modes

The API can operate in two strictness modes controlled by the `STRICT_ENV` environment flag:

- **strict** (`STRICT_ENV=true`): requires a configured Postgres database. `UserModule` and `AuthModule` rely on TypeORM repositories and refresh tokens are stored in the `auth_tokens` table.
- **minimal** (`STRICT_ENV=false`): skips the database requirement and registers in-memory implementations for user management and refresh token persistence. Combine this mode with the `CORE_API_PROFILE` (see below) to decide whether the rest of the infrastructure should be started.

This makes it possible to run lightweight environments (for demos or tests) without provisioning Postgres. Switching back to strict mode automatically restores the TypeORM-backed services.

## Runtime profiles (`CORE_API_PROFILE`)

The new `CORE_API_PROFILE` environment variable controls which infrastructure modules the Core API boots. It defaults to `minimal`.

- **minimal**: keeps only the essential platform pieces — `ConfigModule`, `WinstonModule`, `CacheModule`, `HealthModule` and the in-memory authentication modules (`AuthModule`/`UserModule`). Optional dependencies such as Kafka, Qdrant or schedulers are replaced with no-op implementations, so the service never attempts to reach external infrastructure during startup.
- **full**: loads the complete feature set (Kafka, Qdrant, schedulers, dashboards, NLP, Belvo, forecasting, alerts, etc.) and expects the backing services to be available.

`ConfigService` exposes the active profile through `configService.get('app.profile')`.

To enable the full profile locally or in production simply set `CORE_API_PROFILE=full` (and provide the corresponding infrastructure credentials). Leaving the variable undefined defaults to the minimal profile.

### Despliegues en App Hosting sin servicios externos

Cuando subas la aplicación a plataformas gestionadas (Supabase, Firebase App Hosting, Cloud Run, etc.) sin Postgres, Kafka ni motores anexos, mantén `CORE_API_PROFILE=minimal` (valor por defecto) y deja vacías las variables opcionales (`POSTGRES_*`, `KAFKA_BROKER`, `QDRANT_URL`, `RECOMMENDATION_ENGINE_URL`, `FORECASTING_ENGINE_URL`, etc.).

Si se cargan valores ficticios (por ejemplo, los que venían en `.env.example`), `AppModule` asumirá que se desea el perfil completo y activará los conectores externos. Mantén los campos vacíos para evitar conexiones fantasma.

El `.env.example` se entrega con las claves `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD` y `POSTGRES_DB` vacías a propósito. Déjalas así cuando despliegues sin base de datos y complétalas únicamente cuando tengas un Postgres real disponible. El script `npm run env:check` detectará esas credenciales en blanco y marcará la base de datos como desactivada hasta que aportes valores válidos.

### Variables mínimas necesarias

Para iniciar en modo mínimo (`STRICT_ENV=false` y `CORE_API_PROFILE=minimal`) debes definir:

- `JWT_SECRET`: la firma de los tokens emitidos por la API.
- `ALLOWED_ORIGINS`: lista de orígenes permitidos para CORS (usa `CORS_ORIGIN` solo como respaldo temporal).
- `SUPABASE_URL`: la URL base de tu instancia de Supabase (Project Settings → API → `Project URL`).
- `SUPABASE_SERVICE_ROLE_KEY`: el Service Role Key de Supabase (Project Settings → API → `service_role`).
- `SUPABASE_JWT_AUDIENCE` (opcional): audiencia esperada en los tokens emitidos por Supabase. Úsala si configuraste audiencias personalizadas.

Ejecuta `npm run env:check` para revisar rápidamente si faltan valores y qué dependencias opcionales se activarán en ese modo.

# Core API Service

This directory contains the backend Core API service for the SalomonAI platform. It is a Node.js application built with NestJS and intended to be deployed in containerized environments.

## Deployment

When deploying this service to Firebase App Hosting or Cloud Run, ensure the server listens on the port defined by the `PORT` environment variable provided by the hosting platform. Both services inject `PORT=8080` into the runtime, so the application must not hard-code an alternative port.

Example command to start the compiled application locally in a way that matches these platforms:

```bash
PORT=8080 node dist/main.js
```

Configure your process manager or container entrypoint to use this pattern so the service respects the dynamic port assignment when running in production.

## Environment strictness modes

The API can operate in two strictness modes controlled by the `STRICT_ENV` environment flag:

- **strict** (`STRICT_ENV=true`): requires a configured Postgres database. `UserModule` and `AuthModule` rely on TypeORM repositories and refresh tokens are stored in the `auth_tokens` table.
- **minimal** (`STRICT_ENV=false`): skips the database requirement and registers in-memory implementations for user management and refresh token persistence. Firebase authentication continues to function and `/auth/firebase-login` will return a JWT + refresh token pair backed by the in-memory stores.

This makes it possible to run lightweight environments (for demos or tests) without provisioning Postgres. Switching back to strict mode automatically restores the TypeORM-backed services.

### Despliegues en App Hosting sin servicios externos

Cuando subas la aplicación a Firebase App Hosting o entornos similares sin Postgres, Kafka ni motores anexos, deja vacías las variables opcionales (`POSTGRES_*`, `KAFKA_BROKER`, `QDRANT_URL`, `RECOMMENDATION_ENGINE_URL`, `FORECASTING_ENGINE_URL`, etc.).

Si se cargan valores ficticios (por ejemplo, los que venían en `.env.example`), `AppModule` asume que los servicios existen y los inicializa en `onModuleInit`, lo que provoca que el contenedor espere conexiones que nunca llegan.

Los archivos `.env.example` ya se distribuyen con esos campos en blanco para evitarlo; rellénalos solo cuando cuentes con la infraestructura real o estés levantando el stack completo de Docker Compose.

### Variables mínimas necesarias

Para iniciar en modo mínimo (`STRICT_ENV=false`) debes definir:

- `JWT_SECRET`: la firma de los tokens emitidos por la API.
- `ALLOWED_ORIGINS`: lista de orígenes permitidos para CORS (usa `CORS_ORIGIN` solo como respaldo temporal).
- Secretos `FIREBASE_*`: ya sea el JSON completo en `FIREBASE_SERVICE_ACCOUNT_KEY` o cada campo individual (`FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_CLIENT_ID`, `FIREBASE_CLIENT_CERT_URL`, `FIREBASE_DATABASE_URL`).

Ejecuta `npm run env:check` para revisar rápidamente si faltan valores y qué dependencias opcionales se activarán en ese modo.

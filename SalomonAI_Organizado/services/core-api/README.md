# Core API Service

This directory contains the backend Core API service for the SalomonAI platform. It is a Node.js application built with NestJS and intended to be deployed in containerized environments.

## Deployment

When deploying this service to Firebase App Hosting or Cloud Run, ensure the server listens on the port defined by the `PORT` environment variable provided by the hosting platform. Both Firebase App Hosting and Cloud Run default this variable to `8080`, so the application must not hard-code an alternative port.

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

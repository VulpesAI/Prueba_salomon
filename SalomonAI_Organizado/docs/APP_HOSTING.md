# App Hosting on Cloud Run

This guide documents the key configuration points for deploying the Salomon AI services to Google Cloud Run (or Firebase App Hosting, which uses the same container interface).

## Service Port

Cloud Run expects the container to listen on the port provided by the `PORT` environment variable. The application should default to `PORT=8080` when no value is supplied, and **must not hardcode another port**. Ensure your process binds to `0.0.0.0:${PORT}` so that the Cloud Run load balancer can reach it.

## Environment Variables

| Scope | Variables | Notes |
| --- | --- | --- |
| Minimal | `PORT`, `ENVIRONMENT`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Required to boot the API, listen on the correct port, and validate Firebase ID tokens. |
| Full | _Minimal set_ plus: `DATABASE_URL`, `REDIS_URL`, `GOOGLE_APPLICATION_CREDENTIALS`, `SENTRY_DSN`, `ALLOWED_ORIGINS`, `SERVICE_BASE_URL` | Include these when enabling persistence layers, telemetry, or stricter CORS. Adjust the list to match the service’s feature set. |

Store secrets with Google Secret Manager and mount them as environment variables. Keep the private key formatted with escaped newlines (`\n`) so that it parses correctly in the container.

### TLS Termination

Cloud Run and Firebase App Hosting terminate TLS at the load balancer and forward traffic to the container over plain HTTP. Por ello, la API **no debe** intentar habilitar TLS desde el contenedor. El helper `loadTlsOptionsFromEnv` ahora detecta automáticamente las variables de plataforma (`K_SERVICE`, `GOOGLE_CLOUD_PROJECT`, etc.) y deja sin efecto `ENABLE_TLS`, registrando una advertencia para recordar que la terminación ocurre aguas arriba. Mantén `ENABLE_TLS=false` en estos despliegues y confía en la capa de Cloud Run para HTTPS.

## Firebase Authentication

1. Open the Firebase Console → **Authentication** → **Settings**.
2. Add your Cloud Run domain (for example, `https://<SERVICE_DOMAIN>`), any custom domain, and localhost development URLs under **Authorized domains**.
3. If you use Firebase App Hosting, include the generated hosting domain as well.
4. Redeploy after adjusting the authorized list so that new tokens are recognized by the backend.

## CORS Guidance

* Set `ALLOWED_ORIGINS` to match the web clients you serve (production, staging, and localhost).
* For Cloud Run, configure the service to send `Access-Control-Allow-Origin` and `Access-Control-Allow-Credentials` headers when responding to preflight and actual requests.
* Avoid wildcard origins when cookies or Authorization headers are required; specify exact domains instead.

## Example Requests

```bash
# Health check (no auth required)
curl \
  --request GET \
  --silent \
  https://<SERVICE_DOMAIN>/health

# Firebase login exchange (requires Firebase ID token)
curl \
  --request POST \
  --header "Content-Type: application/json" \
  --data '{
    "token": "<FIREBASE_ID_TOKEN>",
    "provider": "firebase"
  }' \
  https://<SERVICE_DOMAIN>/auth/firebase-login
```

* Replace `<SERVICE_DOMAIN>` with the Cloud Run service URL (for example `my-service-abc123.a.run.app`) or your custom domain.
* Supply a valid Firebase ID token (JWT) issued for the authorized domain in place of `<FIREBASE_ID_TOKEN>`. The backend will exchange it for the application session JWT if configured.

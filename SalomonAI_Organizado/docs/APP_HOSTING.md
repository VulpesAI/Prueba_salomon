# App Hosting on Cloud Run

This guide documents the key configuration points for deploying the Salomon AI services to Google Cloud Run (or Firebase App Hosting, which uses the same container interface).

## Service Port

Cloud Run expects the container to listen on the port provided by the `PORT` environment variable. The application should default to `PORT=8080` when no value is supplied, and **must not hardcode another port**. Ensure your process binds to `0.0.0.0:${PORT}` so that the Cloud Run load balancer can reach it.

## Environment Variables

| Scope | Variables | Notes |
| --- | --- | --- |
| Minimal | `PORT`, `CORE_API_PROFILE=minimal`, `SECRET_PASSPHRASE` _(opcional si cargas los secretos cifrados)_, `JWT_SECRET`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Usa este conjunto cuando no se requieren servicios externos. Mantén el perfil en `minimal` para evitar dependencias innecesarias. Si defines `SECRET_PASSPHRASE`, los valores de Firebase y JWT se obtendrán automáticamente desde `secrets.enc.json`. |
| Full | _Minimal set_ plus: `DATABASE_URL`, `REDIS_URL`, `GOOGLE_APPLICATION_CREDENTIALS`, `SENTRY_DSN`, `ALLOWED_ORIGINS`, `SERVICE_BASE_URL` | Incluye estas claves cuando habilites persistencia, telemetría o CORS estrictos. Ajusta la lista según la funcionalidad del servicio. |

Store secrets with Google Secret Manager or Firebase App Hosting secrets and mount them as environment variables. Keep the private key formatted with escaped newlines (`\n`) so that it parses correctly in the container.

### Cargar `secrets.enc.json` y la passphrase

1. Genera `services/core-api/secrets/secrets.enc.json` a partir de `secrets.local.json` ejecutando `SECRET_PASSPHRASE="<frase-segura>" npm exec ts-node scripts/seal-secrets.ts`. El archivo cifrado puede versionarse porque no expone los valores en texto plano.
2. Sube `secrets.enc.json` junto con el código al repositorio o empaqueta el archivo en la imagen de despliegue. La aplicación lo buscará en `services/core-api/secrets/` durante el arranque.
3. En el entorno de despliegue (Cloud Run o Firebase App Hosting) crea una variable de entorno **secreta** llamada `SECRET_PASSPHRASE` con la misma frase utilizada para sellar el archivo. Puedes almacenarla en Google Secret Manager o en la sección **Manage environment variables** de Firebase.
4. (Opcional) Si necesitas sobreescribir algún valor puntual, define las variables `JWT_SECRET`, `FIREBASE_*` o `SUPABASE_*` directamente en el runtime. Las claves cargadas desde `secrets.enc.json` solo se aplican cuando el valor no existe ya en `process.env`.

Los archivos versionados en `services/core-api/apphosting.yaml` incluyen marcadores como `<injected-via-secrets:JWT_SECRET>` para recordar que los valores deben inyectarse desde secretos de entorno. Durante el arranque, `injectSecretsIntoEnv` reemplaza automáticamente esos marcadores (y cualquier `REEMPLAZAR` heredado de las plantillas) cuando logra descifrar `secrets.enc.json`, por lo que no necesitas editar el manifiesto con valores reales.
Los archivos versionados en `services/core-api/apphosting.yaml` incluyen marcadores como `<injected-via-secrets:JWT_SECRET>` para recordar que los valores deben inyectarse desde secretos de entorno. Mantén los valores reales fuera del repositorio.

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

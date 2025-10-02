# Core API – Firebase App Hosting Guide

This document summarizes the required configuration to run the Core API service on Firebase App Hosting (or Cloud Run, which uses the same container contract).

## Required runtime variables

| Variable | Purpose | Where to set it |
| --- | --- | --- |
| `PORT` | Port injected by the hosting platform. The service binds to `0.0.0.0:${PORT}` (defaults to `8080`). | Provided by Firebase App Hosting / Cloud Run. No manual action required. |
| `ENVIRONMENT` | Label for the current environment (`production`, `staging`, etc.). | Runtime configuration (Firebase console → App Hosting → Service → **Variables & secrets**). |
| `JWT_SECRET` | Signing key for the application-issued JSON Web Tokens (JWTs). Required for `/auth/firebase-login`. | Runtime variables (`Firebase App Hosting`), local `.env`, container orchestrators (Docker, Kubernetes, etc.). |
| `ALLOWED_ORIGINS` | Comma-separated list of origins allowed by CORS. Keep it in sync with the frontend URLs. | Runtime variables (Firebase), local `.env`, container orchestrators. |
| `FIREBASE_PROJECT_ID` | Firebase project identifier from the service account JSON (`project_id`). | Runtime variables (Firebase), local `.env`, secret stores (Secret Manager, Docker secrets). |
| `FIREBASE_CLIENT_EMAIL` | Client email from the service account JSON (`client_email`). | Runtime variables (Firebase), local `.env`, secret stores (Secret Manager, Docker secrets). |
| `FIREBASE_PRIVATE_KEY` | Private key from the service account JSON (`private_key`). | Runtime variables (Firebase), local `.env`, secret stores (Secret Manager, Docker secrets). |

### What is `JWT_SECRET`?

`JWT_SECRET` is the symmetric key the Core API uses to sign and verify the application tokens it issues after a successful Firebase login. Every environment must define its own high-entropy secret. Never reuse secrets across environments or commit them to source control.

### Generating `JWT_SECRET`

Produce a 256-bit (or longer) secret and copy the resulting string into the appropriate variable store.

#### macOS / Linux (OpenSSL)

```bash
# Hex-encoded 256-bit secret
openssl rand -hex 32

# Base64-encoded 256-bit secret (also valid)
openssl rand -base64 32
```

#### Node.js (via Node REPL or script)

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Store the generated value without surrounding quotes.

> **Important:** When copying the Firebase service account private key into an environment variable (including Firebase App Hosting runtime variables), keep the escaped `\n` sequences exactly as they appear in the JSON file. The Core API converts these escaped newlines back into real newlines at runtime.

### Where to define `JWT_SECRET`

| Environment | Location |
| --- | --- |
| Firebase App Hosting / Cloud Run | Firebase Console → App Hosting → Service → **Variables & secrets** → **Add variable** (`JWT_SECRET`). |
| Local development | Add `JWT_SECRET=<generated-value>` to `services/core-api/.env` (or `.env.local` if you prefer) and reload the dev server. |
| Docker Compose | Set `JWT_SECRET` in `.env`, `docker-compose.yml`, or mount it as a secret file referenced by the service. |
| Kubernetes / Other orchestrators | Inject it through environment variables or secrets (ConfigMap/Secret) consumed by the deployment. |

### Setting Firebase credentials in Firebase App Hosting

1. Generate or download a Firebase service account key with the **Service Account Token Creator** role.
2. Open the Firebase Console → **App Hosting** → select the Core API service → **Variables & secrets**.
3. Click **Add variable** and set:
   * `FIREBASE_PROJECT_ID` → value of `project_id` from the JSON file.
   * `FIREBASE_CLIENT_EMAIL` → value of `client_email` from the JSON file.
   * `FIREBASE_PRIVATE_KEY` → value of `private_key` from the JSON file (ensure escaped `\n` are preserved).
4. (If not already set) add `JWT_SECRET` following the generation guidance above.
5. Click **Save** to redeploy the service with the new runtime variables.

## CORS configuration examples

Set `ALLOWED_ORIGINS` to the list of allowed origins separated by commas.

```env
# Production example
ALLOWED_ORIGINS=https://app.salomon.ai,https://console.salomon.ai

# Staging + local development
ALLOWED_ORIGINS=https://staging.salomon.ai,http://localhost:3000
```

When Firebase App Hosting forwards requests through its CDN, ensure the application sends:

```
Access-Control-Allow-Origin: <matching origin>
Access-Control-Allow-Credentials: true
```

The Core API reads `ALLOWED_ORIGINS` and responds with the correct headers automatically when configured with the right values.

## Sample requests

Use these commands to validate the deployment once the service is live (replace placeholders as noted):

```bash
# Health check (no authentication required)
curl \
  --request GET \
  --silent \
  https://<SERVICE_DOMAIN>/health

# Exchange a Firebase ID token for an application JWT
curl \
  --request POST \
  --header "Content-Type: application/json" \
  --data '{
    "token": "<FIREBASE_ID_TOKEN>",
    "provider": "firebase"
  }' \
  https://<SERVICE_DOMAIN>/auth/firebase-login
```

* Replace `<SERVICE_DOMAIN>` with the Firebase App Hosting domain (for example `https://<project-region>.web.app`) or a mapped custom domain.
* Swap `<FIREBASE_ID_TOKEN>` with a valid token issued for the authorized domain.

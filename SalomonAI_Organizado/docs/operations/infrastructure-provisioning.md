# Provisionamiento de infraestructura

Este documento resume los pasos y artefactos necesarios para desplegar los componentes administrados de la plataforma (Supabase, Qdrant, Kafka) y la gestión de secretos vinculados a voz/notificaciones. Úsalo como checklist durante el bootstrap de nuevos ambientes.

## 1. Despliegue de Supabase

1. **Variables sensibles**. Añade los valores `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_ANON_KEY` en el `.env` raíz; el ejemplo del repositorio indica los campos esperados.【F:.env.example†L15-L37】 Cuando el frontend requiera autenticación directa, expone también `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en `.env.local`. 
2. **Migraciones**. Ejecuta `supabase db push` o aplica el SQL directamente usando `psql` apuntando a `supabase/migrations/20240527120000_financial_schema.sql`. El archivo contiene el esquema financiero completo requerido por `core-api` y los motores de entrenamiento.【F:supabase/migrations/20240527120000_financial_schema.sql†L1-L299】
3. **Seeds mínimas**. Importa los datasets de prueba usando `database/seeds/core_api_seed.sql` y `database/seeds/training_seed.sql`. Ambos scripts utilizan `ON CONFLICT` para permitir ejecuciones repetibles.【F:database/seeds/core_api_seed.sql†L1-L172】【F:database/seeds/training_seed.sql†L1-L137】 Ejecuta las sentencias con `psql "$FORECASTING_DATABASE_URL" -f <archivo>` o reutiliza `setup-database.sh` para automatizar la secuencia completa.【F:setup-database.sh†L34-L102】
4. **Automatización**. En CI define `SUPABASE_ACCESS_TOKEN`/`SUPABASE_DB_PASSWORD` antes de invocar `supabase db push` o los scripts SQL para evitar prompts interactivos.【F:setup-database.sh†L55-L83】

## 2. Qdrant (persistencia y backups)

- **Persistencia local**. El servicio `qdrant` de `docker-compose.yml` monta el volumen `qdrant_data` en `/qdrant/storage`, asegurando que los vectores sobrevivan a reinicios del contenedor.【F:docker-compose.yml†L1-L33】【F:docker-compose.yml†L236-L239】 Mantén este volumen en cualquier orquestador (Docker, Kubernetes) para evitar pérdida de embeddings.
- **Variables de conexión**. El backend lee `QDRANT_URL` y `QDRANT_COLLECTION` desde el `.env`, mientras que secretos adicionales (API key) se resuelven a través del archivo cifrado (`secrets.enc.json`).【F:.env.example†L42-L61】【F:services/core-api/src/config/secrets.loader.ts†L80-L82】 Si operas Qdrant gestionado, almacena la API key como `SECRETS.qdrant.apiKey` y expórtala en el runtime.
- **Backups recomendados**. Programa tareas recurrentes que dupliquen el contenido del volumen `qdrant_data` (por ejemplo, `docker run --rm -v qdrant_data:/qdrant/storage -v $(pwd)/backups:/backup busybox tar czf /backup/qdrant-$(date +%F).tgz -C /qdrant/storage .`). Registra los artefactos en un bucket/versionado y prueba restauraciones importando el archivo en un ambiente aislado antes de promoverlo.

## 3. Kafka/Zookeeper (`statements.in` y `statements.out`)

1. **Script oficial**. Ejecuta `scripts/kafka/create-statements-topics.sh` para crear los tópicos requeridos por el `parsing-engine`. El script acepta variables como `KAFKA_BROKERS`, `KAFKA_TOPIC_PARTITIONS` o `KAFKA_STATEMENTS_IN_TOPIC` para personalizar nombres y configuración.【F:scripts/kafka/create-statements-topics.sh†L1-L61】
2. **Uso sin autenticación (local)**. Con el stack de Docker Compose basta con instalar `kafka-topics` en el host o utilizar la imagen oficial: `KAFKA_TOPICS_CLI="docker compose exec -T kafka kafka-topics" ./scripts/kafka/create-statements-topics.sh`. El script valida la ausencia de credenciales SASL cuando se ejecuta dentro del contenedor para evitar sorpresas.【F:scripts/kafka/create-statements-topics.sh†L16-L44】
3. **Uso con SASL/SSL**. Para clusters administrados (Confluent Cloud, MSK, etc.) establece `KAFKA_SASL_USERNAME`, `KAFKA_SASL_PASSWORD`, `KAFKA_SASL_MECHANISM` y `KAFKA_SECURITY_PROTOCOL`. El script generará un archivo temporal `command.properties` y delegará la autenticación al CLI nativo de Kafka.【F:scripts/kafka/create-statements-topics.sh†L18-L41】

## 4. Secretos de voz y notificaciones

| Integración | Variables principales | Ubicación | Notas |
|-------------|----------------------|-----------|-------|
| **Firebase Admin (notificaciones/Auth)** | `ENABLE_FIREBASE`, `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL` | `.env` backend | Los valores se derivan del service account exportado desde la consola de Firebase.【F:.env.example†L21-L40】【F:FIREBASE_SETUP.md†L66-L115】
| **Firebase Web SDK (frontend)** | `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` | `.env.local` | Copia los valores públicos del panel "Your apps"; necesarios para notificaciones push vía FCM en el navegador.【F:.env.example†L71-L83】【F:FIREBASE_SETUP.md†L88-L115】
| **Voice Gateway (OpenAI)** | `VOICE_STT_PROVIDER`, `VOICE_TTS_PROVIDER`, `VOICE_OPENAI_API_KEY`, `VOICE_OPENAI_STT_MODEL`, `VOICE_OPENAI_TTS_MODEL`, `VOICE_OPENAI_TTS_VOICE`, `VOICE_OPENAI_TTS_FORMAT` | `.env` backend | Requerido cuando se cambia a proveedores reales (`openai`). Mantén la API key fuera del control de versiones y actualiza las listas de orígenes permitidos según el despliegue.【F:.env.example†L84-L97】【F:services/voice-gateway/app/settings.py†L16-L24】【F:docs/voice-gateway-setup.md†L17-L76】
| **Azure Speech / futuros TTS/STT** | `VOICE_AZURE_KEY`, `VOICE_AZURE_REGION` (propuestos) | `.env` backend | Reserva el espacio en el gestor de secretos aunque no exista implementación; documenta los permisos necesarios (Speech service y uso de endpoints Neural). Actualiza el Voice Gateway al habilitar el proveedor.
| **Canales de notificaciones adicionales** | `NOTIFICATIONS_SENDGRID_API_KEY`, `NOTIFICATIONS_TWILIO_ACCOUNT_SID`, `NOTIFICATIONS_TWILIO_AUTH_TOKEN` (ejemplo) | Gestor de secretos | Define los placeholders en `secrets.enc.json` cuando se integre correo/SMS. Documenta los permisos mínimos por proveedor y crea un runbook de rotación.

Mantén este inventario sincronizado con `secrets.enc.json` y las variables de CI/CD para evitar divergencias entre ambientes.

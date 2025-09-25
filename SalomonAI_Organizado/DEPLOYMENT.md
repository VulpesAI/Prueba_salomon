# Guía de despliegue de SalomónAI

Este documento consolida los procedimientos para desplegar la plataforma en
entornos de desarrollo, demo y producción. Incluye la configuración de
observabilidad y las consideraciones de seguridad necesarias para operar el
sistema.

## 1. Arquitectura general

SalomónAI se distribuye en microservicios Node.js y Python orquestados mediante
Docker Compose. La infraestructura de referencia incluye:

- **Core API (NestJS)**: orquestador principal y puerta de entrada del backend.
- **Microservicios Python**: `financial-connector`, `recommendation-engine` y
  otros consumidores/procesadores.
- **Servicios de soporte**: PostgreSQL, Kafka, Qdrant, Prometheus, Grafana y
  exporters complementarios.
- **Frontend**: aplicación Next.js/React que consume el backend.

## 2. Requisitos previos

- Docker y Docker Compose v2.
- Node.js 18+ y npm para ejecutar scripts locales.
- Python 3.11+ para utilidades auxiliares.
- Acceso al gestor de secretos corporativo (AWS Secrets Manager, GCP Secret
  Manager, Vault, Doppler, etc.).
- Credenciales para proveedores externos (Belvo, Firebase, OpenAI, etc.).

## 3. Configuración de variables y secretos

1. Copia el archivo `.env.example` y complétalo con valores reales. No
   versionar `.env`.

   ```bash
   cp .env.example .env
   ```

2. Crea los archivos de referencia en `secrets/` (`database.env`, `jwt.env`,
   `api-keys.env`) a partir de los ejemplos y sincronízalos con el gestor de
   secretos oficial.
3. Ajusta los orígenes permitidos de CORS:
   - `CORS_ORIGIN` para la Core API.
   - `FINANCIAL_CONNECTOR_ALLOWED_ORIGINS` y
     `RECOMMENDATION_ENGINE_ALLOWED_ORIGINS` para los microservicios Python.
   Define solo dominios explícitos (por ejemplo `https://app.salomon.ai`) y
   evita comodines.
4. Mantén `METRICS_ENABLED=true` salvo en entornos donde no se permitan métricas
   técnicas.

## 4. Entorno de desarrollo local

1. Instala dependencias del backend y frontend si vas a trabajar fuera de
   contenedores.
   ```bash
   npm --prefix services/core-api install
   npm --prefix frontend install
   ```
2. Levanta la infraestructura completa:
   ```bash
   docker compose up -d
   ```
3. Accede a los servicios:
   - Core API: http://localhost:3000 (Swagger en `/api/docs`, health en
     `/api/v1/health`).
   - Métricas de la Core API: http://localhost:3000/metrics.
   - Financial Connector: http://localhost:8000 (métricas en `/metrics`).
   - Recommendation Engine: http://localhost:8001 (métricas en `/metrics`).
   - Prometheus: http://localhost:9090.
   - Grafana: http://localhost:3002 (si está habilitado en el Compose).
4. Ejecuta los test rápidos cuando edites servicios críticos:
   ```bash
   ./test-backend-quick.sh
   ```

## 5. Entorno de demo controlado

El escenario de demo reproduce la arquitectura productiva con datos sintéticos y
sin credenciales sensibles. Para montarlo:

1. Prepara un archivo `.env.demo` con claves de prueba (tokens y API keys
   dummy). Los valores se pueden generar con scripts locales (`openssl rand`).
2. Lanza la infraestructura en modo demo:
   ```bash
   docker compose --env-file .env.demo -f docker-compose.prod.yml up -d
   ```
3. Precarga datos de demostración en PostgreSQL con `setup-database.sh` o
   `setup-database.sql` según corresponda.
4. Configura dashboards de Grafana importando los paneles predefinidos
   (prometheus/ dashboards) y apunta a los jobs `core-api`,
   `financial-connector` y `recommendation-engine`.
5. Comparte únicamente las URLs expuestas vía túneles seguros o VPN; nunca
   expongas los puertos directamente a Internet sin TLS.

## 6. Despliegue a producción

1. El pipeline de CI debe ejecutar el workflow `security-scans` (detect-secrets y
   TruffleHog) antes de desplegar. Revisa la pestaña *Security scans* en GitHub
   Actions y resuelve cualquier hallazgo.
2. Automatiza la extracción de secretos desde el gestor oficial en tiempo de
   despliegue. Ejemplo con Docker Compose:
   ```yaml
   services:
     core-api:
       env_file:
         - /run/secrets/salomonai/core-api.env
   ```
3. Configura TLS y WAF/Reverse proxy (Nginx) delante de la Core API y del
   frontend. Asegúrate de reenviar únicamente los orígenes permitidos por CORS.
4. Ejecuta migraciones de base de datos antes de publicar una nueva versión.
5. Habilita alertas en Prometheus/Grafana para los nuevos métricas:
   - `core_api_requests_total`, `core_model_inference_total`.
   - `financial_connector_requests_total`, `financial_connector_file_import_total`.
   - `recommendation_engine_inference_total` y `recommendation_engine_last_confidence`.
6. Documenta la versión desplegada y las variables relevantes en el runbook de la
   compañía.

## 7. Operación y observabilidad

- Prometheus ya incorpora los jobs para Core API, Financial Connector y
  Recommendation Engine. Asegúrate de que la red permita a Prometheus alcanzar
  `core-api:3000/metrics`, `financial-connector:8000/metrics` y
  `recommendation-engine:8000/metrics`.
- Grafana puede importar paneles basados en dichas métricas para seguir el ciclo
  de vida de las solicitudes, colas Kafka y modelos de ML.
- Añade alertas mínimas: disponibilidad de API (<99%), errores 5xx repetidos y
  latencia de inferencias por encima de los umbrales definidos.

## 8. Checklist post-despliegue

- [ ] Variables de entorno sin comodines en CORS.
- [ ] Pipelines de seguridad verdes (`security-scans`).
- [ ] Métricas visibles en Prometheus/Grafana.
- [ ] Dashboards de demo actualizados antes de presentaciones a clientes.
- [ ] Documentación operativa sincronizada con el equipo de soporte.

Con estos pasos la plataforma queda lista para operar de forma controlada y
monitorizada en los distintos entornos previstos.

# Estructura del proyecto `SalomonAI_Organizado`

Este documento resume cómo está organizado el repositorio y enlaza los componentes principales descritos en la documentación existente.

## Raíz del repositorio

En la raíz conviven los artefactos de orquestación, documentación y automatización:

- `docker-compose.yml` y `docker-compose.prod.yml` definen el stack local y la versión orientada a producción.
- Scripts de apoyo (`setup-environment.sh`, `setup-database.sh`, `test-backend.sh`, etc.) permiten inicializar y probar los servicios.
- La carpeta `frontend/` contiene la aplicación Next.js, mientras que `services/` agrupa los motores backend y conectores especializados.
- Directorios como `docs/`, `nginx/`, `prometheus/` y `secrets/` proporcionan soporte para documentación, reverse proxy, observabilidad y almacenamiento de secretos.

## Documentación (`docs/`)

La carpeta `docs/` centraliza guías operativas y de dominio:

- Manuales de configuración de terceros (`BELVO_SETUP.md`, `FIREBASE_SETUP.md`) y la historia del proyecto (`PROJECT_HISTORY_AND_GUIDE.md`).
- Documentación de seguridad (`SECURITY.md`) y operaciones (`operations/`).
- El dossier de arquitectura (`architecture/docker-compose-overview.md`) describe cómo Docker Compose interconecta bases de datos, microservicios y redes compartidas.
- Referencias específicas del dominio de `core-api` (`core-api-domain-overview.md`) detallan endpoints, DTOs y flujos de autenticación, integraciones con Belvo y movimientos financieros.

## Frontend (`frontend/`)

La interfaz web está construida con **Next.js 15** y **React 19**. Su estructura se divide en:

- `app/`: rutas y layouts con el nuevo router de Next.js.
- `components/`: librería de componentes reutilizables apoyada en Tailwind CSS, Radix UI y utilidades como `class-variance-authority`.
- `hooks/` y `context/`: lógica compartida basada en React Query para manejo de datos y estados globales.
- `services/`, `lib/` y `types/`: adaptadores de API, helpers y definiciones TypeScript.

## Backend y microservicios (`services/`)

La carpeta `services/` agrupa los distintos motores y conectores:

- `core-api/`: monolito NestJS modular con subcarpetas como `auth`, `financial-movements`, `belvo`, `users`, `kafka`, etc. Actúa como orquestador principal y referencia para las responsabilidades de cada módulo backend.
- Motores en FastAPI/Python:
  - `conversation-engine/`: motor conversacional que consulta `core-api` para obtener contexto financiero.
  - `forecasting-engine/`: servicio de pronósticos que opera sobre Supabase (Postgres gestionado) mediante SQLAlchemy.
  - `voice-gateway/`: pasarela de voz con proveedores STT/TTS configurables.
  - `parsing-engine/`: consumidor Kafka que procesa documentos compartidos vía volumen.
  - `recommendation-engine/`: motor de recomendaciones y pipelines batch.
- Conectores financieros (`financial-connector/`) y pipelines de entrenamiento (`training-engine/`) completan la capa de servicios especializados.

Cada microservicio define su propia configuración mediante validadores (`pydantic-settings` en Python, `zod` en Node.js) y obtiene variables desde el archivo `.env` raíz mediante Docker Compose.

## Redes y orquestación

Docker Compose conecta los servicios a través de la red `salomon-net`, define volúmenes compartidos (`qdrant_data`, `uploads_volume`, `models_volume`) y coordina dependencias entre bases de datos, microservicios y brokers (Kafka, Zookeeper). El dossier de arquitectura detalla estos vínculos y sirve como guía para extender o desplegar la plataforma.


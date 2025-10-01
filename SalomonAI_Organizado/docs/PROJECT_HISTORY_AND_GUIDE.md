# Proyecto SalomonAI - Historia, Arquitectura y Guía Operativa Definitiva

> **Propósito de este documento**: entregar una referencia exhaustiva para reiniciar el proyecto en un nuevo repositorio partiendo exclusivamente del frontend existente. El objetivo es replicar la funcionalidad lograda en la Fase 1, mejorar lo que sea necesario y evitar repetir errores. Este archivo debe consultarse antes de tomar cualquier decisión técnica u operativa.

---

## Tabla de contenidos
1. [Visión general y foco del producto](#vision-general-y-foco-del-producto)
2. [Línea de tiempo detallada (Día 1 a la fecha)](#linea-de-tiempo-detallada-dia-1-a-la-fecha)
3. [Arquitectura actual y blueprint de reconstrucción](#arquitectura-actual-y-blueprint-de-reconstruccion)
4. [Errores históricos, mitigaciones y lecciones aprendidas](#errores-historicos-mitigaciones-y-lecciones-aprendidas)
5. [Guía operativa y cultura de trabajo](#guia-operativa-y-cultura-de-trabajo)
6. [Plan paso a paso para reconstruir en un nuevo entorno](#plan-paso-a-paso-para-reconstruir-en-un-nuevo-entorno)
7. [Entorno, infraestructura y dependencias externas](#entorno-infraestructura-y-dependencias-externas)
8. [Modelado de datos y contratos API](#modelado-de-datos-y-contratos-api)
9. [Calidad, pruebas y observabilidad](#calidad-pruebas-y-observabilidad)
10. [Backlog heredado para la Fase 2](#backlog-heredado-para-la-fase-2)
11. [Roles, responsabilidades y onboarding](#roles-responsabilidades-y-onboarding)
12. [Matriz de documentación complementaria](#matriz-de-documentacion-complementaria)
13. [Glosario de términos y acrónimos](#glosario-de-terminos-y-acronimos)
14. [Anexos prácticos](#anexos-practicos)

---

## Visión general y foco del producto
- **Propuesta de valor**: SalomonAI es un asistente financiero omnicanal que integra datos bancarios reales (Belvo), analítica de gastos y experiencias conversacionales (microservicios IA) para clientes finales y asesores financieros corporativos.
- **Foco de negocio**:
  - **B2C**: usuarios finales que desean centralizar finanzas personales, recibir insights automatizados y recomendaciones.
  - **B2B2C**: instituciones financieras que buscan ofrecer copilotos inteligentes a su base de clientes.
- **Principios rectores**:
  1. Seguridad y cumplimiento antes de la escala (MFA, SIEM, control de permisos granular, cumplimiento ISO 27001 / SOC 2).
  2. Arquitectura modular, desacoplada y observable desde el día cero.
  3. Experiencia de usuario consistente y accesible, con métricas claras de adopción.
  4. Documentación viva que permita a cualquier nuevo equipo retomar el desarrollo sin fricción.
- **Resultados clave Fase 1**:
  - Core API funcional con autenticación, perfiles extendidos, integraciones Belvo y endpoints de dashboard.
  - Microservicios IA iniciales (conversación, forecasting, recommendation, voice, parsing) conectados por colas/eventos.
  - Frontend Next.js con AuthProvider sobre Firebase y pantallas de dashboard/conversación.
  - Operaciones básicas: scripts de setup, runbooks, monitoreo mínimo, políticas de seguridad.

---

## Línea de tiempo detallada (Día 1 a la fecha)
> **Nota**: las semanas se numeran desde el arranque del proyecto piloto (Fase 1). Al reconstruir en un nuevo repositorio, utilice esta cronología como referencia de dependencias y orden recomendado.

| Semana | Objetivos clave | Entregables principales | Problemas enfrentados | Resoluciones y acciones preventivas |
| --- | --- | --- | --- | --- |
| 1 | Definir alcance MVP y propuesta de valor | Documento de alcance, bocetos de dashboard y journeys | Ambigüedad en features prioritarias | Se instauran reuniones OKR semanales y backlog priorizado.
| 2 | Estructurar monorepo y scripts de setup | Árbol de carpetas estándar, `setup-environment.sh`, configuraciones de lint | Falta de convenciones unificadas | Se aplican ESLint/Prettier y guía de naming compartida.
| 3 | Autenticación Firebase en core-api | Servicios `firebase-admin.service.ts`, `firebase.strategy.ts`, endpoints `/auth/firebase/*` | Claves mal formateadas y timezone en tokens | Se documenta uso de variables multi-línea y normalización UTC.
| 4 | Ampliar modelo de usuarios | Migraciones TypeORM, DTOs extendidos, endpoints seguros | Conflictos entre migraciones | Se crea `setup-database.sh` y se documenta orden de ejecución.
| 5 | Integración Belvo (links, cuentas, transacciones) | `BelvoService`, `BelvoController`, jobs de sincronización | Timeouts y credenciales inválidas | Se añaden reintentos exponenciales y tabla de errores manejados.
| 6 | Dashboard API (resúmenes/analytics) | Controladores `/dashboard/*`, agregados SQL | Queries pesadas sin índice | Se agregan índices por fecha/categoría y se documenta tuning.
| 7 | Seguridad avanzada y cumplimiento | Guards JWT/API Keys, rotación tokens, checklist ISO/SOC | Secretos expuestos en repo inicial | Se migra a `.env`, se integra escaneo pre-commit.
| 8 | Microservicios IA (FastAPI) | Carpeta `services/`, esquemas de mensajería, colas | Versionado inconsistente de modelos | Se adopta versionado semántico y almacenamiento central de artefactos.
| 9 | Frontend Next.js estable | Contextos, hooks y vistas principales | Problemas con SSR y carga SDK | Se documenta uso de `dynamic import` y fallback de estados.
| 10 | Observabilidad y operaciones | `prometheus/`, `operations/`, runbooks de monitoreo | Falta de visibilidad ante fallos | Se habilitan métricas básicas y se definen alertas manuales.
| 11 | Consolidación de documentación | Markdown en `docs/`, scripts actualizados | Narrativa dispersa | Se crea este documento como referencia maestra.

**Eventos críticos adicionales**
- **Incidente 1 (Semana 5)**: caída del job de sincronización por límite de rate de Belvo. Resultado: se implementó backoff exponencial y alerta manual.
- **Incidente 2 (Semana 7)**: se detectaron credenciales Firebase expuestas. Resultado: rotación inmediata, adopción de vault y checklist de seguridad obligatoria.
- **Incidente 3 (Semana 8)**: diferencia entre esquemas de mensajes de microservicios; se acordó contrato JSON firmado con versión (`schema_version`).

---

## Arquitectura actual y blueprint de reconstrucción

### Vista macro (Fase 1)
- **Frontend (Next.js / React 18)**
  - Autenticación vía Firebase Web SDK.
  - Hooks especializados: `useAuth`, `useFinancialSummary`, `useBelvoLink`, `useVoiceChannel`.
  - Componentes clave: dashboard, detalle de transacciones, chat conversacional, wizard de conexión bancaria, settings.
  - Integraciones externas: widget Belvo, endpoints REST core `/dashboard`, `/belvo`, sockets de `conversation-engine`.
- **Core API (NestJS + PostgreSQL)**
  - Módulos: `auth`, `users`, `belvo`, `financial-movements`, `dashboard`, `financial-forecasts`, `notifications`.
  - Infraestructura: TypeORM, Redis, BullMQ, manejo de colas para sincronización y jobs nocturnos.
  - Seguridad: estrategia Firebase, JWT, API Keys, roles y sanitización.
- **Microservicios IA (FastAPI / Python)**
  - `conversation-engine`: sesiones de chat, streaming, gestión de prompts, logging de interacciones.
  - `forecasting-engine`: pipelines ARIMA/LSTM, scheduler y almacenamiento de modelos.
  - `recommendation-engine`: embeddings en Qdrant y reglas, API para sugerencias personalizadas.
  - `voice-engine`: síntesis/ASR con WebRTC gateway.
  - `parsing-engine`: clasificación de movimientos mediante NLP.
- **Servicios de soporte**
  - Bases: PostgreSQL (datos transaccionales), Redis (caché, colas), Qdrant (vectores), Prometheus + Alertmanager (monitoring), SIEM externo (logs de seguridad).
  - Integraciones: Belvo (datos bancarios), Firebase (autenticación), proveedor de email/SMS, almacenamiento S3 compatible.

### Flujo de datos end-to-end
1. **Autenticación**: el usuario inicia sesión en frontend → obtiene ID Token Firebase → se envía al core → `FirebaseStrategy` valida, sincroniza perfil y emite JWT interno.
2. **Conexión bancaria**: el usuario abre widget Belvo → el core crea registro de `BankConnection` → jobs asíncronos traen cuentas y transacciones → `parsing-engine` categoriza → se persisten resultados.
3. **Analítica**: el dashboard consulta endpoints agregados → el core ejecuta vistas/materialized views alimentadas por jobs nocturnos.
4. **Conversación**: el frontend establece WebSocket con `conversation-engine` → se consulta `recommendation-engine` y `financial-movements` → las respuestas se registran para auditoría.
5. **Forecasting**: jobs programados generan pronósticos y alimentan `financial_forecasts` → el frontend los expone en paneles específicos.
6. **Observabilidad**: cada servicio envía métricas a Prometheus, logs estructurados a SIEM y eventos críticos a la cola de incidentes.

### Blueprint de reconstrucción (nuevo repositorio)
1. **Preparar monorepo base**
   - Estructura recomendada: `frontend/`, `core-api/`, `services/<microservicio>/`, `infrastructure/`, `docs/`, `scripts/`.
   - Configurar lint/format (ESLint/Prettier para JS/TS, `black`/`isort` para Python).
2. **Migrar frontend existente**
   - Crear proyecto Next.js limpio.
   - Copiar componentes, contextos y hooks críticos.
   - Ajustar configuración de Firebase al nuevo proyecto (ver [Anexo A](#anexo-a-variables-de-entorno-y-configuraciones-clave)).
3. **Reconstruir core API**
   - Generar proyecto NestJS con módulos base.
   - Implementar endpoints siguiendo los contratos de la sección [Modelado de datos y contratos API](#modelado-de-datos-y-contratos-api).
   - Configurar TypeORM, migraciones y seguridad.
4. **Reinstalar microservicios IA**
   - Crear repos/folders individuales con FastAPI.
   - Implementar colas/eventos compartidos y versionado de modelos.
   - Integrar pruebas mínimas (unitarias + contract tests).
5. **Configurar infraestructura y observabilidad**
   - Docker Compose para desarrollo, Kubernetes opcional para producción.
   - Prometheus + Grafana + Alertmanager.
   - Canal de logs hacia SIEM/ELK.
6. **Reaplicar seguridad y cumplimiento**
   - Control de secretos (Vault), rotación de credenciales, MFA obligatorio.
   - Checklist de cumplimiento (ISO 27001, SOC 2) y pruebas de penetración planificadas.
7. **Documentar y automatizar**
   - Cada módulo debe tener README con instrucciones de despliegue.
   - Actualizar este documento con cambios.

---

## Errores históricos, mitigaciones y lecciones aprendidas
| Categoría | Problema | Impacto | Solución aplicada | Prevención para Fase 2 |
| --- | --- | --- | --- | --- |
| Autenticación Firebase | Claves privadas mal escapadas | Sesiones fallidas para todos los usuarios | Uso de `FIREBASE_PRIVATE_KEY` multi-línea y normalización UTC | Añadir validación automática en script de setup y prueba de login en CI.
| Autenticación Firebase | Tokens expiran inmediatamente por desfase horario | Usuarios desconectados continuamente | Ajuste `clockSkew` y sincronización NTP | Agregar verificación de reloj en healthcheck.
| Belvo | Timeouts en sincronización de transacciones voluminosas | Datos desactualizados, quejas de usuarios | Reintentos exponenciales, jobs asíncronos y alertas | Implementar circuit breakers y métricas por institución.
| Base de datos | Migraciones TypeORM en conflicto | Deploy bloqueado | Orden documentado + script de inicialización | Migraciones con timestamp y revisión en CI.
| Dashboard | Queries sin índices optimizados | Respuestas > 5s | Índices en columnas críticas | Pruebas de performance automatizadas.
| Conversación IA | Mensajes cortados por errores de parsing | Conversación inconsistente | Manejo de errores y reconexión automática | Contratos JSON con versionado y validación schema.
| Seguridad | Secretos expuestos en Git | Riesgo de fuga | Purga de secretos + `.env` + vault | Escaneo Gitleaks obligatorio en pipelines.
| Deploy | Documentación insuficiente | Onboarding lento y errores en despliegue | Runbooks y scripts de setup | Revisiones trimestrales de documentación.
| Observabilidad | Falta de alertas configuradas | Incidentes tardan en detectarse | Prometheus básico + logs SIEM | Automatizar alertas y acuerdos de severidad.

**Lecciones clave**
- Cada dependencia externa necesita pruebas automáticas y manuales documentadas.
- Sin documentación de migraciones, el equipo pierde días coordinando versiones.
- Los microservicios IA requieren contratos de mensajes formalizados; la falta de versionado provoca caídas silenciosas.
- Los secretos deben gestionarse fuera del repositorio; usar `doppler`, `vault` o equivalente desde el inicio.
- La documentación debe acompañar cada feature antes del merge para mantener coherencia.

---

## Guía operativa y cultura de trabajo
### Metodología
- Sprints semanales con backlog refinado los lunes.
- Reunión de sincronización diaria (15 min) con foco en bloqueos técnicos.
- Retrospectiva quincenal para ajustar procesos y compartir lecciones.

### Convenciones de código y revisión
- Commits siguiendo Conventional Commits (`feat:`, `fix:`, `docs:`...).
- PRs requieren al menos 1 revisor y checklist de seguridad/comportamiento.
- ESLint/Prettier (JS/TS), `black`/`isort` (Python) ejecutados en pre-commit.
- Se prohíbe merge directo a `main`; usar `develop` o feature branches.

### Documentación
- Cada módulo debe tener README específico (propósito, endpoints, comandos de prueba).
- Diagramas: usar PlantUML o Excalidraw y guardar fuentes en `docs/architecture/`.
- Runbooks en `docs/operations/` deben actualizarse tras cada incidente.

### Checklists clave
**Diaria (para cada desarrollador)**
1. `git pull --rebase origin main`.
2. `docker compose ps` para validar servicios locales.
3. `docker compose up database redis qdrant -d`.
4. Ejecutar `setup-environment.sh` si cambian variables.
5. Correr pruebas relevantes (backend rápido, unit frontend) antes de subir cambios.
6. Documentar en runbook incidentes o métricas relevantes.

**Pre-deploy**
- Variables de entorno validadas.
- Migraciones aplicadas en staging.
- Pruebas unitarias, integración y e2e en verde.
- Revisión de seguridad (dependencias, secretos, IAM).
- Dashboards y alertas revisados.
- Plan de rollback documentado y testeado.

---

## Plan paso a paso para reconstruir en un nuevo entorno
### Fase 0 – Preparativos
- Crear repositorio limpio (GitHub/GitLab) con protección en `main`.
- Habilitar herramientas de calidad: GitHub Actions, SonarQube opcional, dependabot.
- Configurar gestor de secretos (Vault, Doppler, AWS Secrets Manager).

### Fase 1 – Frontend
1. Inicializar Next.js (`npx create-next-app@latest`).
2. Instalar dependencias necesarias (`firebase`, `axios`, `swr`, `zustand` o equivalentes). 
3. Migrar componentes y contextos existentes.
4. Configurar `.env.local` con claves Firebase del nuevo proyecto.
5. Crear historias de usuario para validar: login, dashboard básico, chat placeholder.

### Fase 2 – Core API
1. Crear proyecto NestJS (`nest new core-api`).
2. Instalar dependencias (`@nestjs/typeorm`, `pg`, `@nestjs/passport`, `passport-firebase-jwt`, `bull`, `ioredis`).
3. Implementar módulos `auth`, `users`, `belvo`, `financial-movements`, `dashboard` y `notifications` siguiendo contratos.
4. Configurar TypeORM con migraciones basadas en timestamp.
5. Crear seeders iniciales para roles y categorías financieras.
6. Implementar pruebas unitarias (Jest) y de integración básicas.

### Fase 3 – Servicios externos
1. Levantar PostgreSQL, Redis, Qdrant mediante Docker Compose.
2. Configurar proyectos externos: Firebase, Belvo Sandbox, proveedor de email.
3. Implementar script de verificación (`scripts/check-integrations.ts`) que valide conectividad y credenciales.

### Fase 4 – Microservicios IA
1. Crear base `services/` con `conversation-engine`, `forecasting-engine`, `recommendation-engine`, `voice-engine`, `parsing-engine`.
2. Cada servicio debe incluir:
   - FastAPI con documentación OpenAPI.
   - Configuración de colas (Redis/AMQP) y contratos versionados.
   - Pruebas unitarias (Pytest) y contract tests compartidos.
3. Establecer pipeline de entrenamiento y despliegue para modelos (almacenamiento de artefactos en S3 o bucket).

### Fase 5 – Observabilidad y DevOps
1. Configurar Prometheus, Grafana y Alertmanager (docker compose).
2. Integrar logging estructurado (JSON) y enviar a SIEM/ELK.
3. Definir healthchecks para todos los servicios.
4. Crear dashboards de monitoreo (latencia API, errores, colas, uso de recursos).

### Fase 6 – Seguridad y cumplimiento
1. Implementar MFA para accesos administrativos.
2. Configurar rotación de claves y tokens (scripts automáticos).
3. Documentar políticas de retención de datos y privacidad.
4. Planificar auditorías internas y pruebas de penetración.

### Fase 7 – Entrega y retroalimentación
1. Ejecutar pruebas E2E con datos de sandbox.
2. Validar experiencia en distintos perfiles (admin, advisor, customer).
3. Recopilar métricas iniciales y ajustar roadmap.

Cada fase debe cerrarse con checklist firmado y documentación actualizada.

---

## Entorno, infraestructura y dependencias externas
### Variables de entorno críticas (resumen)
| Servicio | Variable | Descripción |
| --- | --- | --- |
| Core API | `DATABASE_URL` | Cadena de conexión PostgreSQL.
| Core API | `REDIS_URL` | Conexión a Redis (caché y colas).
| Core API | `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL` | Credenciales Firebase Admin.
| Core API | `BELVO_SECRET_ID`, `BELVO_SECRET_PASSWORD`, `BELVO_ENV` | Credenciales Belvo.
| Core API | `JWT_SECRET`, `API_KEY_SALT` | Seguridad interna.
| Frontend | `NEXT_PUBLIC_FIREBASE_*` | Configuración Firebase Web.
| Microservicios | `MODEL_STORAGE_BUCKET`, `QDRANT_URL`, `QUEUE_URL` | Acceso a modelos y colas.
| Observabilidad | `PROMETHEUS_ENDPOINT`, `ALERT_WEBHOOK` | Integración con monitoreo.

Ver [Anexo A](#anexo-a-variables-de-entorno-y-configuraciones-clave) para detalle completo, formatos y ejemplos.

### Dependencias de infraestructura
- **Docker Compose** para entorno local (servicios base y aplicaciones).
- **Kubernetes** recomendado para producción (namespace por ambiente, secrets gestionados por operador).
- **CI/CD**: GitHub Actions (templates en `docs/operations/ci-cd.md`).
- **Storage**: bucket S3-compatible para artefactos de modelos y respaldos.
- **Monitorización**: Prometheus + Grafana + Alertmanager + SIEM.

### Integraciones externas
- **Firebase** (Auth, Firestore opcional para eventos de auditoría).
- **Belvo** (Sandbox/Production) para instituciones financieras.
- **Proveedor de notificaciones** (Sendgrid, Twilio) para MFA y alertas.
- **Servicio de análisis de fraude** (planificado Fase 2, no implementado aún).

---

## Modelado de datos y contratos API
### Tablas principales (PostgreSQL)
- `users`: datos de usuario, roles, preferencias.
- `user_profiles`: información financiera, límites personalizados.
- `bank_connections`: enlaces a instituciones vía Belvo.
- `accounts`: cuentas bancarias sincronizadas.
- `financial_movements`: transacciones categorizadas.
- `movement_metadata`: enriquecimiento adicional (embeddings, etiquetas ML).
- `financial_forecasts`: resultados de forecasting por periodo.
- `notifications`: alertas enviadas al usuario.

### Contratos clave (REST)
| Endpoint | Método | Descripción | Autenticación |
| --- | --- | --- | --- |
| `/auth/firebase-login` | POST | Intercambia token Firebase por JWT interno | `idToken` en body (`{ "idToken": "<token>" }`) o header `Authorization: Bearer`.
| `/users/me` | GET | Recupera perfil combinado | JWT.
| `/belvo/institutions` | GET | Lista instituciones disponibles | JWT + rol válido.
| `/belvo/link` | POST | Crea link de institución | JWT.
| `/dashboard/summary` | GET | KPIs agregados (ingresos, gastos, cashflow) | JWT.
| `/dashboard/movements` | GET | Listado paginado con filtros | JWT.
| `/forecasts/:accountId` | GET | Pronósticos por cuenta | JWT.
| `/notifications` | GET | Últimas notificaciones | JWT.

### Contratos microservicios (mensajería)
- `conversation-engine`
  - Canal WebSocket: `{ session_id, message, context_version }` → `{ reply, suggestions, metadata }`.
  - Eventos a `recommendation-engine`: `{ user_id, movement_ids, profile_snapshot }`.
- `parsing-engine`
  - Job Queue: `{ movement_id, raw_description, amount, metadata }` → actualización en `financial_movements`.
- `forecasting-engine`
  - Scheduler: `{ account_id, historical_movements }` → `financial_forecasts`.

Todos los contratos deben documentarse en OpenAPI/AsyncAPI y versionarse.

---

## Calidad, pruebas y observabilidad
### Estrategia de testing
- **Backend (NestJS)**: pruebas unitarias con Jest, integración con base de datos en memoria (Testcontainers), contract tests para endpoints.
- **Microservicios Python**: Pytest + Hypothesis, validación de esquemas con Pydantic.
- **Frontend**: pruebas unitarias con Jest/React Testing Library, E2E con Playwright.
- **Contratos**: Postman/Newman o Schemathesis para verificar OpenAPI/AsyncAPI.
- **Datos**: pruebas de consistencia en migraciones y seeds.

### Observabilidad
- Logs estructurados (JSON) con campos `trace_id`, `span_id`, `user_id`.
- Métricas: latencia, tasa de error, throughput por endpoint, uso de colas.
- Alertas clasificadas por severidad (P0/P1/P2) y canal (Slack/Email/SIEM).
- Tracing distribuido planificado (OpenTelemetry) para Fase 2.

### Seguridad operacional
- Escaneos de dependencias (Dependabot/Snyk) semanales.
- Escaneo de secretos (Gitleaks) en cada PR.
- Auditoría trimestral de permisos IAM.
- Política de rotación de claves cada 90 días.

---

## Backlog heredado para la Fase 2
1. **Conversational AI**
   - Integrar LLM propietario/híbrido con mejores tiempos de respuesta.
   - Añadir memoria de usuario persistente y personalización avanzada.
2. **Finanzas avanzadas**
   - Motor de presupuestos colaborativos.
   - Simulaciones de escenarios (stress testing) y proyecciones a largo plazo.
3. **Seguridad y cumplimiento**
   - Integración con proveedor de fraude/AML.
   - Auditorías automáticas de acceso y alertas SIEM enriquecidas.
4. **Infraestructura**
   - Migración a Kubernetes con autoscaling.
   - Implementar Terraform para IaC y automatizar despliegues multi-ambiente.
5. **Experiencia de usuario**
   - Aplicación móvil (React Native) consumiendo los mismos contratos.
   - Mejorar accesibilidad (WCAG 2.1 AA) y localización multi-idioma.
6. **Data & Analytics**
   - Data warehouse (BigQuery/Snowflake) para reporting avanzado.
   - Feature store para modelos ML.

---

## Roles, responsabilidades y onboarding
### Roles clave
- **Tech Lead**: define arquitectura, revisa PR críticos, coordina roadmap técnico.
- **Backend Lead**: mantiene core API, bases de datos y seguridad.
- **Frontend Lead**: experiencia de usuario, performance y accesibilidad.
- **AI/ML Lead**: microservicios IA, pipelines de entrenamiento, métricas de modelos.
- **DevOps/SRE**: infraestructura, CI/CD, observabilidad y respuesta a incidentes.
- **Product Owner**: prioriza backlog, define OKR y coordina con stakeholders.

### Onboarding express (primeros 5 días)
1. Leer este documento y los anexos relevantes.
2. Configurar entorno local usando scripts (`setup-environment.sh`, `setup-database.sh`).
3. Ejecutar smoke tests (frontend `npm run dev`, backend `npm run start:dev`, microservicios `make up`).
4. Revisar runbooks de operaciones y procesos de incidentes.
5. Tomar una tarea pequeña del backlog para familiarizarse con el flujo de trabajo.

---

## Matriz de documentación complementaria
| Tema | Archivo | Contenido |
| --- | --- | --- |
| Backend Fase 1 | `docs/FASE1_BACKEND_RESUMEN.md` | Detalles de arquitectura del core y endpoints.
| Belvo | `docs/BELVO_SETUP.md` | Guía paso a paso para sandbox y producción.
| Firebase | `docs/FIREBASE_SETUP.md` | Configuración Admin + Web SDK.
| Seguridad | `docs/SECURITY.md` | Estrategia de seguridad y cumplimiento.
| Arquitectura | `docs/architecture/*` | Diagramas y descripciones de topología.
| Operaciones | `docs/operations/*` | Runbooks, CI/CD, monitoreo.
| Frontend | `docs/frontend/*` | Detalle de componentes, hooks y patrones.
| Core API Dominio | `docs/core-api-domain-overview.md` | Desglose de dominio y entidades.

Mantener este mapa actualizado al agregar nueva documentación.

---

## Glosario de términos y acrónimos
- **MFA**: Autenticación multifactor.
- **SIEM**: Security Information and Event Management.
- **OKR**: Objectives and Key Results.
- **LLM**: Large Language Model.
- **ARIMA**: AutoRegressive Integrated Moving Average (modelo estadístico).
- **JWT**: JSON Web Token.
- **BullMQ**: Librería para colas basadas en Redis.
- **Qdrant**: Base de datos de vectores utilizada para embeddings.
- **CI/CD**: Integración continua / Despliegue continuo.
- **IaC**: Infraestructura como código.

---

## Anexos prácticos
### Anexo A. Variables de entorno y configuraciones clave
- **Formato**: utilizar archivos `.env.example` por servicio. Evitar commit de valores reales.
- **Variables destacadas**:
  - `FIREBASE_PRIVATE_KEY`: reemplazar `\n` por saltos de línea reales antes de usar.
  - `BELVO_ENV`: `sandbox` en desarrollo, `production` en despliegues reales.
  - `JWT_EXPIRES_IN`: definir en minutos, recomendado `15m`.
  - `REFRESH_TOKEN_TTL_DAYS`: valor estándar `30`.
  - `PROMETHEUS_SCRAPE_INTERVAL`: mínimo `15s` para servicios críticos.
- **Procedimiento**:
  1. Copiar `.env.example` a `.env`.
  2. Ejecutar `setup-environment.sh` para validar presencia y formato.
  3. Correr `scripts/validate-secrets.ts` para asegurar que no haya variables faltantes.

### Anexo B. Healthchecks mínimos por servicio
| Servicio | Endpoint / Comando | Expectativa |
| --- | --- | --- |
| Frontend | `GET /healthz` | Respuesta 200 con versión y commit hash.
| Core API | `GET /health` | Estado de base de datos, Redis y colas.
| conversation-engine | `GET /health` | Estado de conexión al modelo y cola.
| forecasting-engine | `GET /metrics` | Exposición de métricas Prometheus.
| recommendation-engine | `GET /health` | Conectividad a Qdrant.
| voice-engine | `GET /status` | Estado de servicios de voz y ancho de banda.
| parsing-engine | `GET /health` | Capacidad de procesamiento y cola.

### Anexo C. Roadmap sugerido para adopción de Kubernetes
1. Crear manifiestos base (`Deployment`, `Service`, `Ingress`) por componente.
2. Configurar `ConfigMap` y `Secret` para variables.
3. Integrar autoscaling horizontal (HPA) para core y microservicios IA.
4. Configurar observabilidad con Prometheus Operator y Grafana dashboards.
5. Automatizar despliegues mediante GitOps (ArgoCD o Flux).

### Anexo D. Lista de chequeo para incidentes críticos
1. Detectar alerta (Prometheus/Slack/SIEM).
2. Confirmar impacto y severidad.
3. Ejecutar runbook específico del servicio afectado.
4. Comunicar a stakeholders (PO, soporte, compliance).
5. Registrar incidente en postmortem (template en `docs/operations/incidents.md`).
6. Asignar acciones correctivas y seguimiento en backlog.

### Anexo E. FAQ para el nuevo equipo
- **¿Qué parte del código es reutilizable?** Todo el frontend y la documentación; el backend y microservicios deben reconstruirse siguiendo contratos.
- **¿Dónde están los contratos oficiales?** En esta guía (sección de contratos) y en los archivos OpenAPI/AsyncAPI dentro de cada módulo.
- **¿Cómo validar que Belvo funciona?** Ejecutar `docs/BELVO_SETUP.md` → correr `test-belvo.sh` → revisar métricas de sincronización.
- **¿Qué hacer ante un problema de autenticación?** Revisar runbook de auth, validar sincronización NTP, regenerar claves si es necesario.
- **¿Quién aprueba despliegues?** Tech Lead + Product Owner tras checklist pre-deploy.

---

> **Conclusión**: La Fase 1 estableció cimientos sólidos de autenticación, integración bancaria, analítica y seguridad. Esta versión ampliada documenta historia, arquitectura, operaciones y aprendizajes para reiniciar el proyecto con plena visibilidad. Utilícela como manual definitivo al construir la nueva etapa de SalomonAI.

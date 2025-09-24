# Plan Integral de Mejoras

## 1. Estado actual
- **Autenticación y usuarios**: Backend NestJS integra Firebase Admin, estrategia Passport y sincronización de usuarios con perfiles extendidos (roles, preferencias, metadatos financieros).
- **Integración Belvo**: Servicios y endpoints CRUD operativos para instituciones chilenas, conexiones bancarias, sincronización manual/masiva de cuentas, balances y estadísticas.
- **Dashboard financiero**: APIs de resumen, movimientos paginados, análisis por categorías, tendencias y alertas ya expuestas para la interfaz.
- **Infraestructura demo**: `docker-compose.yml` orquesta backend, frontend, microservicios Python y dependencias (PostgreSQL, Kafka, Qdrant). Scripts `setup-environment.sh` y `setup-database.sh` facilitan la preparación local.
- **Seguridad vigente**: Guards JWT/API key y sanitización básica activos; documentación de riesgos y roadmap de endurecimiento en `SECURITY.md`.
- **IA y analítica**: Motor heurístico simple en recomendador, parsing engine limitado a ingestión básica, `training-engine` pendiente de implementar modelo inteligente.

## 2. Brechas prioritarias
1. **Gestión de secretos y API keys**: `.env` con credenciales de demo en el repositorio; falta gestor centralizado y rotación automática.
2. **Superficie expuesta**: CORS permisivo en microservicios, ausencia de gateway que oculte servicios Python y gestione API keys.
3. **IA y recomendaciones**: No existe pipeline de entrenamiento real ni modelo de clasificación conectado al backend.
4. **Testing y calidad**: No hay suites unitarias ni de integración automatizadas para servicios críticos.
5. **Monitoreo y gobernanza**: Falta CI/CD con inyección de secretos, escaneos, alertas y manual de respuesta ante incidentes.

## 3. Plan de acción priorizado
### Fase 0 – Contención inmediata (día 0-1)
- Revocar/rotar credenciales de Belvo, JWT, API internas y base de datos; registrar nuevas llaves en gestor temporal seguro.
- Sustituir `.env` comprometidos por plantillas sanitizadas y regenerar `.env.local` ignorados mediante script.
- Activar escáneres de secretos (`git-secrets`, `trufflehog`, `detect-secrets`) en hooks locales y pipeline manual.

### Fase 1 – Gestión centralizada de secretos (días 2-5)
- Seleccionar gestor definitivo (AWS Secrets Manager, Vault o Doppler) y sincronizar credenciales demo.
- Adaptar `docker-compose` y scripts de arranque para consumir secretos desde `env_file` externos o Docker secrets.
- Documentar el flujo operativo completo en `/secrets` (bootstrap, rotación, responsables).

### Fase 2 – Endurecimiento de servicios (semana 2)
- Restringir CORS a dominios de demo y futuros entornos productivos.
- Incorporar gateway/reverse proxy (nginx/Traefik) con API keys rotativas y logs de auditoría.
- Ajustar guards JWT/API key para leer secretos rotativos y registrar acceso.

### Fase 3 – IA y analítica avanzada (semana 2-3)
- Implementar pipeline parsing → training → recommendation con dataset base y almacenamiento de modelos versionados.
- Integrar clasificación automática de transacciones en el backend y métricas de rendimiento del modelo.
- Desarrollar detección de patrones/anomalías y recomendaciones personalizadas consumibles por el frontend.

### Fase 4 – Testing y CI/CD (semana 3-4)
- Construir suites unitarias para auth, usuarios, dashboard y Belvo; pruebas de integración para endpoints críticos.
- Configurar CI/CD que ejecute linters, pruebas, escáneres de secretos y despliegue con inyección de secretos.
- Añadir monitoreo (Prometheus, alertas básicas) y health checks automatizados en pipelines.

### Fase 5 – Gobernanza continua (posterior)
- Documentar manual de respuesta ante incidentes de credenciales y checklist previo a demos.
- Revisar periódicamente permisos Firebase/Belvo, políticas de acceso y cifrado en reposo/en tránsito.
- Optimizar frontend/UX y preparar contenidos para inversionistas con métricas del motor de IA.

## 4. Entregables clave
- Plantillas `.env.example` sanitizadas y script de bootstrap operativos.
- Gestor de secretos integrado con documentación y automatizaciones.
- Pipeline de IA funcionando con modelos versionados y recomendaciones en el dashboard.
- Suites de pruebas y CI/CD con reportes visibles.
- Monitoreo básico y playbook de seguridad publicado.

## 5. Métricas de éxito
- **Seguridad**: 0 secretos expuestos en commits; rotación documentada cada 30 días.
- **Disponibilidad**: Demo levanta en <5 minutos con scripts oficiales; health checks verdes en monitoreo.
- **IA**: Precisión mínima del modelo de clasificación ≥80% en dataset de validación.
- **Calidad**: Cobertura de pruebas unitarias ≥60% en módulos críticos; pipeline CI/CD estable.
- **Operación**: Checklist de demo y manual de incidentes validados por stakeholders.

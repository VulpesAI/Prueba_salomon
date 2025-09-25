# Plan Integral de Mejoras

## 1. Estado actual
- **Autenticación y usuarios**: Backend NestJS integra Firebase Admin, estrategia Passport y sincronización de usuarios con perfiles extendidos (roles, preferencias, metadatos financieros).
- **Integración Belvo**: Servicios y endpoints CRUD operativos para instituciones chilenas, conexiones bancarias, sincronización manual/masiva de cuentas, balances y estadísticas.
- **Dashboard financiero**: APIs de resumen, movimientos paginados, análisis por categorías, tendencias y alertas ya expuestas para la interfaz.
- **Infraestructura demo**: `docker-compose.yml` orquesta backend, frontend, microservicios Python y dependencias (PostgreSQL, Kafka, Qdrant). Scripts `setup-environment.sh` y `setup-database.sh` facilitan la preparación local.
- **Seguridad vigente**: Guards JWT/API key y sanitización básica activos; documentación de riesgos y roadmap de endurecimiento en `SECURITY.md`.
- **Credenciales demo**: Se versionan `.env` con valores de laboratorio para garantizar que el demo arranque sin pasos adicionales mientras se ejecutan reuniones con clientes/inversionistas.
- **IA y analítica**: Motor heurístico simple en recomendador, parsing engine limitado a ingestión básica, `training-engine` pendiente de implementar modelo inteligente.

## 2. Brechas prioritarias
1. **Gestión de secretos y API keys**: `.env` con credenciales de demo en el repositorio; falta gestor centralizado y rotación automática una vez que termine la ronda de demos.
2. **Superficie expuesta**: CORS permisivo en microservicios, ausencia de gateway que oculte servicios Python y gestione API keys.
3. **IA y recomendaciones**: No existe pipeline de entrenamiento real ni modelo de clasificación conectado al backend.
4. **Testing y calidad**: No hay suites unitarias ni de integración automatizadas para servicios críticos.
5. **Monitoreo y gobernanza**: Falta CI/CD con inyección de secretos, escaneos, alertas y manual de respuesta ante incidentes.

## 3. Plan de acción priorizado
### Fase 0 – Salud del demo (día 0-1)
- Verificar que los `.env` versionados permiten levantar la plataforma completa (backend, frontend, microservicios) sin ajustes manuales.
- Auditar qué llaves están activas en Belvo, Firebase y la base de datos, documentando responsables y caducidad.
- Activar escáneres de secretos (`git-secrets`, `trufflehog`, `detect-secrets`) para bloquear nuevas exposiciones mientras se mantienen los archivos de demo.

### Fase 1 – Endurecimiento express (días 2-5)
- Rotar las credenciales demo y dejar registro en `/secrets/rotation-log.md` (crear) con fecha y responsable.
- Configurar allowlists reales de CORS en backend y microservicios manteniendo los dominios de demo y staging.
- Incorporar guardas de API key y JWT a los nuevos dominios y consumidores documentados.

### Fase 2 – Migración controlada de secretos (semana 2)
- Seleccionar el gestor definitivo (AWS Secrets Manager, Vault o Doppler) y preparar el script de bootstrap para sincronizar los `.env` versionados hacia secretos externos.
- Actualizar `docker-compose` para consumir variables desde archivos externos o Docker secrets, manteniendo una bandera (`USE_COMMITTED_ENVS=true/false`) que permita alternar entre modo demo y modo seguro.
- Documentar los pasos de activación del gestor en `/secrets` y preparar checklist para revertir a modo demo en caso de contingencia.

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

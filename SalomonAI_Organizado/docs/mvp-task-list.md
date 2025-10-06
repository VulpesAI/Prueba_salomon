# Lista de tareas para habilitar el MVP de Salomón AI

Cada tarea incluye un llamado a la acción para que pueda iniciarse directamente desde esta conversación.

## 1. Core API (NestJS)

- [ ] Diseñar e implementar el módulo `dashboard` con endpoints para agregados financieros. — [Iniciar tarea](#)
- [ ] Construir el módulo `movimientos` con paginación, filtros avanzados y contratos para frontend y motor conversacional. — [Iniciar tarea](#)
- [ ] Crear el stub modular de integración con Belvo, dejando configurables las variables `BELVO_*`. — [Iniciar tarea](#)
- [ ] Implementar el conector de resultados que consuma `parsed_statement` desde Kafka y sincronice Supabase. — [Iniciar tarea](#)
- [ ] Añadir pruebas de integración para los nuevos módulos y el consumidor Kafka usando `@nestjs/testing` y `testcontainers`. — [Iniciar tarea](#)

## 2. Pipeline de parsing

- [ ] Completar el parsing-engine para manejar CSV/Excel con `statement_parser` y PDFs/imágenes con OCR. — [Iniciar tarea](#)
- [ ] Configurar publicación en `statements.out` con la estructura normalizada de transacciones y métricas básicas. — [Iniciar tarea](#)
- [ ] Actualizar el Core API para procesar eventos `parsed_statement`, gestionar reintentos y DLQ. — [Iniciar tarea](#)
- [ ] Documentar variables `.env` del parsing-engine (`KAFKA_BROKERS`, `STATEMENTS_IN_TOPIC`, `STATEMENTS_OUT_TOPIC`, `SUPABASE_*`). — [Iniciar tarea](#)

## 3. Motores de recomendación y forecasting

- [ ] Desarrollar servicio de ingestión periódica que agrupe transacciones y alimente el recommendation-engine. — [Iniciar tarea](#)
- [ ] Implementar endpoints de feedback (`POST /api/v1/recommendations/:id/feedback`, `GET /api/v1/recommendations/history`). — [Iniciar tarea](#)
- [ ] Conectar el forecasting-engine para generar proyecciones tras nuevas cartolas y persistir resultados. — [Iniciar tarea](#)

## 4. Voz y conversación

- [ ] Integrar proveedores reales de STT/TTS en el voice-gateway y abstraer la interfaz. — [Iniciar tarea](#)
- [ ] Actualizar conversation-engine para consultar datos reales (Supabase/Qdrant) y mantener streaming SSE/WebSocket. — [Iniciar tarea](#)
- [ ] Documentar configuración de voz en `docs/voice-gateway-setup.md` con claves y permisos requeridos. — [Iniciar tarea](#)

## 5. Frontend (Next.js)

- [ ] Conectar la pantalla de seguridad y sesiones con los endpoints del módulo auth para listar y revocar sesiones. — [Iniciar tarea](#)
- [ ] Persistir preferencias de notificaciones y alertas consumiendo los nuevos endpoints. — [Iniciar tarea](#)
- [ ] Implementar búsqueda avanzada con filtros del módulo `movimientos` y guardar presets por usuario. — [Iniciar tarea](#)
- [ ] Reemplazar mocks de resúmenes/reportes por datos reales de `dashboard` y recomendaciones. — [Iniciar tarea](#)

## 6. Provisionamiento de infraestructura

- [ ] Documentar despliegue de Supabase (migraciones, seeds, variables `SUPABASE_*`). — [Iniciar tarea](#)
- [ ] Definir configuración persistente de Qdrant y estrategia de backups. — [Iniciar tarea](#)
- [ ] Preparar scripts de Kafka/Zookeeper para crear `statements.in` y `statements.out`, incluyendo autenticación si aplica. — [Iniciar tarea](#)
- [ ] Enumerar secretos y configuración de proveedores de voz/notificaciones (Firebase, Azure, etc.). — [Iniciar tarea](#)

## 7. Métricas, cumplimiento y seguridad

- [x] Instrumentar servicios clave con Prometheus/Grafana y publicar métricas de parsing, recomendaciones y voz (ver `docs/operations/monitoring-stack.md`).
- [x] Redactar lineamientos de privacidad y cumplimiento normativo chileno (anonimización, retención de datos) en `docs/compliance/chile-privacy-guidelines.md`.
- [x] Crear checklists de seguridad para despliegues (rotación de claves, monitoreo, planes de pruebas) en `docs/operations/security-deployment-checklists.md`.


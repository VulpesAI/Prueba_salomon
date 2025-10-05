# Roadmap hacia el MVP de Salomón AI

Este documento sintetiza los trabajos pendientes para transformar el stack actual en un MVP funcional, alineado con el diseño "SalomonAI_Desarrollo.pdf" y las directrices entregadas por producto.

## 1. Ampliación del Core API (NestJS)

| Entregable | Descripción | Dependencias |
| --- | --- | --- |
| Módulo `dashboard` | Endpoints REST para consumir agregados (balance mensual, gasto por categoría, cashflow proyectado). Deben consultar Supabase y reutilizar los resultados que lleguen del motor de recomendaciones. | Supabase, Recommendation Engine |
| Módulo `movimientos` | Listado paginado con filtros por cuenta, fecha, categoría y monto. Debe exponer endpoints para el frontend (Next.js) y para el motor conversacional. | Supabase |
| Integración Belvo (stub) | Preparar estructura modular (servicio, DTOs, proveedores) que permita conectar Belvo en el futuro sin alterar los controladores actuales. | Variables `BELVO_*` opcionales |
| Conector de resultados | Consumidor Kafka/Webhook que reciba `parsed_statement` desde el parsing-engine y cree transacciones en Supabase, actualizando el estado de la cartola. | Kafka (`STATEMENTS_OUT_TOPIC`) |

### Consideraciones técnicas
- Definir DTOs y esquemas de validación con `class-validator`.
- Registrar el consumidor Kafka como `Provider` con `onModuleInit` y `onModuleDestroy` para controlar la conexión.
- Añadir pruebas de integración usando `@nestjs/testing` y un broker Kafka de prueba (por ejemplo, con `testcontainers`).

## 2. Pipeline de parsing completo

1. **Parsing-engine**
   - Implementar parseo real usando `statement_parser` para CSV/Excel y OCR (Tesseract/Azure Form Recognizer) para PDF/imagenes.
   - Leer mensajes desde `statements.in`, procesar y publicar el resultado normalizado en `statements.out`.
   - Registrar métricas básicas (tiempo de procesamiento, número de transacciones extraídas) para Prometheus.

2. **Core API**
   - Al recibir el evento `parsed_statement`, insertar transacciones y marcar la cartola como `processed`.
   - Gestionar reintentos y DLQ (dead-letter queue) en caso de fallos de inserción.

3. **Documentación**
   - Actualizar `.env.example` del parsing-engine con `KAFKA_BROKERS`, `STATEMENTS_IN_TOPIC`, `STATEMENTS_OUT_TOPIC`, `SUPABASE_*` para testing local.

## 3. Alimentación de motores de recomendación y forecasting

- **Servicio de ingestión**: tarea recurrente (cron job o Nest scheduler) que agrupe las transacciones nuevas y envíe un resumen al recommendation-engine vía HTTP o Kafka.
- **Feedback loop**: endpoints `POST /api/v1/recommendations/:id/feedback` y `GET /api/v1/recommendations/history` para almacenar feedback (like/dislike, comentario) y publicar el evento.
- **Forecasting sync**: endpoint o cola para solicitar proyecciones cuando se ingesten nuevas cartolas; almacenar resultados en Supabase.

## 4. Integración voz/conversación

- Reemplazar clientes STT/TTS simulados en `voice-gateway` por proveedores reales (Azure, Google, Amazon). Abstraer la interfaz para facilitar cambios de proveedor.
- En `conversation-engine`, consumir transacciones desde Supabase/Qdrant para responder preguntas contextualizadas con el LLM. Mantener compatibilidad con streaming SSE/WebSocket usado por el frontend.
- Documentar variables sensibles (`AZURE_SPEECH_KEY`, `GOOGLE_APPLICATION_CREDENTIALS`, etc.) en un nuevo archivo `docs/voice-gateway-setup.md` (pendiente).

## 5. Persistencia en el frontend

| Pantalla | Acción requerida |
| --- | --- |
| Seguridad y sesiones | Consumir endpoints de auth para listar sesiones activas y permitir revocación. |
| Notificaciones y alertas | Conectar a nuevos endpoints para guardar preferencias y activar canales push/email. |
| Búsqueda avanzada | Integrar filtros del módulo `movimientos` y guardar presets por usuario. |
| Resúmenes y reportes | Mostrar datos reales de `dashboard` y recomendaciones, reemplazando mocks locales. |

## 6. Provisionamiento de infraestructura

- **Supabase**: documentar comandos para migraciones, seeds y variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`).
- **Qdrant**: definir configuración persistente (`QDRANT_URL`, `QDRANT_API_KEY`) y estrategia de backup.
- **Kafka/Zookeeper**: incluir scripts para crear `statements.in` y `statements.out`. Documentar la autenticación si se usa SASL/SSL.
- **Proveedores de voz y notificaciones**: listar claves y permisos necesarios (Firebase, Azure, etc.).

## 7. Métricas y cumplimiento

- Instrumentar servicios con Prometheus/Grafana (latencia de parsing, número de cartolas procesadas, éxito de recomendaciones).
- Preparar lineamientos de privacidad y cumplimiento normativo chileno, incluyendo anonimización de datos sensibles y retención.
- Añadir checklists de seguridad para cada despliegue (rotación de claves, monitoreo SIEM, pruebas de penetración planificadas).

---

Este roadmap debe revisarse cada sprint y actualizarse conforme se vayan completando entregables o cambien las prioridades de negocio.

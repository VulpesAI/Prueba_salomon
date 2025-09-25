# Endurecimiento inicial de seguridad

Este repositorio comienza la implementación del plan de seguridad descrito para
SalomonAI. Los principales cambios introducidos son:

- Eliminación de credenciales reales del repositorio y sustitución por archivos
  de ejemplo.
- Inclusión de un `.gitignore` que bloquea el seguimiento de cualquier archivo
  `.env` o similar.
- Configuración de `pre-commit` con reglas básicas de detección de secretos
  (detect-secrets, detect-private-key y check-added-large-files).
- Documentación actualizada sobre cómo gestionar los secretos y recomendaciones
  operativas.

## Refuerzos aplicados

- **CORS endurecido**: la Core API y los microservicios Python ahora leen una
  allowlist explícita desde variables de entorno (`CORS_ORIGIN`,
  `FINANCIAL_CONNECTOR_ALLOWED_ORIGINS`, `RECOMMENDATION_ENGINE_ALLOWED_ORIGINS`).
  Se rechazan comodines `*` y los intentos de conexión desde dominios no
  autorizados.
- **Protección de secretos en CI**: se incorporó el workflow de GitHub Actions
  `security-scans` que ejecuta `detect-secrets` contra el baseline del proyecto y
  un análisis adicional con TruffleHog para identificar credenciales expuestas.
- **Visibilidad operativa**: los servicios exponen métricas técnicas en `/metrics`
  para auditar llamadas a la API, uso de colas Kafka y ejecuciones de modelos.

## Próximos pasos sugeridos

1. Configurar el gestor de secretos elegido y parametrizar los despliegues para
   consumirlo.
2. Automatizar la rotación de claves sensibles (JWT, API keys externas,
   credenciales de base de datos) con alertas cuando se aproxime su caducidad.
3. Completar la cobertura de escaneos estáticos con análisis SAST/DAST y
   dependabot interno.
4. Integrar las métricas exportadas con el sistema de alertas corporativo (PagerDuty,
   Opsgenie, etc.).

## Procedimiento de respuesta ante incidentes

1. **Detección y clasificación**
   - Revisa alertas automáticas (Prometheus/Grafana, detect-secrets, TruffleHog).
   - Clasifica el incidente según impacto: filtración de datos, indisponibilidad,
     escalada de privilegios, etc.
2. **Contención inmediata**
   - Aísla los componentes afectados (revocar claves comprometidas, pausar
     despliegues, escalar réplicas).
   - Activa reglas de firewall/WAF adicionales si aplica.
3. **Erradicación y remediación**
   - Aplica parches o configuraciones necesarias.
   - Rota todas las credenciales asociadas y actualiza los secretos en el gestor
     centralizado.
   - Revisa logs y métricas para confirmar la desaparición del comportamiento
     anómalo.
4. **Recuperación y verificación**
   - Restaura los servicios gradualmente bajo monitoreo reforzado.
   - Ejecuta pruebas funcionales y de regresión.
5. **Comunicación y documentación**
   - Notifica al equipo directivo y a las partes interesadas siguiendo el plan
     interno de comunicaciones.
   - Registra un postmortem detallado con cronología, impacto, acciones
     correctivas y aprendizajes.
6. **Seguimiento**
   - Actualiza esta documentación y los runbooks relacionados.
   - Revisa los controles preventivos para evitar recurrencias.

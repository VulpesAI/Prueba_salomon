# Checklists de seguridad para despliegues

Estas listas de verificación complementan el plan de seguridad descrito en
`docs/SECURITY.md` y permiten validar que cada despliegue de SalomónAI respeta los
controles mínimos de protección de datos y continuidad operacional.

## 1. Preparación previa al despliegue

- [ ] Revisar pipeline de CI/CD: resultados de pruebas, análisis estático y *secret scans*.
- [ ] Confirmar versiones aprobadas de dependencias y contenedores base (hashes firmados).
- [ ] Validar que las variables sensibles provienen del gestor de secretos (no `.env`).
- [ ] Revisar cambios de infraestructura (Terraform/Helm) y ejecutar `plan` revisado por
      un segundo par.
- [ ] Actualizar diagramas de arquitectura y documentación operativa relevante.
- [ ] Verificar vigencia de certificados TLS y llaves API utilizadas por servicios externos.

## 2. Despliegue en ambientes controlados

- [ ] Ejecutar *smoke tests* y healthchecks (`/health`, `/metrics`) tras el despliegue.
- [ ] Validar autenticación y autorización (MFA, roles críticos) en entorno pre-productivo.
- [ ] Confirmar que Prometheus/Grafana registran nuevas métricas sin errores de scraping.
- [ ] Revisar logs de seguridad (SIEM) en busca de alertas o anomalías durante el despliegue.
- [ ] Documentar ventana de mantenimiento, responsables y resultados preliminares.

## 3. Post-despliegue en producción

- [ ] Rotar claves/tokens utilizados durante la instalación (deploy keys, API keys temporales).
- [ ] Revisar dashboards de métricas y alertas: parsing, recomendaciones y voz.
- [ ] Ejecutar pruebas de recuperación (backup/restore, *rollbacks* controlados) según el
      plan de continuidad.
- [ ] Confirmar que las políticas de retención y borrado automático siguen activas.
- [ ] Actualizar inventario de activos y dependencias desplegadas.
- [ ] Registrar *post-mortem* o informe de despliegue en el repositorio de operaciones.

## 4. Respuesta a incidentes y seguimiento

- [ ] Mantener lista de contactos de emergencia y runbooks accesibles.
- [ ] Revisar *playbooks* de incidentes relacionados con fuga de datos o indisponibilidad.
- [ ] Programar simulacros o revisiones trimestrales de incidentes críticos.
- [ ] Actualizar lessons learned en `docs/SECURITY.md` y planes de remediación.

## 5. Automatización recomendada

- [ ] Integrar las listas en herramientas de gestión de cambios (Jira, Notion) para
      bloqueo automático hasta completar los checks.
- [ ] Generar reportes firmados digitalmente que documenten cada ejecución del checklist.
- [ ] Configurar recordatorios automáticos para rotación de credenciales y revisión de
      accesos privilegiados.

Estas checklists deben revisarse al menos una vez por trimestre y tras cada cambio
significativo de arquitectura.

# Guía de alineamiento con SOC 2 (Type II)

## Resumen

Este documento describe cómo los controles técnicos recién incorporados en la
plataforma SalomónAI contribuyen al cumplimiento con los criterios de
confianza de SOC 2 (seguridad, disponibilidad y confidencialidad). Cada
sección referencia controles e implementaciones específicas del código fuente.

## Controles clave

### Seguridad lógica y autenticación (CC6)

- **Autenticación multifactor (MFA)**: La API incorpora registro, verificación
  y uso obligatorio de tokens TOTP para sesiones sensibles. Véase
  `services/core-api/src/auth/auth.service.ts` para la lógica de enrolamiento y
  verificación y `auth.controller.ts` para los endpoints protegidos.
- **Tokens de acceso rotativos**: Las sesiones emiten *refresh tokens*
  de un solo uso almacenados con hash en la base de datos (tabla
  `auth_tokens`). La rotación obligatoria mitiga el uso indebido de credenciales.

### Gestión de claves y cifrado (CC6.6, CC6.7)

- **Gestión centralizada de certificados**: La carga de certificados TLS se
  realiza mediante integraciones con un servicio KMS (`services/core-api/src/security`).
  Los certificados se obtienen de forma dinámica y se fuerzan conexiones TLS 1.3.

### Monitoreo y respuesta (CC7)

- **Integración SIEM**: Eventos críticos (inicios de sesión, altas/bajas de MFA,
  rotación de tokens) se envían a un colector SIEM configurable para permitir
  detección temprana de anomalías.

### Gestión de terceros (CC9)

- **OAuth2 / OpenID Connect**: La integración con Google asegura el uso de
  PKCE y flujos estandarizados, reduciendo el riesgo de autenticación delegada.

## Procedimientos recomendados

1. **Auditoría periódica** de los registros generados por `SiemLoggerService`.
2. **Automatización de rotación** de claves y certificados en el KMS integrado.
3. **Revisión anual** de las políticas de acceso y de los roles de usuario.

## Evidencias sugeridas

- Exportes de eventos SIEM demostrando detección de eventos críticos.
- Pruebas de penetración que validen el bloqueo de tokens rotados.
- Registro de usuarios enrolados en MFA y códigos de respaldo emitidos.


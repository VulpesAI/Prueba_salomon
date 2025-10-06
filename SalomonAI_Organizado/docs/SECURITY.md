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

## Controles de autenticación

- **MFA TOTP**: Los usuarios pueden enrolarse y verificar tokens TOTP mediante
  los endpoints de `/auth/mfa`. El login local exige un token válido (código o
  respaldo) cuando `mfaEnabled` está activo.
- **OAuth2 / OIDC con PKCE**: Nuevos endpoints en `auth/oauth` permiten iniciar
  sesión con Google garantizando protección PKCE, creación automática de
  usuarios y emisión de tokens rotativos.

## Gestión de sesiones y tokens

- **Rotación de refresh tokens**: Cada sesión emite un `refreshToken` de un solo
  uso almacenado con hash en la tabla `auth_tokens`. Los tokens previos quedan
  invalidados al solicitar uno nuevo.
- **Integración SIEM**: `SiemLoggerService` envía eventos de autenticación y
  cambios de estado MFA a un colector remoto configurable.

## Gestión de claves y cifrado

- **KMS y TLS 1.3**: En `src/security` se incorpora la obtención dinámica de
  certificados desde un servicio KMS y el arranque opcional del servidor con
  TLS 1.3. Si no hay certificados disponibles, el sistema registra una alerta y
  continúa en HTTP para entornos locales.

## Documentación de cumplimiento

- [SOC 2](docs/compliance/SOC2.md): Mapeo de los nuevos controles respecto a los
  criterios de confianza.
- [ISO/IEC 27001](docs/compliance/ISO27001.md): Relación de controles técnicos
  y procedimientos recomendados.

## Próximos pasos sugeridos

1. Configurar el gestor de secretos elegido y parametrizar los despliegues para
   consumirlo automáticamente.
2. Añadir un pipeline de CI que ejecute `detect-secrets scan --baseline .secrets.baseline`
   y trufflehog sobre cada cambio.
3. Integrar la salida del SIEM con un playbook de respuesta a incidentes.
4. Completar la documentación operacional (rotación de certificados, pruebas de
   recuperación frente a caída del proveedor OAuth).
5. Mantener actualizadas las listas de verificación de despliegues en
   `docs/operations/security-deployment-checklists.md` y automatizar su ejecución en
   el pipeline de cambios.

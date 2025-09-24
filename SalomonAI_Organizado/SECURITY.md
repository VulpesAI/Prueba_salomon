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

## Próximos pasos sugeridos

1. Configurar el gestor de secretos elegido y parametrizar los despliegues para
   consumirlo.
2. Añadir un pipeline de CI que ejecute `detect-secrets scan --baseline .secrets.baseline`
   y trufflehog sobre cada cambio.
3. Revisar los servicios Python y Node para restringir CORS a los dominios
   permitidos antes de exponerlos públicamente.
4. Documentar procedimientos de rotación y respuesta ante incidentes.

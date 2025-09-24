# Plan de endurecimiento de seguridad

Este documento consolida el diagnóstico y la hoja de ruta para proteger los
servicios de SalomonAI tras la exposición inicial de secretos en el
repositorio. Complementa las plantillas `.env.example`, la documentación de
secretos y la configuración de escaneo de secretos añadida previamente. Los
archivos `.env` con credenciales de laboratorio fueron retirados del control de
versiones; el objetivo ahora es operar únicamente con plantillas y con un
gestor centralizado que distribuya los valores reales.

## Diagnóstico del estado actual
- El backend central ya cuenta con autenticación Firebase, sincronización con
  Belvo y APIs de dashboard, por lo que el foco inmediato se centra en
  robustecer la operación existente.
- La guía de secretos describe buenas prácticas, pero aún persisten artefactos
  históricos con credenciales reales dentro del repositorio.
- Se identificaron credenciales reales de Belvo, JWT y contraseñas de base de
  datos en archivos `.env`, además de llaves internas y tokens JWT en la raíz.
- Los microservicios Python exponían CORS universal (`"*"`), abriendo sus
  endpoints a cualquier origen si se despliegan sin un proxy restrictivo.
- La integración con Belvo exige manejar credenciales mediante variables de
  entorno, reforzando la necesidad de un gestor seguro y rotación periódica.

## Riesgos críticos a mitigar de inmediato
1. **Exposición de secretos y credenciales en el repositorio**, incluyendo claves
   JWT, API keys internas, contraseñas de base de datos y credenciales de Belvo
   (ya removidas de la rama principal pero que requieren revocación/rotación).
2. **CORS abierto en servicios auxiliares**, que podrían quedar accesibles sin
   control si se publican directamente.
3. **Ausencia de un flujo formal de gestión y rotación de secretos**, pese a la
   estructura preliminar en `/secrets`.

## Plan priorizado de mejora

### Fase 0 – Contención (día 0-1)
- **Revocar y rotar** todas las claves expuestas (Belvo, JWT, API internas,
  contraseñas de base de datos). Registrar las nuevas credenciales en un gestor
  seguro.
- **Mantener fuera del repositorio** cualquier archivo `.env`; utilizar sólo
  plantillas (`.env.example`) y automatizaciones (por ejemplo el script
  `secrets/bootstrap-local-env.sh`) que reconstruyan los secretos desde el
  gestor elegido.
- **Configurar detección de secretos** (por ejemplo `detect-secrets`, `git
  secrets` o `trufflehog`) tanto en local como en CI para evitar futuros commits
  sensibles.

### Fase 1 – Gestión segura de secretos (días 2-5)
- Implementar un gestor centralizado (AWS Secrets Manager, Vault, Doppler, etc.)
  y ajustar los servicios para consumir secretos en tiempo de despliegue,
  dejando sólo archivos de ejemplo en el repositorio.
- Modificar `docker-compose` y scripts de despliegue para cargar credenciales
  mediante `env_file` que apunten a rutas fuera del repositorio o usando Docker
  secrets montados en `/run/secrets`.
- Formalizar la estructura `/secrets` como documentación del gestor elegido e
  incluir scripts de bootstrap que generen `.env` locales desde plantillas
  cifradas.

### Fase 2 – Endurecimiento de servicios (semana 2)
- **Restringir CORS** en cada microservicio para aceptar únicamente los dominios
  oficiales y entornos internos.
- Introducir un **API Gateway o reverse proxy** (nginx/Traefik) con
  autenticación mutua o API keys gestionadas para servicios internos, evitando
  exponer FastAPI directamente.
- Reforzar los guardas de API key en el core para leer secretos rotativos desde
  el gestor central y registrar auditorías de uso.

### Fase 3 – Gobernanza y automatización (semana 3-4)
- Añadir un **pipeline CI/CD** que inyecte secretos en tiempo de despliegue y
  ejecute escaneos de configuración y de secretos.
- Implementar **auditoría y monitoreo**: alertas cuando se acceden a secretos,
  métricas de rotación y health checks de los servicios (extender los ya
  existentes).
- Documentar un **manual de respuesta** ante exposición de llaves, con tiempos
  máximos de rotación y responsables.

### Fase 4 – Robustez continua (posterior)
- Completar pruebas unitarias e integraciones para asegurar que los cambios de
  configuración no rompen flujos críticos.
- Revisar periódicamente reglas de acceso, permisos de Firebase y políticas de
  Belvo conforme se habiliten entornos productivos.
- Evaluar cifrado en reposo y en tránsito para archivos subidos/descargados y
  volúmenes `uploads`/`models`.

## Próximos pasos operativos
1. Nombrar a un responsable de seguridad para ejecutar la fase 0 de inmediato.
2. Seleccionar la herramienta de gestión de secretos y preparar una prueba de
   concepto durante la semana.
3. Ajustar los servicios para consumir secretos centralizados y desplegar en un
   entorno de staging controlado.
4. Validar, mediante checklists de configuración (Firebase, Belvo) y pruebas de
   regresión, que los flujos críticos siguen operativos tras la rotación.
5. Mantener revisiones semanales hasta completar las fases y cerrar los
   pendientes marcados en la hoja de ruta del backend.


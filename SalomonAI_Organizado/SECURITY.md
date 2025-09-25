# Plan de endurecimiento de seguridad

Este documento consolida el diagnóstico y la hoja de ruta para proteger los
servicios de SalomonAI tras la exposición inicial de secretos en el
repositorio. Complementa las plantillas `.env.example`, la documentación de
secretos y la configuración de escaneo de secretos añadida previamente. Para
mantener activo el demo con inversionistas se conservan los archivos `.env` con
credenciales de laboratorio dentro del repositorio; este plan busca endurecer su
uso, registrar cada rotación y preparar la migración a un gestor centralizado sin
interrumpir la demostración en vivo.

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
   JWT, API keys internas, contraseñas de base de datos y credenciales de Belvo.
   Mientras sigan versionadas deben rotarse periódicamente y documentarse en un
   registro privado de rotación.
2. **CORS abierto en servicios auxiliares**, que podrían quedar accesibles sin
   control si se publican directamente.
3. **Ausencia de un flujo formal de gestión y rotación de secretos**, pese a la
   estructura preliminar en `/secrets`.

## Plan priorizado de mejora

### Fase 0 – Salud del demo (día 0-1)
- **Auditar y documentar** el estado de cada credencial versionada (Belvo, JWT,
  API internas, base de datos) en `/secrets/rotation-log.md`.
- **Rotar las llaves** comprometidas conservando copias actualizadas en los `.env`
  versionados y almacenando credenciales maestras en un repositorio privado
  seguro.
- **Configurar detección de secretos** (por ejemplo `detect-secrets`, `git
  secrets` o `trufflehog`) tanto en local como en CI para evitar nuevas
  exposiciones no controladas.

### Fase 1 – Endurecimiento express (días 2-5)
- Restringir CORS en backend y microservicios a los dominios necesarios para las
  demos y entornos de staging.
- Actualizar allowlists de API keys documentando qué cliente/servicio consume
  cada clave.
- Añadir un script de verificación previa a demos que valide conectividad con
  Firebase, Belvo y la base de datos usando los `.env` versionados.

### Fase 2 – Migración controlada (semana 2)
- Seleccionar el gestor centralizado (AWS Secrets Manager, Vault, Doppler, etc.)
  y replicar los valores actuales en ese repositorio seguro.
- Adaptar `docker-compose` para aceptar una bandera (`USE_COMMITTED_ENVS`) que
  permita alternar entre los archivos versionados y las credenciales servidas
  desde el gestor.
- Preparar scripts de bootstrap que descarguen los secretos desde el gestor y
  regeneren `.env.local` ignorados cuando se active el modo seguro.

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


# Gestión de secretos para SalomonAI

Este directorio documenta qué secretos requiere la plataforma. Mientras el demo
para inversionistas siga activo, el repositorio conserva un conjunto mínimo de
archivos `.env` con credenciales de laboratorio para facilitar la puesta en
marcha inmediata. El plan vigente busca **endurecer el uso de esas credenciales**
registrando cada rotación y preparando la migración a un gestor dedicado (AWS
Secrets Manager, Vault, Doppler, etc.) sin frenar las presentaciones.

## Archivos de referencia

- `database.env.example`: Variables esperadas para la base de datos.
- `jwt.env.example`: Claves y configuración de JWT.
- `api-keys.env.example`: API keys para integraciones externas (Belvo, OpenAI, etc.).

Para crear archivos locales a partir de los ejemplos:

Puedes utilizar el script `secrets/bootstrap-local-env.sh` para crear copias
locales ignoradas por git cuando se active el modo gestionado:

```bash
./secrets/bootstrap-local-env.sh
```

El script generará archivos `.env.local` en la raíz y en los microservicios
principales. Completa cada variable con las credenciales entregadas por el gestor
o, durante la etapa de demo, copia las llaves vigentes desde los `.env`
versionados. Registra cualquier rotación en `rotation-log.md`.

## Recomendaciones

1. **Rotación periódica:** programa rotaciones trimestrales o inmediatas ante
   incidentes, documentándolas en `rotation-log.md`.
2. **Acceso mínimo necesario:** limita quién puede leer cada secreto incluso en
   los `.env` versionados.
3. **Auditoría:** registra cuándo se leen o actualizan los secretos y desde qué
   servicio, especialmente durante demos públicas.
4. **Automatización:** configura tus pipelines de CI/CD para inyectar secretos en
   tiempo de despliegue usando credenciales efímeras cuando se active el modo con
   gestor.

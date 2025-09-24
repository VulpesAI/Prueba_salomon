# Gestión de secretos para SalomonAI

Este directorio documenta qué secretos requiere la plataforma, pero **no** debe
contener credenciales reales. A partir de ahora el repositorio sólo versiona
plantillas (`*.env.example`) y scripts de bootstrap; los valores reales deben
provenir del gestor dedicado definido por el equipo (por ejemplo AWS Secrets
Manager, GCP Secret Manager, Vault o Doppler) y entregarse a los servicios en
tiempo de despliegue.

## Archivos de referencia

- `database.env.example`: Variables esperadas para la base de datos.
- `jwt.env.example`: Claves y configuración de JWT.
- `api-keys.env.example`: API keys para integraciones externas (Belvo, OpenAI, etc.).

Para crear archivos locales a partir de los ejemplos:

Puedes utilizar el script `secrets/bootstrap-local-env.sh` para crear copias
locales ignoradas por git:

```bash
./secrets/bootstrap-local-env.sh
```

El script generará archivos `.env.local` en la raíz y en los microservicios
principales. Completa cada variable con las credenciales entregadas por el
gestor de secretos y evita subir los archivos resultantes al repositorio.

## Recomendaciones

1. **Rotación periódica:** programa rotaciones trimestrales o inmediatas ante
   incidentes.
2. **Acceso mínimo necesario:** limita quién puede leer cada secreto.
3. **Auditoría:** registra cuándo se leen o actualizan los secretos y desde qué
   servicio.
4. **Automatización:** configura tus pipelines de CI/CD para inyectar secretos en
   tiempo de despliegue usando credenciales efímeras.

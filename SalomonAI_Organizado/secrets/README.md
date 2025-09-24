# Gestión de secretos para SalomonAI

Este directorio documenta qué secretos requiere la plataforma, pero **no** debe
contener credenciales reales. Usa un gestor dedicado (por ejemplo AWS Secrets
Manager, GCP Secret Manager, Vault o Doppler) para almacenar los valores
sensibles y entregarlos a los servicios en tiempo de despliegue.

## Archivos de referencia

- `database.env.example`: Variables esperadas para la base de datos.
- `jwt.env.example`: Claves y configuración de JWT.
- `api-keys.env.example`: API keys para integraciones externas (Belvo, OpenAI, etc.).

Para crear archivos locales a partir de los ejemplos:

```bash
cp secrets/database.env.example secrets/database.env
cp secrets/jwt.env.example secrets/jwt.env
cp secrets/api-keys.env.example secrets/api-keys.env
```

Los archivos generados deben mantenerse fuera del control de versiones y
sincronizarse únicamente mediante el gestor de secretos definido por el equipo.

## Recomendaciones

1. **Rotación periódica:** programa rotaciones trimestrales o inmediatas ante
   incidentes.
2. **Acceso mínimo necesario:** limita quién puede leer cada secreto.
3. **Auditoría:** registra cuándo se leen o actualizan los secretos y desde qué
   servicio.
4. **Automatización:** configura tus pipelines de CI/CD para inyectar secretos en
   tiempo de despliegue usando credenciales efímeras.

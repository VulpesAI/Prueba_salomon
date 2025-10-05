#!/bin/bash
set -euo pipefail

cat <<'INSTRUCTIONS'
⚠️  Este script no realiza cambios automáticos en tu entorno.
    Está pensado como guía para desarrolladores que necesitan
    preparar una base de datos de Supabase para SalomónAI.

🚫  No lo ejecutes en entornos productivos donde Supabase ya esté
    provisionado ni intentes crear bases de datos adicionales.

=====================================
1. Crear el proyecto y la base en Supabase
=====================================
A) Desde el panel web:
   1. Ingresa en https://app.supabase.com/ y autentícate.
   2. Crea un nuevo proyecto o selecciona uno existente.
   3. Define la contraseña principal de la base de datos.
   4. Copia la información de conexión (host, puerto, base, usuario y contraseña).

B) Con la CLI de Supabase:
   1. Instala la CLI siguiendo https://supabase.com/docs/guides/cli.
   2. Ejecuta `supabase login` para vincular tu cuenta.
   3. Usa `supabase projects create` para crear un proyecto nuevo
      o `supabase projects list` para localizar uno existente.
   4. Obtén la cadena de conexión con
      `supabase db credentials get --project-ref <ref_del_proyecto>`.

==============================================
2. Configurar la cadena de conexión con SSL requerido
==============================================
Supabase exige conexiones TLS. Exporta la URL de la base incluyendo `sslmode=require`:

   export SUPABASE_DB_URL="postgresql://<usuario>:<contraseña>@<host>:<puerto>/<base>?sslmode=require"
   export DATABASE_URL="$SUPABASE_DB_URL"
   # Opcionalmente, también puedes exportar POSTGRES_URL si lo prefieres:
   export POSTGRES_URL="$SUPABASE_DB_URL"

Reemplaza los marcadores `<usuario>`, `<contraseña>`, `<host>`, `<puerto>` y `<base>`
con los valores obtenidos del panel o de la CLI.

=======================================================
3. Aplicar el esquema base y migraciones SQL
=======================================================
Con la cadena de conexión exportada puedes ejecutar directamente el
script `setup-database.sql`, el cual crea las tablas `accounts`,
`statements`, `transactions` y las estructuras de clasificación utilizadas
por el pipeline de entrenamiento:

   psql "$SUPABASE_DB_URL" -f setup-database.sql

Si prefieres utilizar la CLI oficial de Supabase, asegúrate de iniciar
sesión (`supabase login`) y exportar el token de acceso:

   export SUPABASE_ACCESS_TOKEN="<token de servicio o personal>"
   supabase db push --project-ref <ref_del_proyecto> \
     --file supabase/migrations/20240527120000_financial_schema.sql

El comando anterior aplica el mismo esquema en tu instancia gestionada.
Supabase solicitará la contraseña maestra de la base; puedes inyectarla
temporalmente mediante `SUPABASE_DB_PASSWORD` si automatizas el proceso.

=======================================================
4. Semillas para pruebas automatizadas
=======================================================
Se incluyen datasets mínimos para las pruebas E2E del Core API y para el
pipeline de entrenamiento. Cárgalos cuando necesites datos consistentes:

   psql "$SUPABASE_DB_URL" -f database/seeds/core_api_seed.sql
   psql "$SUPABASE_DB_URL" -f database/seeds/training_seed.sql

Las semillas respetan las claves únicas (`statement_id`, `external_id`)
y pueden ejecutarse múltiples veces gracias a `ON CONFLICT`.

=======================================================
5. Verificaciones adicionales
=======================================================
- Para validar la conexión manualmente ejecuta:

     psql "$SUPABASE_DB_URL"

- Mantén tus credenciales seguras. Nunca compartas la contraseña del
  proyecto y evita guardarla en archivos versionados.

✅  Con estos pasos tendrás tu base de datos de Supabase lista, el esquema
    sincronizado y datos semilla disponibles para SalomónAI.
INSTRUCTIONS

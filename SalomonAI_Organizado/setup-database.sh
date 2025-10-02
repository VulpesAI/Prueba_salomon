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
3. Ejecutar migraciones de TypeORM contra tu instancia remota
=======================================================
Dentro del servicio `core-api` se incluye la configuración de TypeORM.
Desde la raíz del repositorio:

   cd services/core-api
   npm install
   npm run migration:run

El comando utilizará la variable `DATABASE_URL` (o `POSTGRES_URL`) que
configuraste en el paso anterior y aplicará las migraciones sobre tu
instancia de Supabase.

=======================================================
4. Verificaciones adicionales
=======================================================
- Para validar la conexión manualmente ejecuta:

     psql "$SUPABASE_DB_URL"

- Si necesitas rehacer las migraciones, utiliza:

     npm run migration:revert

- Mantén tus credenciales seguras. Nunca compartas la contraseña del
  proyecto y evita guardarla en archivos versionados.

✅  Con estos pasos tendrás tu base de datos de Supabase lista y las
    migraciones ejecutadas para SalomónAI.
INSTRUCTIONS

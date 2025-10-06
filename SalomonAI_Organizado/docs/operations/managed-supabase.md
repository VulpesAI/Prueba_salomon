# Guía: levantar el stack con Supabase gestionado

Esta guía explica cómo configurar el archivo `.env`, validar la conectividad y arrancar los servicios cuando la base de datos principal vive en un clúster administrado de Supabase.

## 1. Pre-requisitos

1. Proyecto Supabase con el pool transaccional habilitado (puerto `6543`).
2. Credenciales del usuario `postgres` (o uno dedicado con permisos equivalentes) y contraseña asociada.
3. Cadena de conexión completa (`postgresql://...`) que incluya `?sslmode=require`. Puedes copiarla desde la sección **Project Settings → Database → Connection string → Pooler → Transactional**.
4. Docker y Docker Compose v2 instalados.

## 2. Configurar `.env`

1. Duplica el archivo de ejemplo:
   ```bash
   cp .env.example .env
   ```
2. Edita los valores relacionados con Supabase:
   ```dotenv
   POSTGRES_HOST=aws-0-us-east-1.pooler.supabase.com   # Host del pool transaccional
   POSTGRES_PORT=6543                                  # Puerto del pool transaccional
   POSTGRES_USER=postgres                              # Usuario con privilegios sobre la base
   POSTGRES_PASSWORD=tu-contraseña-super-secreta       # Clave del usuario anterior
   POSTGRES_DB=postgres                                # Base de datos predeterminada
   FORECASTING_DATABASE_URL=postgresql://postgres:tu-contraseña-super-secreta@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
   ```

   - Ajusta `POSTGRES_DB` si utilizas un esquema distinto.
   - Asegúrate de mantener `?sslmode=require`; los clientes de Python (`sqlalchemy[psycopg]`) y Node.js lo necesitan para establecer TLS.

3. Añade las variables de autenticación para el Core API:
   ```dotenv
   SUPABASE_URL=https://<tu-proyecto>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_JWT_AUDIENCE=authenticated  # opcional, usa el valor de la consola si aplicable
   ```

   - Obtén estos valores en **Project Settings → API** dentro del panel de Supabase.
   - Copia el `Project URL` en `SUPABASE_URL` y el `service_role` en `SUPABASE_SERVICE_ROLE_KEY`. Guarda la clave solo en gestores de secretos.

4. Revisa que otros servicios lean las mismas credenciales (por ejemplo `CORE_API_DATABASE_URL` si lo tienes definido en tus secretos).

## 3. Probar la conectividad

Antes de levantar el stack, valida que la cadena funciona usando `psql` o `pgcli`:

```bash
psql "$FORECASTING_DATABASE_URL"
```

Si la conexión es exitosa deberías ver el prompt de PostgreSQL. En caso contrario revisa reglas de red o credenciales.

## 4. Levantar los servicios

1. Exporta el archivo `.env` para que Docker Compose lo consuma automáticamente (esto ocurre por defecto si resides en la raíz del repo).
2. Arranca los servicios dependientes de la base externa:
   ```bash
   docker compose up --build core-api forecasting-engine conversation-engine financial-connector recommendation-engine parsing-engine kafka zookeeper qdrant frontend voice-gateway
   ```
3. Monitorea los logs para confirmar que tanto `core-api` como `forecasting-engine` inician sin errores de conexión.

## 5. Sincronizar esquema y datos

- Ejecuta el script SQL incluido en la raíz del proyecto para crear las tablas `accounts`, `statements`, `transactions` y las estructuras de clasificación consumidas por el pipeline de entrenamiento:

  ```bash
  psql "$FORECASTING_DATABASE_URL" -f setup-database.sql
  ```

- Como alternativa usa la CLI de Supabase (requiere `supabase login` y exportar `SUPABASE_ACCESS_TOKEN`) para aplicar la migración equivalente ubicada en `supabase/migrations/20240527120000_financial_schema.sql`:

  ```bash
  supabase db push --project-ref <ref_del_proyecto> \
    --file supabase/migrations/20240527120000_financial_schema.sql
  ```

  Si automatizas el proceso desde CI, define también `SUPABASE_DB_PASSWORD` para que la CLI pueda conectarse sin prompts interactivos.

- Importa los datasets mínimos pensados para las pruebas automatizadas (Core API y pipeline de entrenamiento) ejecutando:

  ```bash
  psql "$FORECASTING_DATABASE_URL" -f database/seeds/core_api_seed.sql
  psql "$FORECASTING_DATABASE_URL" -f database/seeds/training_seed.sql
  ```

  Ambos archivos utilizan `ON CONFLICT` para que puedas ejecutarlos múltiples veces sin generar registros duplicados.

## 6. Buenas prácticas

- **No compartas** la contraseña del usuario `postgres`; utiliza variables de entorno o secretos cifrados.
- Considera crear usuarios específicos por microservicio con permisos limitados si tu arquitectura lo requiere.
- Habilita reglas de firewall/VPC en Supabase para permitir únicamente las IP públicas desde donde ejecutas Docker.
- Mantén los backups automáticos de Supabase activos y revisa el panel de métricas para detectar conexiones agotadas en el pool.

## 7. Autenticación contra Supabase

- El Core API reemplazó el intercambio `POST /auth/firebase-login` por `POST /auth/supabase-login`.
- El frontend debe enviar `{ "access_token": "<token emitido por Supabase>" }` y recibirá un JWT propio de la plataforma.
- Valida los tokens del frontend obteniéndolos a través de `supabase.auth.signInWithPassword` u otros flujos soportados por Supabase y reenvía el `access_token` al Core API.

Con estos pasos ya puedes trabajar exclusivamente con la base de datos administrada sin desplegar el contenedor `postgres` local.

## 8. Diagnóstico cuando las tablas no aparecen

Si después de configurar las credenciales no ves las tablas creadas en Supabase, revisa lo siguiente antes de repetir la migración:

1. **Confirma la llave usada**. El SDK debe inicializarse con la `service_role` (valor largo y secreto) para ejecutar operaciones administrativas. Las claves `anon` solo sirven para el frontend. Verifica tu `.env`:

   ```dotenv
   SUPABASE_URL=https://<tu-proyecto>.supabase.co
   SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # service_role
   ```

2. **Método de creación**. Supabase no crea tablas automáticamente. Usa alguno de estos caminos:

   - Panel web → Table Editor → New Table.
   - Editor SQL ejecutando `supabase/migrations/20240527120000_financial_schema.sql` o tus scripts personalizados.
   - Llamadas explícitas desde el backend (solo funcionan si la tabla ya existe; los `insert` no crean esquemas nuevos).

3. **Proyecto correcto**. Asegúrate de que `SUPABASE_URL` apunte al proyecto deseado. Copia la URL exacta desde **Project Settings → API** (ejemplo: `https://abcdxyz123.supabase.co`).

4. **Scripts de inicialización**. Revisa si tu servicio tiene algún paso automático (`runMigrations`, `init_db.sql`, etc.). Si no existe, Supabase no generará tablas por ti.

5. **Solución recomendada**. Mantén un script declarativo (`supabase/migrations/*.sql` o `scripts/init_db.sql`) y ejecútalo con `supabase db push` o desde el SQL Editor. Así puedes reproducir el esquema en cualquier ambiente.

Esta lista te ayudará a detectar configuraciones incorrectas y asegurar que los entornos nuevos obtengan las tablas esperadas desde el primer despliegue.

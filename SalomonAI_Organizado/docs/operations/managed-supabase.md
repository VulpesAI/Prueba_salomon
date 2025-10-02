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

3. Revisa que otros servicios lean las mismas credenciales (por ejemplo `CORE_API_DATABASE_URL` si lo tienes definido en tus secretos).

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

- `core-api` ejecuta sus migraciones en el arranque si encuentra la cadena válida; no se requiere un contenedor de PostgreSQL local.
- Si necesitas aplicar migraciones manuales, ejecuta los comandos propios del servicio (por ejemplo `pnpm prisma migrate deploy` en `services/core-api`). Asegúrate de que las variables `DATABASE_URL` o equivalentes apunten al mismo host de Supabase.

## 6. Buenas prácticas

- **No compartas** la contraseña del usuario `postgres`; utiliza variables de entorno o secretos cifrados.
- Considera crear usuarios específicos por microservicio con permisos limitados si tu arquitectura lo requiere.
- Habilita reglas de firewall/VPC en Supabase para permitir únicamente las IP públicas desde donde ejecutas Docker.
- Mantén los backups automáticos de Supabase activos y revisa el panel de métricas para detectar conexiones agotadas en el pool.

Con estos pasos ya puedes trabajar exclusivamente con la base de datos administrada sin desplegar el contenedor `postgres` local.

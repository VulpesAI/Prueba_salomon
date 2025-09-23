-- Configuración de base de datos para SalomonAI
-- Este script crea el usuario y la base de datos necesarios

-- Crear usuario postgres si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'postgres') THEN
        CREATE ROLE postgres WITH LOGIN PASSWORD 'postgres';
    END IF;
END
$$;

-- Otorgar privilegios al usuario
ALTER ROLE postgres CREATEDB;
ALTER ROLE postgres SUPERUSER;

-- Crear base de datos salomon si no existe
SELECT 'CREATE DATABASE salomon'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'salomon')\gexec

-- Conectar a la base de datos salomon
\c salomon

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Verificar la configuración
\echo '✅ Base de datos configurada correctamente'
\echo '📊 Información de la base de datos:'
SELECT 
    current_database() as database_name,
    current_user as current_user,
    version() as postgresql_version;

\echo '🔧 Extensiones instaladas:'
SELECT extname as extension_name FROM pg_extension ORDER BY extname;

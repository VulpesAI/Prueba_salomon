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

-- Esquema para el pipeline de ingesta
CREATE TABLE IF NOT EXISTS ingested_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    account_id UUID NULL,
    source VARCHAR(100) NOT NULL DEFAULT 'upload',
    original_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_hash CHAR(64) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'RECEIVED',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ingested_documents_user_hash ON ingested_documents (user_id, file_hash);
CREATE INDEX IF NOT EXISTS idx_ingested_documents_status ON ingested_documents (status);

CREATE TABLE IF NOT EXISTS normalized_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES ingested_documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    account_id UUID NULL,
    external_id VARCHAR(100) NULL,
    checksum CHAR(64) NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'CLP',
    type VARCHAR(20) NOT NULL,
    category VARCHAR(100) NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    raw_data JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_normalized_transactions_user_checksum ON normalized_transactions (user_id, checksum);
CREATE INDEX IF NOT EXISTS idx_normalized_transactions_document ON normalized_transactions (document_id);

ALTER TABLE IF EXISTS transactions ADD COLUMN IF NOT EXISTS document_id UUID NULL;
ALTER TABLE IF EXISTS transactions ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'CLP';
ALTER TABLE IF EXISTS transactions ADD COLUMN IF NOT EXISTS checksum CHAR(64);
ALTER TABLE IF EXISTS transactions ADD COLUMN IF NOT EXISTS raw_data JSONB;
ALTER TABLE IF EXISTS transactions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;


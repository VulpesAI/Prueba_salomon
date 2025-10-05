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

-- =============================
-- Tablas principales de finanzas
-- =============================

-- Tabla de cuentas
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    external_id TEXT NOT NULL,
    name TEXT,
    type TEXT,
    institution TEXT,
    currency TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.accounts
    ADD COLUMN IF NOT EXISTS currency TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'accounts_user_external_unique'
    ) THEN
        ALTER TABLE public.accounts
            ADD CONSTRAINT accounts_user_external_unique UNIQUE (user_id, external_id);
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON public.accounts (user_id);

-- Tabla de estados de cuenta
CREATE TABLE IF NOT EXISTS public.statements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    raw_filename TEXT NOT NULL,
    mime_type TEXT,
    size BIGINT,
    status TEXT NOT NULL DEFAULT 'uploaded',
    processing_stage TEXT,
    progress NUMERIC(5,2),
    error_message TEXT,
    period_start DATE,
    period_end DATE,
    statement_date DATE,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    checksum TEXT,
    content_hash TEXT,
    totals_hash TEXT,
    dedupe_hash TEXT,
    total_debit NUMERIC(18,2) DEFAULT 0,
    total_credit NUMERIC(18,2) DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    opening_balance NUMERIC(18,2),
    closing_balance NUMERIC(18,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.statements
    ADD COLUMN IF NOT EXISTS processing_stage TEXT,
    ADD COLUMN IF NOT EXISTS period_start DATE,
    ADD COLUMN IF NOT EXISTS period_end DATE,
    ADD COLUMN IF NOT EXISTS statement_date DATE,
    ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS checksum TEXT,
    ADD COLUMN IF NOT EXISTS content_hash TEXT,
    ADD COLUMN IF NOT EXISTS totals_hash TEXT,
    ADD COLUMN IF NOT EXISTS dedupe_hash TEXT,
    ADD COLUMN IF NOT EXISTS total_debit NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_credit NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS transaction_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(18,2),
    ADD COLUMN IF NOT EXISTS closing_balance NUMERIC(18,2),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS statements_user_id_idx ON public.statements (user_id);
CREATE INDEX IF NOT EXISTS statements_statement_date_idx ON public.statements (statement_date);

-- Tabla de transacciones
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    statement_id UUID NOT NULL REFERENCES public.statements(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    posted_at DATE,
    description TEXT,
    raw_description TEXT,
    normalized_description TEXT,
    amount NUMERIC(18,2),
    currency TEXT,
    merchant TEXT,
    category TEXT,
    status TEXT,
    checksum TEXT,
    dedupe_hash TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS external_id TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT;

ALTER TABLE public.transactions
    ALTER COLUMN external_id DROP DEFAULT;

ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS raw_description TEXT,
    ADD COLUMN IF NOT EXISTS normalized_description TEXT,
    ADD COLUMN IF NOT EXISTS merchant TEXT,
    ADD COLUMN IF NOT EXISTS category TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT,
    ADD COLUMN IF NOT EXISTS checksum TEXT,
    ADD COLUMN IF NOT EXISTS dedupe_hash TEXT,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'transactions_statement_external_unique'
    ) THEN
        ALTER TABLE public.transactions
            ADD CONSTRAINT transactions_statement_external_unique UNIQUE (statement_id, external_id);
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS transactions_statement_id_idx ON public.transactions (statement_id);
CREATE INDEX IF NOT EXISTS transactions_posted_at_idx ON public.transactions (posted_at);

-- =====================================
-- Tablas auxiliares para clasificación
-- =====================================

CREATE TABLE IF NOT EXISTS public.classification_labels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    statement_id UUID REFERENCES public.statements(id) ON DELETE SET NULL,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    final_category TEXT,
    previous_category TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    metadata JSONB DEFAULT '{}'::jsonb,
    movement_id TEXT,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS classification_labels_status_idx ON public.classification_labels (status);

CREATE TABLE IF NOT EXISTS public.classification_model_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_version VARCHAR(64) NOT NULL,
    accuracy DOUBLE PRECISION,
    macro_f1 DOUBLE PRECISION,
    artifact_uri TEXT NOT NULL,
    metrics JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Verificar la configuración
\echo '✅ Base de datos configurada correctamente'
\echo '📊 Información de la base de datos:'
SELECT 
    current_database() as database_name,
    current_user as current_user,
    version() as postgresql_version;

\echo '🔧 Extensiones instaladas:'
SELECT extname as extension_name FROM pg_extension ORDER BY extname;

-- Seed data for Core API automated tests
INSERT INTO public.accounts (id, user_id, external_id, name, type, institution, currency)
VALUES (
    '11111111-1111-4111-8111-111111111111',
    'seed-user-demo',
    'demo-account-001',
    'Cuenta Demo',
    'checking',
    'Banco Salomon',
    'CLP'
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    type = EXCLUDED.type,
    institution = EXCLUDED.institution,
    currency = EXCLUDED.currency;

INSERT INTO public.statements (
    id,
    user_id,
    account_id,
    storage_path,
    raw_filename,
    mime_type,
    size,
    status,
    progress,
    period_start,
    period_end,
    statement_date,
    uploaded_at,
    checksum,
    total_debit,
    total_credit,
    transaction_count,
    content_hash,
    totals_hash,
    dedupe_hash
)
VALUES (
    '22222222-2222-4222-8222-222222222222',
    'seed-user-demo',
    '11111111-1111-4111-8111-111111111111',
    'statements/seed-user-demo/statement.pdf',
    'statement.pdf',
    'application/pdf',
    102400,
    'processed',
    100,
    '2024-04-01',
    '2024-04-30',
    '2024-04-30',
    NOW(),
    'checksum-demo-001',
    350000.00,
    420000.00,
    3,
    'content-hash-demo-001',
    'totals-hash-demo-001',
    'dedupe-statement-demo-001'
)
ON CONFLICT (id) DO UPDATE
SET status = EXCLUDED.status,
    progress = EXCLUDED.progress,
    period_start = EXCLUDED.period_start,
    period_end = EXCLUDED.period_end,
    statement_date = EXCLUDED.statement_date,
    checksum = EXCLUDED.checksum,
    total_debit = EXCLUDED.total_debit,
    total_credit = EXCLUDED.total_credit,
    transaction_count = EXCLUDED.transaction_count,
    content_hash = EXCLUDED.content_hash,
    totals_hash = EXCLUDED.totals_hash,
    dedupe_hash = EXCLUDED.dedupe_hash;

INSERT INTO public.transactions (
    id,
    statement_id,
    external_id,
    posted_at,
    description,
    normalized_description,
    amount,
    currency,
    merchant,
    category,
    checksum,
    dedupe_hash
)
VALUES
    (
        '33333333-3333-4333-8333-333333333333',
        '22222222-2222-4222-8222-222222222222',
        'txn-ext-001',
        '2024-04-05',
        'Supermercado Jumbo',
        'supermercado jumbo',
        -45990.00,
        'CLP',
        'Jumbo',
        'Groceries',
        'checksum-001',
        'dedupe-001'
    ),
    (
        '44444444-4444-4444-8444-444444444444',
        '22222222-2222-4222-8222-222222222222',
        'txn-ext-002',
        '2024-04-12',
        'Pago tarjeta crédito',
        'pago tarjeta credito',
        -120000.00,
        'CLP',
        'Banco Salomon',
        'Debt Payments',
        'checksum-002',
        'dedupe-002'
    ),
    (
        '55555555-5555-4555-8555-555555555555',
        '22222222-2222-4222-8222-222222222222',
        'txn-ext-003',
        '2024-04-25',
        'Sueldo',
        'sueldo',
        420000.00,
        'CLP',
        'Empresa Demo',
        'Income',
        'checksum-003',
        'dedupe-003'
    )
ON CONFLICT (statement_id, external_id) DO UPDATE
SET description = EXCLUDED.description,
    normalized_description = EXCLUDED.normalized_description,
    amount = EXCLUDED.amount,
    merchant = EXCLUDED.merchant,
    category = EXCLUDED.category,
    checksum = EXCLUDED.checksum,
    dedupe_hash = EXCLUDED.dedupe_hash;

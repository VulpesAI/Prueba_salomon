-- Seed data for training engine automated tests
INSERT INTO public.classification_labels (
    id,
    user_id,
    statement_id,
    transaction_id,
    description,
    final_category,
    previous_category,
    notes,
    status,
    metadata,
    movement_id,
    accepted_at
)
VALUES
    (
        '66666666-6666-4666-8666-666666666666',
        'seed-user-demo',
        '22222222-2222-4222-8222-222222222222',
        '33333333-3333-4333-8333-333333333333',
        'Supermercado Jumbo',
        'Groceries',
        NULL,
        'Compra habitual de alimentos',
        'APPROVED',
        '{"confidence":0.92}'::jsonb,
        'mov-001',
        NOW()
    ),
    (
        '77777777-7777-4777-8777-777777777777',
        'seed-user-demo',
        '22222222-2222-4222-8222-222222222222',
        '44444444-4444-4444-8444-444444444444',
        'Pago tarjeta crédito',
        'Debt Payments',
        'Credit Card',
        'Pago mensual de tarjeta',
        'USED',
        '{"confidence":0.88,"reviewed":true}'::jsonb,
        'mov-002',
        NOW()
    ),
    (
        '88888888-8888-4888-8888-888888888888',
        'seed-user-demo',
        '22222222-2222-4222-8222-222222222222',
        '55555555-5555-4555-8555-555555555555',
        'Sueldo',
        'Income',
        NULL,
        'Ingreso mensual',
        'QUEUED',
        '{"confidence":0.95}'::jsonb,
        'mov-003',
        NOW()
    )
ON CONFLICT (id) DO UPDATE
SET final_category = EXCLUDED.final_category,
    notes = EXCLUDED.notes,
    status = EXCLUDED.status,
    metadata = EXCLUDED.metadata,
    accepted_at = EXCLUDED.accepted_at;

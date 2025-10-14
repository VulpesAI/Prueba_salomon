import request from 'supertest';
import { describe, it, expect } from 'vitest';

const API = process.env.API_URL || 'http://localhost:3000';

describe('Auth + RLS', () => {
  it('401 sin token', async () => {
    await request(API).get('/dashboard/resumen').expect(401);
  });

  it('200 con token (mockea un JWT válido si no tienes de Supabase)', async () => {
    const token = process.env.TEST_JWT!;
    if (!token) return;
    const res = await request(API)
      .get('/dashboard/resumen')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).toHaveProperty('incomes');
  });
});

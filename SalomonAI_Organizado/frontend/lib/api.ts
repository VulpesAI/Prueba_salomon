const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type HttpMethod = 'GET' | 'POST';

async function request<T>(path: string, method: HttpMethod, options: { body?: unknown; token?: string } = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_URL}/api/${path}`, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    const message = errorPayload?.message || response.statusText;
    throw new Error(typeof message === 'string' ? message : Array.isArray(message) ? message.join(', ') : 'Error desconocido');
  }

  return response.json();
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export function registerUser(payload: RegisterPayload) {
  return request<{ id: string; email: string }>('auth/register', 'POST', { body: payload });
}

export function loginUser(payload: LoginPayload) {
  return request<{ access_token: string }>('auth/login', 'POST', { body: payload });
}

export interface BelvoInstitution {
  id: string;
  name: string;
  type: string;
  logo?: string;
  website?: string;
  primaryColor?: string;
}

export function fetchInstitutions(token: string) {
  return request<{ institutions: BelvoInstitution[] }>('belvo/institutions', 'GET', { token });
}

export function createConnection(token: string, payload: { institution: string; username: string; password: string }) {
  return request<{ connection: { id: string } }>('belvo/connections', 'POST', { token, body: payload });
}

export function fetchConnections(token: string) {
  return request<{ connections: Array<{ id: string; institutionName: string; status: string; lastSyncAt: string | null; isHealthy: boolean }> }>(
    'belvo/connections',
    'GET',
    { token },
  );
}

export function fetchDashboardSummary(token: string) {
  return request<{
    summary: { totalIncome: number; totalExpenses: number; balance: number; transactionCount: number };
    categories: Record<string, { total: number; count: number; type: 'income' | 'expense' }>;
    trends: Array<{ week: string; income: number; expenses: number; transactions: number }>;
    recentTransactions: Array<{ id: string; description: string; amount: number; category: string; date: string; currency: string }>;
  }>('dashboard/summary', 'GET', { token });
}

export function fetchDashboardMovements(token: string) {
  return request<{
    movements: Array<{ id: string; description: string; amount: number; category: string; date: string; currency: string; type: string }>;
    pagination: { total: number };
  }>('dashboard/movements', 'GET', { token });
}

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const API_PREFIX = (process.env.NEXT_PUBLIC_API_PREFIX ?? '/api/v1').replace(/\/?$/, '');

export const API_URL = `${API_BASE_URL}${API_PREFIX.startsWith('/') ? '' : '/'}${API_PREFIX}`;

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(status: number, message: string | string[] = 'Error en la solicitud', details?: unknown) {
    const normalizedMessage = Array.isArray(message) ? message.join('\n') : message;
    super(normalizedMessage);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export interface ApiRequestOptions extends RequestInit {
  token?: string | null;
  parseJson?: boolean;
}

const buildUrl = (path: string) => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

export async function apiRequest<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { token, headers, body, parseJson = true, ...rest } = options;
  const url = buildUrl(path);

  const requestInit: RequestInit = {
    method: rest.method ?? 'GET',
    cache: rest.cache ?? 'no-store',
    credentials: rest.credentials ?? 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    },
    ...rest,
  };

  if (token) {
    (requestInit.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  if (body !== undefined) {
    requestInit.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const response = await fetch(url, requestInit);

  if (!response.ok) {
    let errorPayload: unknown = null;
    let errorMessage: string | string[] | undefined;

    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        errorPayload = await response.json();
        if (typeof errorPayload === 'object' && errorPayload !== null) {
          const payload = errorPayload as { message?: string | string[] };
          errorMessage = payload.message;
        }
      } else {
        errorPayload = await response.text();
        if (typeof errorPayload === 'string' && errorPayload.trim().length > 0) {
          errorMessage = errorPayload;
        }
      }
    } catch (parseError) {
      errorPayload = parseError;
    }

    throw new ApiError(response.status, errorMessage ?? 'Error en la solicitud al servidor', errorPayload);
  }

  if (!parseJson) {
    return (await response.text()) as unknown as T;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return (await response.text()) as unknown as T;
}

import { z } from "zod";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_BASE) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL is not defined");
}

export async function authHeader(): Promise<Record<string, string>> {
  const token = typeof window !== "undefined" ? sessionStorage.getItem("jwt") ?? "" : "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response, path: string, schema: z.ZodType<T>) {
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} for ${path}`);
  }
  const json = await res.json();
  return schema.parse(json);
}

export async function apiGet<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      ...(await authHeader()),
    },
    cache: "no-store",
  });
  return handleResponse(res, path, schema);
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeader()),
      ...init?.headers,
    },
    body: JSON.stringify(body),
    signal: init?.signal,
  });
  return handleResponse(res, path, schema);
}

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  nextPage: number | null;
};

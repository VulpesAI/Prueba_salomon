const PUBLIC_API = process.env.NEXT_PUBLIC_API_BASE_URL;
export const API_BASE =
  typeof window !== "undefined" && !PUBLIC_API ? "" : PUBLIC_API ?? "";

export async function authHeader() {
  if (typeof window === "undefined") {
    return {} as Record<string, string>;
  }

  const token = sessionStorage.getItem("jwt") ?? "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      ...(await authHeader()),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`${res.status}`);
  }

  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeader()),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`${res.status}`);
  }

  return res.json();
}

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  nextPage: number | null;
};

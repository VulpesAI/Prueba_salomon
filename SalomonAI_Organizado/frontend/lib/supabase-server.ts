import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL/ANON_KEY en el servidor");

  const store = cookies();
  return createServerClient(url, anon, {
    cookies: {
      get: (name: string) => store.get(name)?.value,
      set: (name: string, value: string, options: CookieOptions) =>
        store.set({ name, value, ...options }),
      remove: (name: string, options: CookieOptions) =>
        store.set({ name, value: "", ...options, maxAge: 0 }),
    },
  });
}

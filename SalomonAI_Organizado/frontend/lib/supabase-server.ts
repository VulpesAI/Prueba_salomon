import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) throw new Error("Supabase ENV faltantes en el servidor");

  const store = await cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll: () =>
        store
          .getAll()
          .map(({ name, value }) => ({ name, value })),
      setAll: (cookies) => {
        cookies.forEach(({ name, value, options }) => {
          store.set({ name, value, ...options });
        });
      },
    },
  });
}

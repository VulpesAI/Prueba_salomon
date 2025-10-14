import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL/ANON_KEY en el servidor");

  const store = await cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll: () =>
        store
          .getAll()
          .map((cookie) => ({ name: cookie.name, value: cookie.value })),
      setAll: (cookiesWithOptions) => {
        cookiesWithOptions.forEach(({ name, value, options }) => {
          store.set({ name, value, ...(options ?? {}) });
        });
      },
    },
  });
}

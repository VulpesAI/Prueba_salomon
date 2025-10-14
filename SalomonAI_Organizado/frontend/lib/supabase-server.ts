import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ENV, assertClientEnv } from "./env";

export function supabaseServer() {
  assertClientEnv();
  const store = cookies() as unknown as Awaited<ReturnType<typeof cookies>>;
  return createServerClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => {
        const all = store.getAll();
        return all?.map(({ name, value }) => ({ name, value })) ?? [];
      },
      setAll: (cookieList) => {
        cookieList.forEach(({ name, value, options }) => {
          store.set({ name, value, ...options });
        });
      },
    },
  });
}

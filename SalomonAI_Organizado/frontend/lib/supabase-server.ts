import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ENV, hasClientEnv } from "./env";

export async function supabaseServer() {
  if (!hasClientEnv()) throw new Error("Missing public Supabase ENV");
  const store = await cookies();
  return createServerClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
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

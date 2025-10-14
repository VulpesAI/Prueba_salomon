import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ENV, assertSupabaseEnv } from "./env";

export async function supabaseServer() {
  assertSupabaseEnv();
  const store = await cookies();
  return createServerClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return store.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        store.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        if (typeof store.delete === "function") {
          store.delete({ name, ...options });
        } else {
          store.set({ name, value: "", ...options, maxAge: 0 });
        }
      },
    },
  });
}

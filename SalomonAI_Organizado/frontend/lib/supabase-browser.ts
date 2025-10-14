"use client";
import { createBrowserClient } from "@supabase/ssr";
import { ENV, assertClientEnv } from "./env";

export function supabaseBrowser() {
  assertClientEnv();
  return createBrowserClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY);
}

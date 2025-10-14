"use client";
import { createBrowserClient } from "@supabase/ssr";
import { ENV, assertSupabaseEnv } from "./env";

export function supabaseBrowser() {
  assertSupabaseEnv();
  return createBrowserClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY);
}

"use client";
import { createBrowserClient } from "@supabase/ssr";
import { ENV, hasClientEnv } from "./env";

export function supabaseBrowser() {
  if (!hasClientEnv()) throw new Error("Missing public Supabase ENV");
  return createBrowserClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY);
}

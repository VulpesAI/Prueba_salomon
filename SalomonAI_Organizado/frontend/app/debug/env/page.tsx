"use client";
import { ENV, hasClientEnv } from "@/lib/env";

export default function DebugEnv() {
  return (
    <pre className="p-6 text-sm text-slate-200 bg-slate-900 min-h-screen">
      {JSON.stringify(
        {
          clientSees: hasClientEnv(),
          urlLen: ENV.SUPABASE_URL?.length ?? 0,
          anonKeyLen: ENV.SUPABASE_ANON_KEY?.length ?? 0,
        },
        null,
        2,
      )}
    </pre>
  );
}

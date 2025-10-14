"use client";
import { ENV } from "@/lib/env";

export default function EnvGuard({ children }: { children: React.ReactNode }) {
  const ok = Boolean(ENV.SUPABASE_URL && ENV.SUPABASE_ANON_KEY);
  if (!ok) {
    return (
      <main className="min-h-screen grid place-items-center bg-slate-900 text-slate-100 p-6">
        <div className="max-w-lg text-center space-y-4">
          <h1 className="text-2xl font-semibold">Algo falló</h1>
          <p className="text-sm opacity-80">
            Configura <code>NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> para continuar.
          </p>
          <button onClick={() => location.reload()} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700">
            Reintentar
          </button>
        </div>
      </main>
    );
  }
  return <>{children}</>;
}

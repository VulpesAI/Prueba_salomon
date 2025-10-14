"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="max-w-xl">
        <h1 className="text-2xl font-semibold mb-2">Ocurrió un error en la interfaz</h1>
        <pre className="text-sm whitespace-pre-wrap p-3 rounded bg-slate-100">{error.message}</pre>
        <button className="mt-4 px-4 py-2 rounded bg-blue-600 text-white" onClick={() => reset()}>
          Reintentar
        </button>
      </div>
    </main>
  );
}

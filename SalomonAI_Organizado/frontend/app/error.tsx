"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-background p-6 text-foreground">
        <h1 className="text-xl font-semibold">Ocurrió un error</h1>
        <p className="mt-2 text-sm opacity-80">{error.message}</p>
        <button
          type="button"
          className="mt-4 rounded bg-blue-600 px-3 py-2 text-white"
          onClick={() => reset()}
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}

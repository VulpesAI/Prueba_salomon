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
      <body className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <div className="max-w-lg space-y-4 text-center">
          <h2 className="text-2xl font-semibold">Algo falló</h2>
          <pre className="overflow-auto rounded-md bg-muted p-4 text-left text-sm whitespace-pre-wrap">
            {error.message}
          </pre>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            onClick={() => reset()}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}

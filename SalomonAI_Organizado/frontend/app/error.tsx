"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="flex min-h-96 flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Ocurrió un error en la interfaz</h1>
      <pre className="rounded-md bg-muted p-4 text-sm whitespace-pre-wrap">
        {error.message}
      </pre>
      <button
        type="button"
        className="inline-flex w-fit items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        onClick={() => reset()}
      >
        Reintentar
      </button>
    </main>
  );
}

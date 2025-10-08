export function KpiSkeleton() {
  return <div className="h-24 rounded-2xl bg-muted/50 animate-pulse" />;
}

export function ChartSkeleton() {
  return <div className="h-60 rounded-2xl bg-muted/50 animate-pulse" />;
}

type ErrorStateProps = {
  onRetry: () => void;
};

export function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <div className="rounded-2xl border bg-card p-6 text-sm shadow-sm">
      <div className="font-medium">No pudimos cargar los datos.</div>
      <button
        type="button"
        className="mt-4 rounded bg-blue-600 px-3 py-2 text-white"
        onClick={onRetry}
      >
        Reintentar
      </button>
    </div>
  );
}

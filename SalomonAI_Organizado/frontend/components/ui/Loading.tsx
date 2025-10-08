"use client";

interface LoadingProps {
  label?: string;
}

export function Loading({ label = "Cargando…" }: LoadingProps) {
  return (
    <div className="flex items-center gap-3 text-text-muted">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-text-muted/40 border-t-accent" />
      <span className="text-[14px]">{label}</span>
    </div>
  );
}

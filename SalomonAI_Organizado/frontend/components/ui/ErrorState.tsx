"use client";

import { Button } from "@/components/ui-demo/button";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = "No se pudo cargar.", onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border bg-[var(--bg-muted)] p-4">
      <div className="text-[14px] text-negative">{message}</div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  );
}

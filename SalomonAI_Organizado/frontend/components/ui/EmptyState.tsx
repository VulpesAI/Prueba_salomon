"use client";

import { Button } from "./Button";

interface EmptyStateProps {
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function EmptyState({
  title = "No hay datos",
  subtitle = "Aún no registras información.",
  ctaLabel,
  onCta,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border bg-[var(--bg-muted)] p-6">
      <h3 className="text-[16px] font-medium text-text">{title}</h3>
      <p className="text-[14px] text-text-muted">{subtitle}</p>
      {ctaLabel && onCta && (
        <div className="pt-2">
          <Button onClick={onCta}>{ctaLabel}</Button>
        </div>
      )}
    </div>
  );
}

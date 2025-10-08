"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";

import Evidence from "./Evidence";
import { Recommendation } from "@/types/recommendations";

export default function RecommendationCard({
  r,
  onUseful,
  onNotUseful,
  disabled,
}: {
  r: Recommendation;
  onUseful: () => void;
  onNotUseful: () => void;
  disabled?: boolean;
}) {
  const chipClass =
    r.priority === "HIGH"
      ? "bg-red-600/10 text-red-600 dark:text-red-400"
      : r.priority === "MEDIUM"
        ? "bg-amber-600/10 text-amber-600 dark:text-amber-400"
        : "bg-green-600/10 text-green-600 dark:text-green-400";

  return (
    <article className="space-y-3 rounded-card border border-soft bg-gradient-card p-4 text-surface">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-surface">{r.title}</h3>
          <p className="text-sm text-muted">{r.description}</p>
        </div>
        <span className={`text-xs font-medium uppercase tracking-wide ${chipClass} rounded-full px-2 py-1`}>
          {r.priority === "HIGH" ? "Alta" : r.priority === "MEDIUM" ? "Media" : "Baja"}
        </span>
      </div>

      <Evidence items={r.evidence ?? []} />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-soft bg-[rgba(8,17,52,0.06)] px-3 text-sm font-medium text-surface transition-colors hover:bg-[rgba(8,17,52,0.1)] focus-brand disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[rgba(255,255,255,0.06)] dark:hover:bg-[rgba(255,255,255,0.1)]"
          onClick={onUseful}
          disabled={disabled}
          aria-label="Marcar recomendación como útil"
        >
          <ThumbsUp className="h-4 w-4 text-[color:var(--accent)]" />
          <span>Útil</span>
        </button>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-soft bg-[rgba(8,17,52,0.06)] px-3 text-sm font-medium text-surface transition-colors hover:bg-[rgba(8,17,52,0.1)] focus-brand disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[rgba(255,255,255,0.06)] dark:hover:bg-[rgba(255,255,255,0.1)]"
          onClick={onNotUseful}
          disabled={disabled}
          aria-label="Marcar recomendación como no útil"
        >
          <ThumbsDown className="h-4 w-4 text-[color:var(--error)]" />
          <span>No útil</span>
        </button>
      </div>
    </article>
  );
}

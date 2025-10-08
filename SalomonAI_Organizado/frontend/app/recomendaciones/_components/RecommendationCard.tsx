"use client";

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
    <article className="space-y-3 rounded-xl border border-border bg-card/70 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">{r.title}</h3>
          <p className="text-sm text-muted-foreground">{r.description}</p>
        </div>
        <span className={`text-xs font-medium uppercase tracking-wide ${chipClass} rounded-full px-2 py-1`}>
          {r.priority === "HIGH" ? "Alta" : r.priority === "MEDIUM" ? "Media" : "Baja"}
        </span>
      </div>

      <Evidence items={r.evidence ?? []} />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="h-9 rounded-md bg-green-600 px-3 text-sm font-medium text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 disabled:opacity-50 disabled:hover:opacity-50"
          onClick={onUseful}
          disabled={disabled}
          aria-label="Marcar recomendación como útil"
        >
          👍 Útil
        </button>
        <button
          type="button"
          className="h-9 rounded-md bg-red-600 px-3 text-sm font-medium text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500 disabled:opacity-50 disabled:hover:opacity-50"
          onClick={onNotUseful}
          disabled={disabled}
          aria-label="Marcar recomendación como no útil"
        >
          👎 No útil
        </button>
      </div>
    </article>
  );
}

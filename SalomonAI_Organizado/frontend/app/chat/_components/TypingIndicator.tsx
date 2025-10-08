export default function TypingIndicator() {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border border-soft bg-[rgba(8,17,52,0.06)] px-2 py-1 text-xs text-muted transition-colors dark:bg-[rgba(255,255,255,0.06)]"
      role="status"
      aria-live="polite"
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--brand)]" />
      escribiendo…
    </div>
  );
}

import type { Insight } from "@/hooks/useDashboardOverview";

type InsightsProps = {
  items: Insight[];
};

export function Insights({ items }: InsightsProps) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((insight, index) => (
        <div key={`${insight.text}-${index}`} className="rounded-xl border bg-card p-3 text-sm shadow-sm">
          {insight.text}
        </div>
      ))}
    </div>
  );
}

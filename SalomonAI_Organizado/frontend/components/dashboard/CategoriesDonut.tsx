import type { CategoryItem } from "@/hooks/useDashboardOverview";
import { formatCLP } from "@/lib/currency";

import { CategoriesDonut as CategoriesDonutChart } from "../charts/CategoriesDonut";

type CategoriesDonutProps = {
  data: CategoryItem[];
};

export function CategoriesDonut({ data }: CategoriesDonutProps) {
  return (
    <div className="grid gap-6 rounded-2xl border bg-card p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_260px]">
      <div>
        <h3 className="text-lg font-semibold">Top categorías</h3>
        <p className="text-xs text-muted-foreground">Distribución de gastos principales.</p>
        <div className="mt-4">
          <CategoriesDonutChart data={data} />
        </div>
      </div>
      <div className="space-y-3">
        {data.map((category) => (
          <div key={category.name} className="rounded-xl border bg-background/40 p-3">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>{category.name}</span>
              <span>{formatCLP(category.amount)}</span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{ width: `${Math.min(100, Math.max(0, category.percent))}%` }}
              />
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{category.percent.toFixed(1)}% del total</div>
          </div>
        ))}
      </div>
    </div>
  );
}

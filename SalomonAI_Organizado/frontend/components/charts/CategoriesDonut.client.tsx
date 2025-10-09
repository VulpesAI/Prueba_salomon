"use client";

import type { TooltipProps } from "recharts";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { CategoryItem } from "@/hooks/useDashboardOverview";
import { formatCurrencyCLP } from "@/lib/formatters";
import { getCategoryColor } from "@/lib/ui/palette";

type CategoriesDonutProps = {
  data: CategoryItem[];
};

const tooltipFormatter: TooltipProps<number, string>["formatter"] = (value, name) => {
  if (typeof value !== "number") return [value, name];
  return [formatCurrencyCLP(value), name];
};

export default function CategoriesDonut({ data }: CategoriesDonutProps) {
  const pieData = data.map((item) => ({
    ...item,
    fill: getCategoryColor(item.name),
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={pieData}
            dataKey="amount"
            nameKey="name"
            innerRadius="55%"
            outerRadius="85%"
            stroke="var(--bg)"
            strokeWidth={2}
          >
            {pieData.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            formatter={tooltipFormatter}
            cursor={{ fill: "transparent" }}
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid color-mix(in srgb, var(--border-color) 60%, transparent)",
              backgroundColor: "var(--card-surface)",
              color: "var(--text)",
              boxShadow: "0 20px 50px -30px color-mix(in srgb, var(--border-color) 40%, transparent)",
            }}
            wrapperStyle={{ outline: "none" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

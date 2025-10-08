"use client";

import type { TooltipProps } from "recharts";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { CategoryItem } from "@/hooks/useDashboardOverview";
import { formatCLP } from "@/lib/currency";

const COLORS = ["#38bdf8", "#22c55e", "#a855f7", "#f97316", "#ef4444"];

type CategoriesDonutProps = {
  data: CategoryItem[];
};

const tooltipFormatter: TooltipProps<number, string>["formatter"] = (value, name) => {
  if (typeof value !== "number") return [value, name];
  return [formatCLP(value), name];
};

export default function CategoriesDonut({ data }: CategoriesDonutProps) {
  const pieData = data.map((item, index) => ({
    ...item,
    fill: COLORS[index % COLORS.length],
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
            strokeWidth={3}
          >
            {pieData.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip formatter={tooltipFormatter} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

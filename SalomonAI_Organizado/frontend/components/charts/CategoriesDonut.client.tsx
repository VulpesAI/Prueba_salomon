"use client";

import type { TooltipProps } from "recharts";
import { useMemo } from "react";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { CategoryItem } from "@/hooks/useDashboardOverview";
import { formatCLP } from "@/lib/formatters";
import { getCategoryColor } from "@/lib/ui/palette";
import { getChartVars } from "@/lib/chartTheme";

type CategoriesDonutProps = {
  data: CategoryItem[];
};

const tooltipFormatter: TooltipProps<number, string>["formatter"] = (value, name) => {
  if (typeof value !== "number") return [value, name];
  return [formatCLP(value), name];
};

export default function CategoriesDonut({ data }: CategoriesDonutProps) {
  const pieData = data.map((item) => ({
    ...item,
    fill: getCategoryColor(item.name),
  }));
  const vars = useMemo(() => getChartVars(), []);

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
            stroke={vars.CARD}
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
              background: vars.CARD,
              borderColor: vars.BORDER,
              borderRadius: "12px",
              color: vars.TEXT,
            }}
            labelStyle={{ color: vars.TEXT }}
            itemStyle={{ color: vars.TEXT }}
            wrapperStyle={{ outline: "none" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

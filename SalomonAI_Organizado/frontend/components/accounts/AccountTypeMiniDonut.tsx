"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, type TooltipProps } from "recharts";

import { formatCLP } from "@/lib/currency";
import { ACCOUNT_COLOR_VARS, colorFromVar } from "@/lib/ui/account-colors";
import type { AccountTypeSummary } from "@/services/accounts";

const LABELS: Record<keyof typeof ACCOUNT_COLOR_VARS, string> = {
  checking: "Cuentas corrientes",
  savings: "Ahorro",
  credit: "Crédito",
  investment: "Inversión",
};

type Slice = {
  key: keyof typeof ACCOUNT_COLOR_VARS;
  label: string;
  value: number;
  colorVar: string;
};

function LegendMini({ data }: { data: Slice[] }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
      {data.map((slice) => (
        <div key={slice.key} className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: colorFromVar(slice.colorVar) }}
            />
            {slice.label}
          </span>
          <span className="tabular-nums">{formatCLP(slice.value)}</span>
        </div>
      ))}
    </div>
  );
}

function MiniTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const slice = entry?.payload as Slice | undefined;
  if (!slice) return null;

  return (
    <div className="rounded-md border bg-popover px-2 py-1 text-xs shadow">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: colorFromVar(slice.colorVar) }}
        />
        <span>{slice.label}</span>
        <span className="ml-2 font-medium tabular-nums">{formatCLP(slice.value)}</span>
      </div>
    </div>
  );
}

export function AccountTypeMiniDonut({ data }: { data: AccountTypeSummary[] }) {
  const slices: Slice[] = data
    .filter((item) => item.accounts > 0 && Math.abs(item.balance) > 0)
    .map((item) => {
      const key = item.type as keyof typeof ACCOUNT_COLOR_VARS;
      const colorVar = ACCOUNT_COLOR_VARS[key] ?? ACCOUNT_COLOR_VARS.checking;
      return {
        key,
        label: item.label || LABELS[key],
        value: Math.abs(item.balance),
        colorVar,
      } satisfies Slice;
    });

  if (!slices.length) {
    return <p className="text-xs text-muted-foreground">Aún no hay datos suficientes.</p>;
  }

  return (
    <div className="w-full">
      <div className="h-40 w-full">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              stroke="#fff"
              strokeWidth={5}
              isAnimationActive={false}
            >
              {slices.map((slice) => (
                <Cell key={slice.key} fill={colorFromVar(slice.colorVar)} />
              ))}
            </Pie>
            <Tooltip content={<MiniTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <LegendMini data={slices} />
    </div>
  );
}

export type InsightKPI = {
  label: string;
  amount: number;
  delta: number;
  kind: "ingresos" | "gastos" | "neto";
};

export type InsightTrend = {
  category: string;
  amount: number;
  pct: number;
};

export type InsightHistory = {
  x: string;
  checking?: number;
  savings?: number;
  credit?: number;
  investment?: number;
};

export type InsightRecommendation = {
  title: string;
  body: string;
  icon?: string;
};

export type InsightDTO = {
  kpis: InsightKPI[];
  topCategories: InsightTrend[];
  history: InsightHistory[];
  recommendations: InsightRecommendation[];
  updatedAt: string;
};

export type InsightRange = "today" | "7d" | "30d" | "ytd";

export const INSIGHT_RANGE_OPTIONS: Array<{ value: InsightRange; label: string }> = [
  { value: "today", label: "Hoy" },
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
  { value: "ytd", label: "Este año" },
];

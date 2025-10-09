import { z } from "zod";

export const InsightRangeSchema = z.enum(["today", "7d", "30d", "ytd"]);

export const InsightKpiSchema = z.object({
  label: z.string(),
  amount: z.number(),
  delta: z.number(),
  kind: z.enum(["ingresos", "gastos", "neto"]),
});

export const InsightTrendSchema = z.object({
  category: z.string(),
  amount: z.number(),
  pct: z.number(),
});

export const InsightHistorySchema = z.object({
  x: z.string(),
  checking: z.number().optional(),
  savings: z.number().optional(),
  credit: z.number().optional(),
  investment: z.number().optional(),
});

export const InsightRecommendationSchema = z.object({
  title: z.string(),
  body: z.string(),
  icon: z.string().optional(),
});

export const InsightSchema = z.object({
  kpis: z.array(InsightKpiSchema),
  topCategories: z.array(InsightTrendSchema),
  history: z.array(InsightHistorySchema),
  recommendations: z.array(InsightRecommendationSchema),
  updatedAt: z.string(),
});

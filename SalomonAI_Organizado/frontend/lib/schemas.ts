import { z } from "zod";

const TopCategory = z.object({
  name: z.string(),
  amount: z.number(),
});

export const ResumenResp = z
  .object({
    income_total: z.number(),
    expense_total: z.number(),
    net_cashflow: z.number(),
    top_categories: z.array(TopCategory).optional(),
  })
  .passthrough();
export type TResumenResp = z.infer<typeof ResumenResp>;

export const DashboardResumen = ResumenResp.extend({
  top_categories: z.array(TopCategory),
});
export type TDashboardResumen = z.infer<typeof DashboardResumen>;

export const ForecastResp = z
  .object({
    model_type: z.string(),
    calculated_at: z.string(),
    series: z.array(
      z.object({
        date: z.string(),
        value: z.number(),
      }),
    ),
  })
  .passthrough();
export type TForecastResp = z.infer<typeof ForecastResp>;

export const DashboardProyeccion = ForecastResp;
export type TDashboardProyeccion = TForecastResp;

export const Movimiento = z.object({
  id: z.string(),
  user_id: z.string(),
  amount: z.number(),
  currency: z.string(),
  date: z.string(),
  category: z.string(),
  subcategory: z.string().nullable(),
  description: z.string().nullable(),
  merchant: z.string().nullable(),
});

export const MovimientosPage = z.object({
  items: z.array(Movimiento),
  page: z.number(),
  nextPage: z.number().nullable(),
});
export type TMovimientosPage = z.infer<typeof MovimientosPage>;

export const ChatReply = z.object({
  reply: z.string(),
});
export type TChatReply = z.infer<typeof ChatReply>;

export const RecoItem = z.object({
  id: z.string(),
  title: z.string(),
  message: z.string(),
  priority: z.number(),
  score: z.number().optional(),
  evidence: z.record(z.unknown()).optional(),
});

export const RecoResp = z.object({
  user_id: z.string(),
  items: z.array(RecoItem),
  meta: z.object({ count: z.number() }),
});
export type TRecoResp = z.infer<typeof RecoResp>;

export const STTOut = z.object({
  text: z.string(),
  language: z.string(),
  provider: z.string(),
});
export type TSTTOut = z.infer<typeof STTOut>;

export const TTSOut = z.object({
  mime: z.string(),
  audio_base64: z.string(),
  provider: z.string(),
});
export type TTTSOut = z.infer<typeof TTSOut>;

export const StatementUploadResp = z.object({
  statement_id: z.string(),
  status: z.enum(["queued", "processing", "processed", "failed"]).optional(),
});
export type TStatementUploadResp = z.infer<typeof StatementUploadResp>;

export const StatementStatus = z.object({
  statement_id: z.string(),
  status: z.enum(["queued", "processing", "processed", "failed"]),
  bank: z.string().nullable(),
  period: z.string().nullable(),
  error: z.string().nullable(),
});
export type TStatementStatus = z.infer<typeof StatementStatus>;

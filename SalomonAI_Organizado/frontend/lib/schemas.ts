import { z } from "zod";

export const DashboardResumen = z.object({
  income_total: z.number(),
  expense_total: z.number(),
  net_cashflow: z.number(),
  top_categories: z.array(
    z.object({
      name: z.string(),
      amount: z.number(),
    }),
  ),
});
export type TDashboardResumen = z.infer<typeof DashboardResumen>;

export const DashboardProyeccion = z.object({
  model_type: z.string(),
  calculated_at: z.string(),
  series: z.array(
    z.object({
      date: z.string(),
      value: z.number(),
    }),
  ),
});
export type TDashboardProyeccion = z.infer<typeof DashboardProyeccion>;

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
  evidence: z.record(z.unknown()).optional(),
});

export const RecoResponse = z.object({
  user_id: z.string(),
  items: z.array(RecoItem),
  meta: z.object({ count: z.number() }),
});
export type TRecoResponse = z.infer<typeof RecoResponse>;

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

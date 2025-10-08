import { z } from 'zod';

export const SettingsSchema = z.object({
  voice: z.enum(['alloy', 'ash', 'nova']),
  theme: z.enum(['dark', 'light']),
  language: z.string().min(2), // 'es-CL', 'en-US', etc.
  timeZone: z.string().min(2), // 'America/Santiago'
  currency: z.literal('CLP'),
  updatedAt: z.string().datetime()
});

export type SettingsDTO = z.infer<typeof SettingsSchema>;

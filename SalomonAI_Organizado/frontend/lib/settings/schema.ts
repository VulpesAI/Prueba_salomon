import { z } from 'zod';

export const SettingsSchema = z.object({
  voice: z.enum(['alloy', 'ash', 'nova']),
  theme: z.enum(['dark', 'light']),
  updatedAt: z.string().datetime()
});

export type SettingsDTO = z.infer<typeof SettingsSchema>;

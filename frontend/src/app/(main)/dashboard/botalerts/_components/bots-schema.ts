import { z } from "zod";

export const botSchema = z.object({
  id: z.number(),
  bot_name: z.string(),
  display_name: z.string(),
  description: z.string().nullable().optional(),
  price: z.number().default(0),
  thumbnail: z.string().nullable().optional(),
  token_env: z.string(),
  telegram_id: z.string().nullable().optional(),
  status: z.string().default("active"),
  created_at: z.string(),
  updated_at: z.string(),
});

export type BotRow = z.infer<typeof botSchema>;

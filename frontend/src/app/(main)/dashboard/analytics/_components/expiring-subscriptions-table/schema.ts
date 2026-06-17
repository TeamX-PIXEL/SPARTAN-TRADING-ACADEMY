import { z } from "zod";

export const expiringSubscriptionSchema = z.object({
  id: z.string(),
  user: z.string(),
  telegramId: z.string(),
  model: z.string(),
  expiry: z.string(),
  daysRemaining: z.number(),
  status: z.enum(["Expired", "Critical", "Warning", "Healthy"]),
});

export type ExpiringSubscriptionRow = z.infer<typeof expiringSubscriptionSchema>;

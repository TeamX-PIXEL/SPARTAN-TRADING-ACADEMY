import { z } from "zod";

export const recentPurchaserSchema = z.object({
  id: z.string(),
  username: z.string(),
  productName: z.string(),
  purchasedAt: z.string(),
  accessStatus: z.enum(["Approved", "Declined", "Pending"]),
  subscription: z.string(),
  expiresAt: z.string().nullable(),
});

export type RecentPurchaserRow = z.infer<typeof recentPurchaserSchema>;

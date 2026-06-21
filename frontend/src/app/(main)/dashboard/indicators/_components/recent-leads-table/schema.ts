import z from "zod";

export const indicatorSchema = z.object({
  id: z.number(),
  indicator_id: z.string(),
  pine_id: z.string().nullable().optional(),
  session_id: z.string().nullable().optional(),
  indicator_name: z.string(),
  indicator_description: z.string().nullable().optional(),
  indicator_price: z.number(),
  showcase_image: z.string().nullable().optional(),
  buyers: z.number(),
  status: z.enum(["unavailable", "paused", "running"]),
  created_at: z.string(),
  updated_at: z.string(),
});

export const purchaserSchema = z.object({
  id: z.string(),
  username: z.string(),
  productName: z.string(),
  purchasedAt: z.string(),
  accessStatus: z.enum(["Approved", "Declined"]),
  subscription: z.string(),
  expiresAt: z.string(),
});

export type IndicatorRow = z.infer<typeof indicatorSchema>;
export type PurchaserRow = z.infer<typeof purchaserSchema>;

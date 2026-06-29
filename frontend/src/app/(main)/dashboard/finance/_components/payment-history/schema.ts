import { z } from "zod";

export const paymentSchema = z.object({
  id: z.string(),
  date: z.string(),
  section: z.enum(["academy", "indicators", "bot_alerts"]),
  customer: z.string(),
  item: z.string(),
  amount: z.number(),
  status: z.enum(["completed", "pending", "refunded"]),
  method: z.enum(["Card", "Crypto", "Bank Transfer", "UPI", "Free", "Other"]),
  settlement_date: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  pincode: z.string().nullable().optional(),
  username: z.string().optional(),
});

export type Payment = z.infer<typeof paymentSchema>;

export const PAYMENT_METHODS = ["Card", "Crypto", "Bank Transfer", "UPI", "Free", "Other"] as const;

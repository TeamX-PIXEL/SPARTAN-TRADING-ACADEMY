import z from "zod";

export const indicatorUserSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  user_name: z.string(),
  email: z.string(),
  indicator_id: z.number(),
  expiry: z.string().nullable(),
  created_at: z.string(),
});

export type IndicatorUserRow = z.infer<typeof indicatorUserSchema>;

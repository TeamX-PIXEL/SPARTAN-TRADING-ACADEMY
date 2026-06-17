import z from "zod";

export const batchSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  batchId: z.string(),
  batchName: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.enum(["enrolling", "scheduled"]),
  participants: z.union([z.number(), z.string()]),
  progress: z.object({
    scheduled: z.number(),
    total: z.number(),
  }),
  rawStartDate: z.string().optional(),
  maxDays: z.number().optional(),
});

export type BatchRow = z.infer<typeof batchSchema>;
